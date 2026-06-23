// Google OAuth + Sheets API client. Single global: window.GL_SHEETS.
(function () {
  const cfg = window.GL_CONFIG;
  const SCOPES = "https://www.googleapis.com/auth/spreadsheets openid email profile";
  const ORDER = ["American/Comfort","Asian-inspired","Italian","Mediterranean/Middle Eastern","Mexican-inspired"];

  let tokenClient = null;
  let accessToken = null;
  let userEmail = null;
  let sheetName = null; // resolved from GID at first read

  // ----- Auth -----
  function decodeJwt(jwt) {
    try {
      const b64 = jwt.split(".")[1].replace(/-/g, "+").replace(/_/g, "/");
      const pad = b64 + "===".slice((b64.length + 3) % 4);
      return JSON.parse(decodeURIComponent(escape(atob(pad))));
    } catch (e) { return null; }
  }

  function waitForGis() {
    return new Promise((resolve) => {
      if (window.google && window.google.accounts) return resolve();
      const t = setInterval(() => {
        if (window.google && window.google.accounts) { clearInterval(t); resolve(); }
      }, 60);
    });
  }

  async function signIn() {
    await waitForGis();
    // Step 1: ID token (One Tap / button) → get verified email
    const idPromise = new Promise((resolve, reject) => {
      window.google.accounts.id.initialize({
        client_id: cfg.GOOGLE_CLIENT_ID,
        callback: (resp) => {
          const claims = decodeJwt(resp.credential);
          if (!claims) return reject(new Error("Bad ID token"));
          const allowed = (cfg.ALLOWED_EMAILS || []).map(s => s.toLowerCase());
          if (!allowed.includes(String(claims.email).toLowerCase())) {
            return reject(new Error("This site is restricted. Signed in as " + claims.email + "."));
          }
          userEmail = claims.email;
          resolve();
        },
        auto_select: false,
        cancel_on_tap_outside: false,
      });
      window.google.accounts.id.renderButton(
        document.getElementById("gl-signin-btn"),
        { theme: "outline", size: "large", text: "signin_with", shape: "rectangular", width: 260 }
      );
      window.google.accounts.id.prompt();
    });
    await idPromise;

    // Step 2: access token for Sheets API
    await new Promise((resolve, reject) => {
      tokenClient = window.google.accounts.oauth2.initTokenClient({
        client_id: cfg.GOOGLE_CLIENT_ID,
        scope: SCOPES,
        hint: userEmail,
        callback: (resp) => {
          if (resp.error) return reject(new Error(resp.error));
          accessToken = resp.access_token;
          // refresh ~5min before expiry
          const expSec = resp.expires_in || 3600;
          setTimeout(refreshToken, Math.max(60, expSec - 300) * 1000);
          resolve();
        },
      });
      tokenClient.requestAccessToken({ prompt: "consent" });
    });
  }

  function refreshToken() {
    if (!tokenClient) return;
    tokenClient.callback = (resp) => {
      if (resp.access_token) {
        accessToken = resp.access_token;
        const expSec = resp.expires_in || 3600;
        setTimeout(refreshToken, Math.max(60, expSec - 300) * 1000);
      }
    };
    tokenClient.requestAccessToken({ prompt: "" });
  }

  function getEmail() { return userEmail; }

  // ----- Sheets API -----
  async function sapi(path, opts) {
    opts = opts || {};
    const r = await fetch("https://sheets.googleapis.com/v4/spreadsheets/" + cfg.SPREADSHEET_ID + path, {
      ...opts,
      headers: { "Authorization": "Bearer " + accessToken, "Content-Type": "application/json", ...(opts.headers || {}) },
    });
    if (!r.ok) {
      const t = await r.text();
      throw new Error("Sheets API " + r.status + ": " + t);
    }
    return r.json();
  }

  async function ensureSheetName() {
    if (sheetName) return sheetName;
    const meta = await sapi("?fields=sheets(properties(sheetId,title))");
    const s = meta.sheets.find(s => s.properties.sheetId === cfg.SHEET_GID);
    if (!s) throw new Error("Sheet with gid " + cfg.SHEET_GID + " not found");
    sheetName = s.properties.title;
    return sheetName;
  }

  function escapeRange(name) {
    // Sheet names with non-word chars need single-quote wrapping; quotes inside escaped by doubling
    if (/^[A-Za-z0-9_]+$/.test(name)) return name;
    return "'" + name.replace(/'/g, "''") + "'";
  }

  function parseCookedCell(v) {
    if (v == null) return 0;
    const s = String(v).trim();
    if (!s || s === "—" || s === "-") return 0;
    const n = parseInt(s, 10);
    return isNaN(n) ? 0 : n;
  }

  function rowToRecipe(row, rowNumber) {
    const cuisine = (row[0] || "").trim();
    const name = (row[1] || "").trim();
    const cooked = parseCookedCell(row[2]);
    const linkRaw = (row[3] || "").trim();
    const type = (row[4] || "").trim();
    const url = /^https?:\/\//i.test(linkRaw) ? linkRaw : null;
    return {
      rowNumber, // 1-indexed in the sheet (row 1 = header, so data rows start at 2)
      name,
      cuisine,
      cooked,
      url,
      searchOnly: !url && type.toLowerCase() === "recommended",
      type: type || "History",
      linkLabel: !url && linkRaw ? linkRaw : null,
    };
  }

  async function listRecipes() {
    const name = await ensureSheetName();
    const range = escapeRange(name) + "!A1:E10000";
    const j = await sapi("/values/" + encodeURIComponent(range));
    const values = j.values || [];
    const recipes = [];
    for (let i = 1; i < values.length; i++) {
      const row = values[i];
      if (!row || (!row[0] && !row[1])) continue;
      recipes.push(rowToRecipe(row, i + 1));
    }
    return recipes;
  }

  function recipeToRow(r) {
    const cookedCell = r.cooked > 0 ? r.cooked : "—";
    const linkCell = r.url ? r.url : (r.linkLabel || "");
    const typeCell = r.type || (r.cooked > 0 ? "History" : (r.url ? "History" : "Recommended"));
    return [r.cuisine, r.name, cookedCell, linkCell, typeCell];
  }

  async function appendRecipe(r) {
    const name = await ensureSheetName();
    const range = escapeRange(name) + "!A:E";
    return sapi("/values/" + encodeURIComponent(range) +
      ":append?valueInputOption=USER_ENTERED&insertDataOption=INSERT_ROWS", {
      method: "POST",
      body: JSON.stringify({ values: [recipeToRow(r)] }),
    });
  }

  async function updateRecipe(rowNumber, r) {
    const name = await ensureSheetName();
    const range = escapeRange(name) + "!A" + rowNumber + ":E" + rowNumber;
    return sapi("/values/" + encodeURIComponent(range) + "?valueInputOption=USER_ENTERED", {
      method: "PUT",
      body: JSON.stringify({ values: [recipeToRow(r)] }),
    });
  }

  async function deleteRecipe(rowNumber) {
    // batchUpdate uses 0-indexed row positions
    await ensureSheetName();
    return sapi(":batchUpdate", {
      method: "POST",
      body: JSON.stringify({
        requests: [{
          deleteDimension: {
            range: {
              sheetId: cfg.SHEET_GID,
              dimension: "ROWS",
              startIndex: rowNumber - 1,
              endIndex: rowNumber,
            }
          }
        }]
      }),
    });
  }

  async function incrementCooked(rowNumber, currentCooked, currentRecipe) {
    const next = { ...currentRecipe, cooked: currentCooked + 1, type: "History" };
    return updateRecipe(rowNumber, next);
  }

  window.GL_SHEETS = {
    ORDER,
    signIn,
    getEmail,
    listRecipes,
    appendRecipe,
    updateRecipe,
    deleteRecipe,
    incrementCooked,
  };
})();
