// Google OAuth + Sheets API client. Single global: window.GL_SHEETS.
(function () {
  const cfg = window.GL_CONFIG;
  const SCOPES = "https://www.googleapis.com/auth/spreadsheets openid email profile";
  const STORE_KEY = "gl.auth.v1";

  let tokenClient = null;
  let accessToken = null;
  let userEmail = null;
  let sheetName = null; // resolved from GID at first read
  let onAuthLost = null; // app-registered callback: session expired, show sign-in

  // ----- Auth -----
  function waitForGis() {
    return new Promise((resolve) => {
      if (window.google && window.google.accounts) return resolve();
      const t = setInterval(() => {
        if (window.google && window.google.accounts) { clearInterval(t); resolve(); }
      }, 60);
    });
  }

  function ensureTokenClient() {
    if (!tokenClient) {
      tokenClient = window.google.accounts.oauth2.initTokenClient({
        client_id: cfg.GOOGLE_CLIENT_ID,
        scope: SCOPES,
        callback: () => {},
      });
    }
    return tokenClient;
  }

  // One in-flight token request at a time; GIS delivers via the mutable callback.
  function requestToken(promptMode) {
    return new Promise((resolve, reject) => {
      const tc = ensureTokenClient();
      tc.callback = (resp) => resp && resp.access_token ? resolve(resp) : reject(new Error((resp && resp.error) || "Token request failed"));
      tc.error_callback = (err) => reject(new Error((err && err.type) || "Popup closed"));
      try { tc.requestAccessToken({ prompt: promptMode, hint: userEmail || undefined }); }
      catch (ex) { reject(ex); }
    });
  }

  function persist(resp) {
    accessToken = resp.access_token;
    const exp = Date.now() + ((resp.expires_in || 3600) * 1000);
    try { sessionStorage.setItem(STORE_KEY, JSON.stringify({ t: accessToken, e: exp, u: userEmail })); } catch (ex) {}
  }

  function clearAuth() {
    accessToken = null;
    try { sessionStorage.removeItem(STORE_KEY); } catch (ex) {}
  }

  function authLost() {
    clearAuth();
    if (onAuthLost) onAuthLost();
  }

  // Returns true if a still-valid token was restored from this browser session.
  function restore() {
    try {
      const raw = sessionStorage.getItem(STORE_KEY);
      if (!raw) return false;
      const s = JSON.parse(raw);
      if (!s.t || !s.u || Date.now() > s.e - 60000) return false;
      accessToken = s.t;
      userEmail = s.u;
      return true;
    } catch (ex) { return false; }
  }

  async function signIn() {
    await waitForGis();
    const resp = await requestToken("select_account");
    accessToken = resp.access_token;
    const r = await fetch("https://www.googleapis.com/oauth2/v3/userinfo", {
      headers: { Authorization: "Bearer " + accessToken },
    });
    const info = await r.json();
    const allowed = (cfg.ALLOWED_EMAILS || []).map(s => s.toLowerCase());
    if (!allowed.includes(String(info.email).toLowerCase())) {
      clearAuth();
      throw new Error("This site is restricted. Signed in as " + info.email + ".");
    }
    userEmail = info.email;
    persist(resp);
  }

  function getEmail() { return userEmail; }

  // ----- Sheets API -----
  async function sapi(path, opts, retried) {
    opts = opts || {};
    const r = await fetch("https://sheets.googleapis.com/v4/spreadsheets/" + cfg.SPREADSHEET_ID + path, {
      ...opts,
      headers: { "Authorization": "Bearer " + accessToken, "Content-Type": "application/json", ...(opts.headers || {}) },
    });
    if (r.status === 401 && !retried) {
      // Token expired: try a silent refresh once, then replay the request.
      try {
        await waitForGis();
        const resp = await requestToken("");
        persist(resp);
        return sapi(path, opts, true);
      } catch (ex) {
        authLost();
        throw new Error("Session expired — please sign in again.");
      }
    }
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

  // Guard against stale row numbers: rows shift when someone else deletes or
  // inserts. Before any write we confirm the target row still holds the same
  // recipe name; if not, throw with .stale=true so the UI can refresh.
  async function assertRowName(rowNumber, expectedName) {
    const name = await ensureSheetName();
    const j = await sapi("/values/" + encodeURIComponent(escapeRange(name) + "!B" + rowNumber));
    const cell = (((j.values || [])[0] || [])[0] || "");
    if (cell.trim().toLowerCase() !== String(expectedName).trim().toLowerCase()) {
      const err = new Error("The sheet changed since this page loaded.");
      err.stale = true;
      throw err;
    }
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

  async function updateRecipe(rowNumber, expectedName, r) {
    await assertRowName(rowNumber, expectedName);
    const name = await ensureSheetName();
    const range = escapeRange(name) + "!A" + rowNumber + ":E" + rowNumber;
    return sapi("/values/" + encodeURIComponent(range) + "?valueInputOption=USER_ENTERED", {
      method: "PUT",
      body: JSON.stringify({ values: [recipeToRow(r)] }),
    });
  }

  async function deleteRecipe(rowNumber, expectedName) {
    await assertRowName(rowNumber, expectedName);
    // batchUpdate uses 0-indexed row positions
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
    return updateRecipe(rowNumber, currentRecipe.name, next);
  }

  window.GL_SHEETS = {
    signIn,
    restore,
    getEmail,
    setOnAuthLost: (fn) => { onAuthLost = fn; },
    listRecipes,
    appendRecipe,
    updateRecipe,
    deleteRecipe,
    incrementCooked,
  };
})();
