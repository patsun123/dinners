// GourmetLog — React (UMD, no JSX) UI driven by Google Sheets backend.
(function () {
  const e = React.createElement;
  const { useState, useEffect, useMemo, useCallback, useRef } = React;

  const ORDER = ["American/Comfort","Asian-inspired","Italian","Mediterranean/Middle Eastern","Mexican-inspired"];
  const META = {
    "Asian-inspired":               { color:"#C0392B", soft:"#F8E7E2" },
    "Italian":                      { color:"#4F7B3B", soft:"#EAF0E1" },
    "American/Comfort":             { color:"#B0741B", soft:"#F6ECD6" },
    "Mediterranean/Middle Eastern": { color:"#2C7A8C", soft:"#E0EEF0" },
    "Mexican-inspired":             { color:"#CF5A28", soft:"#FAE8DD" },
  };

  // ---------- Style helpers ----------
  const pillStyle = (cuisine) => {
    const m = META[cuisine] || { color: "var(--muted)", soft: "var(--surface-warm)" };
    return {
      display: "inline-flex", alignItems: "center",
      font: "600 0.61rem var(--font-sans)",
      textTransform: "uppercase", letterSpacing: "0.08em",
      color: m.color, background: m.soft, border: "1px solid " + m.color + "30",
      borderRadius: "var(--radius-pill)", padding: "5px 11px", whiteSpace: "nowrap",
    };
  };
  const cookedStyle = (k) => {
    const on = k > 0;
    return {
      alignSelf: "flex-start", display: "inline-flex", alignItems: "center", gap: "7px",
      font: "600 0.76rem var(--font-sans)",
      color: on ? "var(--positive)" : "var(--muted)",
      background: on ? "var(--positive-soft)" : "var(--surface-warm)",
      border: "1px solid " + (on ? "#CDE4D2" : "var(--line-strong)"),
      borderRadius: "var(--radius-pill)", padding: "6px 12px", whiteSpace: "nowrap",
    };
  };
  const ghostBtn = {
    font: "600 0.86rem var(--font-sans)", color: "var(--ink-soft)",
    background: "var(--surface-soft)", border: "1px solid var(--line-strong)",
    borderRadius: "var(--radius-md)", padding: "11px 18px", cursor: "pointer",
  };
  const inputStyle = {
    width: "100%", background: "var(--surface-soft)", border: "1px solid var(--line-strong)",
    borderRadius: "var(--radius-md)", padding: "11px 13px", color: "var(--ink)",
    font: "400 0.92rem var(--font-sans)", outline: "none",
  };

  // ---------- SVGs ----------
  const svgPlus = e("svg", { width: 16, height: 16, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 2.2, strokeLinecap: "round" },
    e("path", { d: "M12 5v14M5 12h14" }));
  const svgDice = e("svg", { width: 15, height: 15, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 1.8, strokeLinecap: "round", strokeLinejoin: "round" },
    e("rect", { x: 3, y: 3, width: 18, height: 18, rx: 4 }),
    e("circle", { cx: 8.5, cy: 8.5, r: 1.2, fill: "currentColor" }),
    e("circle", { cx: 15.5, cy: 15.5, r: 1.2, fill: "currentColor" }),
    e("circle", { cx: 15.5, cy: 8.5, r: 1.2, fill: "currentColor" }),
    e("circle", { cx: 8.5, cy: 15.5, r: 1.2, fill: "currentColor" }));
  const svgSearch = e("svg", { width: 16, height: 16, viewBox: "0 0 24 24", fill: "none", stroke: "var(--muted)", strokeWidth: 1.8, strokeLinecap: "round" },
    e("circle", { cx: 11, cy: 11, r: 7 }),
    e("path", { d: "m20 20-3.2-3.2" }));
  const svgEdit = e("svg", { width: 14, height: 14, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 1.6, strokeLinecap: "round", strokeLinejoin: "round" },
    e("path", { d: "M12 20h9" }),
    e("path", { d: "M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" }));
  const svgTrash = e("svg", { width: 14, height: 14, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 1.6, strokeLinecap: "round", strokeLinejoin: "round" },
    e("path", { d: "M3 6h18" }),
    e("path", { d: "M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" }),
    e("path", { d: "M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" }));
  const svgCalPlus = e("svg", { width: 14, height: 14, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 1.6, strokeLinecap: "round", strokeLinejoin: "round" },
    e("rect", { x: 3, y: 4, width: 18, height: 17, rx: 2 }),
    e("path", { d: "M16 2v4M8 2v4M3 10h18M12 13.5v5M9.5 16h5" }));
  const svgUtensils = e("svg", { width: 24, height: 24, viewBox: "0 0 24 24", fill: "none", stroke: "#fff", strokeWidth: 1.7, strokeLinecap: "round", strokeLinejoin: "round" },
    e("path", { d: "M3 2v7c0 1.1.9 2 2 2a2 2 0 0 0 2-2V2" }),
    e("path", { d: "M5 2v20" }),
    e("path", { d: "M21 15V2a5 5 0 0 0-3 4.5V13a2 2 0 0 0 2 2h1Z" }),
    e("path", { d: "M19 15v7" }));

  // ---------- Sign-in screen ----------
  function SignIn({ onSignedIn }) {
    const [err, setErr] = useState(null);
    const [busy, setBusy] = useState(false);
    const click = async () => {
      setErr(null); setBusy(true);
      try { await GL_SHEETS.signIn(); onSignedIn(); }
      catch (ex) { setErr(ex.message || String(ex)); setBusy(false); }
    };
    // Google SVG logo
    const gLogo = e("svg", { width: 18, height: 18, viewBox: "0 0 18 18" },
      e("path", { fill: "#4285F4", d: "M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844a4.14 4.14 0 0 1-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615Z" }),
      e("path", { fill: "#34A853", d: "M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18Z" }),
      e("path", { fill: "#FBBC05", d: "M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332Z" }),
      e("path", { fill: "#EA4335", d: "M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 6.29C4.672 4.163 6.656 3.58 9 3.58Z" }));
    return e("div", { style: { position: "relative", zIndex: 1, minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: "40px 20px" } },
      e("div", { style: { background: "var(--surface)", border: "1px solid var(--line)", borderRadius: "var(--radius-xl)", boxShadow: "var(--shadow-card)", padding: "36px 34px", width: "min(440px, 100%)", textAlign: "center" } },
        e("div", { style: { width: 64, height: 64, borderRadius: 18, background: "linear-gradient(150deg, #E9633F, var(--accent-deep))", boxShadow: "0 10px 22px rgba(189,63,31,0.30)", display: "inline-flex", alignItems: "center", justifyContent: "center", marginBottom: 18 } },
          e("svg", { width: 30, height: 30, viewBox: "0 0 24 24", fill: "none", stroke: "#fff", strokeWidth: 1.7, strokeLinecap: "round", strokeLinejoin: "round" },
            e("path", { d: "M3 2v7c0 1.1.9 2 2 2a2 2 0 0 0 2-2V2" }),
            e("path", { d: "M5 2v20" }),
            e("path", { d: "M21 15V2a5 5 0 0 0-3 4.5V13a2 2 0 0 0 2 2h1Z" }),
            e("path", { d: "M19 15v7" }))),
        e("div", { style: { font: "700 1.55rem var(--font-display)", letterSpacing: "-0.01em", marginBottom: 6 } }, "GourmetLog"),
        e("div", { style: { font: "400 0.92rem var(--font-sans)", color: "var(--muted)", marginBottom: 28 } }, "Sign in with Google to open the ledger."),
        e("button", { onClick: click, disabled: busy, style: { display: "inline-flex", alignItems: "center", gap: 10, font: "600 0.94rem var(--font-sans)", color: "#3c4043", background: "#fff", border: "1px solid #dadce0", borderRadius: 8, padding: "11px 22px", cursor: busy ? "wait" : "pointer", boxShadow: "0 1px 3px rgba(0,0,0,0.08)", transition: "140ms ease", opacity: busy ? 0.7 : 1 } },
          gLogo, busy ? "Opening Google…" : "Sign in with Google"),
        err ? e("div", { style: { marginTop: 18, font: "400 0.88rem var(--font-sans)", color: "#C0392B", background: "#FBE8E2", border: "1px solid #F1C9BB", borderRadius: 12, padding: "10px 12px", textAlign: "left" } }, err) : null));
  }

  // ---------- Main app ----------
  function App() {
    // Restore a still-valid token from this browser session (skips the popup on reload)
    const [signedIn, setSignedIn] = useState(() => window.GL_SHEETS.restore());
    const [recipes, setRecipes] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [search, setSearch] = useState("");
    const [cuisine, setCuisine] = useState("All");
    const [status, setStatus] = useState("All types");
    const [sort, setSort] = useState("Most cooked");
    const [view, setView] = useState("grid");
    const [spinRow, setSpinRow] = useState(null);
    const [spinning, setSpinning] = useState(false);
    const [copiedRow, setCopiedRow] = useState(null);
    const [modal, setModal] = useState(null); // 'add'|'edit'|'delete'
    const [editRow, setEditRow] = useState(null);
    const [editName, setEditName] = useState(""); // name at time of open, for stale-row check
    const [delRow, setDelRow] = useState(null);
    const [delName, setDelName] = useState("");
    const [form, setForm] = useState({ name: "", cuisine: "Asian-inspired", url: "", cooked: "0" });
    const [pendingRow, setPendingRow] = useState(null); // row currently being mutated
    const [week, setWeek] = useState([]); // upcoming Meal Planning events
    const [weekErr, setWeekErr] = useState(null);
    const [planName, setPlanName] = useState("");
    const [planDate, setPlanDate] = useState("");
    const [planBusy, setPlanBusy] = useState(false);

    const refresh = useCallback(async () => {
      setLoading(true); setError(null);
      try { setRecipes(await GL_SHEETS.listRecipes()); }
      catch (ex) { setError(ex.message || String(ex)); }
      finally { setLoading(false); }
    }, []);

    const loadWeek = useCallback(async () => {
      try { setWeek(await GL_SHEETS.listWeekMeals()); setWeekErr(null); }
      catch (ex) { setWeekErr(ex.message || String(ex)); }
    }, []);

    useEffect(() => { if (signedIn) { refresh(); loadWeek(); } }, [signedIn, refresh, loadWeek]);

    // If token refresh fails mid-session, drop back to the sign-in screen
    useEffect(() => {
      window.GL_SHEETS.setOnAuthLost(() => setSignedIn(false));
    }, []);

    // Escape closes any open modal
    useEffect(() => {
      if (!modal) return;
      const onKey = (ev) => { if (ev.key === "Escape") setModal(null); };
      window.addEventListener("keydown", onKey);
      return () => window.removeEventListener("keydown", onKey);
    }, [modal]);

    // Shared handler for write failures: stale row → reload the ledger
    const handleMutErr = async (ex) => {
      if (ex.stale) {
        setError("The sheet changed since this page loaded — refreshed it for you. Please retry.");
        await refresh();
      } else {
        setError(ex.message || String(ex));
      }
    };

    // Derived
    const filtered = useMemo(() => {
      const q = search.trim().toLowerCase();
      return recipes.filter(r => {
        if (cuisine !== "All" && r.cuisine !== cuisine) return false;
        if (status === "Cooked" && r.cooked <= 0) return false;
        if (status === "Not yet cooked" && r.cooked > 0) return false;
        if (status === "Has recipe link" && !r.url) return false;
        if (q && !(r.name.toLowerCase().includes(q) || r.cuisine.toLowerCase().includes(q))) return false;
        return true;
      });
    }, [recipes, search, cuisine, status]);
    const sorted = useMemo(() => {
      const a = filtered.slice();
      if (sort === "Most cooked")     a.sort((x,y)=> y.cooked - x.cooked || x.name.localeCompare(y.name));
      else if (sort === "Least cooked") a.sort((x,y)=> x.cooked - y.cooked || x.name.localeCompare(y.name));
      else if (sort === "Name A–Z")    a.sort((x,y)=> x.name.localeCompare(y.name));
      else if (sort === "Name Z–A")    a.sort((x,y)=> y.name.localeCompare(x.name));
      else if (sort === "Recently added") a.sort((x,y)=> y.rowNumber - x.rowNumber);
      return a;
    }, [filtered, sort]);
    const total = recipes.length;
    const timesCooked = useMemo(() => recipes.reduce((a,r)=>a+r.cooked, 0), [recipes]);
    const toTry = useMemo(() => recipes.filter(r => r.cooked === 0).length, [recipes]);
    const { coverage, topCuisine } = useMemo(() => {
      const counts = {}; ORDER.forEach(c => counts[c] = 0);
      recipes.forEach(r => { if (counts[r.cuisine] != null) counts[r.cuisine] += 1; });
      const maxCount = Math.max(1, ...Object.values(counts));
      let top = "--", topN = -1;
      ORDER.forEach(c => { if (counts[c] > topN) { topN = counts[c]; top = c; } });
      const cov = ORDER.map(c => {
        const n = counts[c] || 0;
        const pct = total ? Math.round(n / total * 100) : 0;
        return {
          label: c, readout: n + " (" + pct + "%)",
          barStyle: { height: "100%", borderRadius: "var(--radius-pill)", width: (n / maxCount * 100) + "%", background: META[c].color },
        };
      });
      return { coverage: cov, topCuisine: total ? top : "--" };
    }, [recipes, total]);

    // Mutations
    const cook = async (r) => {
      setPendingRow(r.rowNumber);
      // optimistic
      setRecipes(recipes.map(x => x.rowNumber === r.rowNumber ? { ...x, cooked: x.cooked + 1, type: "History" } : x));
      try { await GL_SHEETS.incrementCooked(r.rowNumber, r.cooked, r); }
      catch (ex) { await handleMutErr(ex); if (!ex.stale) await refresh(); }
      finally { setPendingRow(null); }
    };
    const openLink = (r) => {
      if (r.url) { window.open(r.url, "_blank", "noopener"); return; }
      if (r.searchOnly || r.linkLabel) {
        const q = (r.name || "") + " recipe";
        try { navigator.clipboard.writeText(q); } catch (ex) {}
        setCopiedRow(r.rowNumber);
        setTimeout(() => setCopiedRow(c => c === r.rowNumber ? null : c), 1300);
      }
    };
    const roll = () => {
      if (!sorted.length) { setSpinRow(null); setSpinning(false); return; }
      setSpinning(true);
      setTimeout(() => {
        const pool = sorted; // re-evaluate on tick
        const pick = pool[Math.floor(Math.random() * pool.length)];
        setSpinRow(pick.rowNumber);
        setSpinning(false);
      }, 650);
    };
    const openAdd = () => { setForm({ name: "", cuisine: "Asian-inspired", url: "", cooked: "0" }); setModal("add"); };
    const openAddPrefill = (name) => { setForm({ name, cuisine: "Asian-inspired", url: "", cooked: "0" }); setModal("add"); };
    const todayStr = () => {
      const t = new Date();
      return t.getFullYear() + "-" + String(t.getMonth() + 1).padStart(2, "0") + "-" + String(t.getDate()).padStart(2, "0");
    };
    const openPlan = (name) => { setPlanName(name); setPlanDate(todayStr()); setModal("plan"); };
    const savePlan = async () => {
      if (!planDate) return;
      setPlanBusy(true);
      try { await GL_SHEETS.planMeal(planName, planDate); setModal(null); await loadWeek(); }
      catch (ex) { setError(ex.message || String(ex)); }
      finally { setPlanBusy(false); }
    };

    // Fuzzy-match a calendar event title to a ledger recipe
    const norm = (s) => String(s).toLowerCase().replace(/[^a-z0-9 ]+/g, " ").replace(/\s+/g, " ").trim();
    const matchRecipe = (title) => {
      const t = norm(title);
      if (!t) return null;
      let m = recipes.find(r => norm(r.name) === t);
      if (m) return m;
      m = recipes.find(r => norm(r.name).includes(t) || t.includes(norm(r.name)));
      if (m) return m;
      const tt = t.split(" ").filter(w => w.length > 2);
      return recipes.find(r => {
        const rt = norm(r.name).split(" ").filter(w => w.length > 2);
        const overlap = rt.filter(w => tt.includes(w)).length;
        const shorter = Math.min(rt.length, tt.length);
        return shorter > 0 && overlap >= 2 && overlap >= shorter - 1;
      }) || null;
    };
    const openEdit = (r) => { setEditRow(r.rowNumber); setEditName(r.name); setForm({ name: r.name, cuisine: r.cuisine, url: r.url || (r.linkLabel || ""), cooked: String(r.cooked) }); setModal("edit"); };
    const openDelete = (r) => { setDelRow(r.rowNumber); setDelName(r.name); setModal("delete"); };
    const closeModal = () => setModal(null);
    const setF = (k, v) => setForm(f => ({ ...f, [k]: v }));

    const saveForm = async () => {
      const name = form.name.trim();
      if (!name) return;
      const cooked = Math.max(0, parseInt(form.cooked, 10) || 0);
      const linkRaw = form.url.trim();
      const url = /^https?:\/\//i.test(linkRaw) ? linkRaw : null;
      const linkLabel = !url && linkRaw ? linkRaw : null;
      const type = cooked > 0 ? "History" : (url ? "History" : "Recommended");
      const record = { name, cuisine: form.cuisine, cooked, url, linkLabel, type, searchOnly: !url && type === "Recommended" };
      try {
        if (modal === "add") await GL_SHEETS.appendRecipe(record);
        else if (modal === "edit") await GL_SHEETS.updateRecipe(editRow, editName, record);
        setModal(null);
        await refresh();
      } catch (ex) { if (ex.stale) setModal(null); await handleMutErr(ex); }
    };
    const confirmDelete = async () => {
      try { await GL_SHEETS.deleteRecipe(delRow, delName); setModal(null); await refresh(); }
      catch (ex) { if (ex.stale) setModal(null); await handleMutErr(ex); }
    };

    if (!signedIn) return e(SignIn, { onSignedIn: () => setSignedIn(true) });

    // ---------- Recipe card ----------
    const linkInfo = (r) => {
      if (r.url) return { text: "Recipe ↗", interactive: true, style: { font: "600 0.76rem var(--font-sans)", color: "var(--accent-deep)", background: "transparent", border: "none", cursor: "pointer", padding: "4px 2px", whiteSpace: "nowrap" } };
      if (r.searchOnly || r.linkLabel) return { text: copiedRow === r.rowNumber ? "Copied" : "Copy search", interactive: true,
        style: { font: "600 0.76rem var(--font-sans)", color: copiedRow === r.rowNumber ? "var(--positive)" : "var(--muted)", background: "transparent", border: "none", cursor: "pointer", padding: "4px 2px", whiteSpace: "nowrap" } };
      return { text: "No recipe link", interactive: false, style: { font: "400 0.76rem var(--font-sans)", color: "var(--muted)", background: "transparent", border: "none", padding: "4px 2px", opacity: 0.75, whiteSpace: "nowrap", cursor: "default" } };
    };

    const renderRecipeCard = (r) => {
      const li = linkInfo(r);
      return e("div", { key: r.rowNumber, className: "gl-card-hover", style: { display: "flex", flexDirection: "column", gap: "12px", background: "var(--surface)", border: "1px solid var(--line)", borderRadius: "var(--radius-lg)", boxShadow: "var(--shadow-soft)", padding: "17px", transition: "140ms ease" } },
        e("div", { style: { display: "flex", alignItems: "center", justifyContent: "space-between", gap: "10px" } },
          e("span", { style: pillStyle(r.cuisine) }, r.cuisine),
          e("div", { style: { display: "flex", gap: "6px" } },
            e("button", { className: "gl-icon-btn", title: "Plan this dinner", onClick: () => openPlan(r.name), style: { width: 28, height: 28, display: "flex", alignItems: "center", justifyContent: "center", background: "transparent", border: "1px solid var(--line)", borderRadius: 8, color: "var(--muted)", cursor: "pointer", transition: "140ms ease", padding: 0 } }, svgCalPlus),
            e("button", { className: "gl-icon-btn", title: "Edit", onClick: () => openEdit(r), style: { width: 28, height: 28, display: "flex", alignItems: "center", justifyContent: "center", background: "transparent", border: "1px solid var(--line)", borderRadius: 8, color: "var(--muted)", cursor: "pointer", transition: "140ms ease", padding: 0 } }, svgEdit),
            e("button", { className: "gl-icon-btn-del", title: "Delete", onClick: () => openDelete(r), style: { width: 28, height: 28, display: "flex", alignItems: "center", justifyContent: "center", background: "transparent", border: "1px solid var(--line)", borderRadius: 8, color: "var(--muted)", cursor: "pointer", transition: "140ms ease", padding: 0 } }, svgTrash))),
        e("span", { style: { font: "600 1.18rem/1.22 var(--font-display)", letterSpacing: "-0.005em", minHeight: "2.7em", display: "flex", alignItems: "flex-start" } }, r.name),
        e("span", { style: cookedStyle(r.cooked) }, r.cooked > 0 ? ("Cooked " + r.cooked + "×") : "Not yet cooked"),
        e("div", { style: { height: 1, background: "var(--line)", marginTop: "auto" } }),
        e("div", { style: { display: "flex", alignItems: "center", justifyContent: "space-between", gap: "10px" } },
          e("button", { className: "gl-cook-btn", disabled: pendingRow === r.rowNumber, onClick: () => cook(r), style: { display: "inline-flex", alignItems: "center", gap: "6px", font: "600 0.8rem var(--font-sans)", color: "var(--accent-deep)", background: "var(--accent-soft)", border: "1px solid #F1C9BB", borderRadius: "var(--radius-md)", padding: "8px 13px", cursor: pendingRow === r.rowNumber ? "wait" : "pointer", transition: "140ms ease", opacity: pendingRow === r.rowNumber ? 0.6 : 1 } }, "+ Cooked it"),
          e("button", { onClick: li.interactive ? () => openLink(r) : undefined, style: li.style, disabled: !li.interactive }, li.text)));
    };

    const renderRecipeRow = (r) => {
      const li = linkInfo(r);
      return e("div", { key: r.rowNumber, className: "gl-row-hover", style: { display: "flex", alignItems: "center", gap: "14px", flexWrap: "wrap", background: "var(--surface)", border: "1px solid var(--line)", borderRadius: "var(--radius-md)", boxShadow: "var(--shadow-soft)", padding: "13px 16px", transition: "140ms ease" } },
        e("span", { style: pillStyle(r.cuisine) }, r.cuisine),
        e("span", { style: { flex: "1 1 160px", font: "600 1.08rem var(--font-display)", letterSpacing: "-0.005em" } }, r.name),
        e("span", { style: cookedStyle(r.cooked) }, r.cooked > 0 ? ("Cooked " + r.cooked + "×") : "Not yet cooked"),
        e("button", { className: "gl-cook-btn", disabled: pendingRow === r.rowNumber, onClick: () => cook(r), style: { display: "inline-flex", alignItems: "center", gap: "6px", font: "600 0.78rem var(--font-sans)", color: "var(--accent-deep)", background: "var(--accent-soft)", border: "1px solid #F1C9BB", borderRadius: "var(--radius-md)", padding: "7px 12px", cursor: pendingRow === r.rowNumber ? "wait" : "pointer", transition: "140ms ease", whiteSpace: "nowrap", opacity: pendingRow === r.rowNumber ? 0.6 : 1 } }, "+ Cooked it"),
        e("button", { onClick: li.interactive ? () => openLink(r) : undefined, style: li.style, disabled: !li.interactive }, li.text),
        e("div", { style: { display: "flex", gap: 6 } },
          e("button", { className: "gl-icon-btn", title: "Plan this dinner", onClick: () => openPlan(r.name), style: { width: 28, height: 28, display: "flex", alignItems: "center", justifyContent: "center", background: "transparent", border: "1px solid var(--line)", borderRadius: 8, color: "var(--muted)", cursor: "pointer", padding: 0, transition: "140ms ease" } }, svgCalPlus),
          e("button", { className: "gl-icon-btn", title: "Edit", onClick: () => openEdit(r), style: { width: 28, height: 28, display: "flex", alignItems: "center", justifyContent: "center", background: "transparent", border: "1px solid var(--line)", borderRadius: 8, color: "var(--muted)", cursor: "pointer", padding: 0, transition: "140ms ease" } }, svgEdit),
          e("button", { className: "gl-icon-btn-del", title: "Delete", onClick: () => openDelete(r), style: { width: 28, height: 28, display: "flex", alignItems: "center", justifyContent: "center", background: "transparent", border: "1px solid var(--line)", borderRadius: 8, color: "var(--muted)", cursor: "pointer", padding: 0, transition: "140ms ease" } }, svgTrash)));
    };

    // ---------- Spinner body ----------
    let spinnerBody;
    const spun = spinRow ? recipes.find(r => r.rowNumber === spinRow) : null;
    if (spinning) {
      spinnerBody = e("div", { style: { display: "flex", flexDirection: "column", alignItems: "center", gap: "14px" } },
        e("div", { style: { width: 34, height: 34, borderRadius: 9, border: "3px solid var(--surface-warm)", borderTopColor: "var(--accent)", animation: "gl-spin 0.6s linear infinite" } }),
        e("span", { style: { font: "600 0.74rem var(--font-sans)", textTransform: "uppercase", letterSpacing: "0.1em", color: "var(--muted)" } }, "Picking"));
    } else if (spun) {
      const li = linkInfo(spun);
      spinnerBody = e("div", { key: spun.rowNumber, style: { width: "100%", display: "flex", flexDirection: "column", gap: 12, animation: "gl-fade 240ms ease" } },
        e("div", { style: { display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" } },
          e("span", { style: pillStyle(spun.cuisine) }, spun.cuisine),
          e("span", { style: { font: "600 0.62rem var(--font-sans)", textTransform: "uppercase", letterSpacing: "0.1em", color: "var(--accent-deep)" } }, "Tonight's pick")),
        e("span", { style: { font: "600 1.7rem/1.12 var(--font-display)", letterSpacing: "-0.01em" } }, spun.name),
        e("div", { style: { display: "flex", alignItems: "center", gap: 12, marginTop: 2, flexWrap: "wrap" } },
          e("span", { style: cookedStyle(spun.cooked) }, spun.cooked > 0 ? ("Cooked " + spun.cooked + "×") : "Not yet cooked"),
          e("button", { className: "gl-cook-btn", disabled: pendingRow === spun.rowNumber, onClick: () => cook(spun), style: { font: "600 0.78rem var(--font-sans)", color: "var(--accent-deep)", background: "var(--accent-soft)", border: "1px solid #F1C9BB", borderRadius: "var(--radius-md)", padding: "8px 13px", cursor: pendingRow === spun.rowNumber ? "wait" : "pointer", opacity: pendingRow === spun.rowNumber ? 0.6 : 1 } }, "+ Cooked it"),
          e("button", { onClick: () => openPlan(spun.name), style: { display: "inline-flex", alignItems: "center", gap: 6, font: "600 0.78rem var(--font-sans)", color: "var(--ink-soft)", background: "var(--surface)", border: "1px solid var(--line-strong)", borderRadius: "var(--radius-md)", padding: "8px 13px", cursor: "pointer" } }, svgCalPlus, "Plan it"),
          li.interactive ? e("button", { onClick: () => openLink(spun), style: { ...li.style, padding: "4px 2px" } }, li.text) : null));
    } else {
      spinnerBody = e("span", { style: { font: "400 0.92rem var(--font-sans)", color: "var(--muted)", textAlign: "center" } }, "Roll the dice to get a recipe idea from your active filters.");
    }

    // ---------- Modal body ----------
    let modalBody = null;
    if (modal === "plan") {
      modalBody = e(React.Fragment, null,
        e("div", { style: { font: "700 1.35rem var(--font-display)", letterSpacing: "-0.01em", marginBottom: 8 } }, "Plan a dinner"),
        e("div", { style: { font: "400 0.94rem/1.5 var(--font-sans)", color: "var(--ink-soft)", marginBottom: 18 } }, "Add “" + planName + "” to the Meal Planning calendar."),
        e("div", { style: { display: "flex", flexDirection: "column", gap: 7, marginBottom: 22 } },
          e("span", { style: { font: "600 0.64rem var(--font-sans)", textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--muted)" } }, "Date"),
          e("input", { type: "date", value: planDate, min: todayStr(), autoFocus: true, onChange: ev => setPlanDate(ev.target.value), style: inputStyle })),
        e("div", { style: { display: "flex", gap: 10, justifyContent: "flex-end" } },
          e("button", { onClick: closeModal, style: ghostBtn }, "Cancel"),
          e("button", { onClick: savePlan, disabled: planBusy, style: { font: "600 0.86rem var(--font-sans)", color: "#fff", background: "var(--accent)", border: "none", borderRadius: "var(--radius-md)", padding: "11px 18px", cursor: planBusy ? "wait" : "pointer", boxShadow: "0 6px 14px rgba(224,83,47,0.22)", opacity: planBusy ? 0.7 : 1 } }, planBusy ? "Adding…" : "Add to calendar")));
    } else if (modal === "delete") {
      modalBody = e(React.Fragment, null,
        e("div", { style: { font: "700 1.35rem var(--font-display)", letterSpacing: "-0.01em", marginBottom: 8 } }, "Remove recipe"),
        e("div", { style: { font: "400 0.94rem/1.5 var(--font-sans)", color: "var(--ink-soft)", marginBottom: 22 } }, "Delete “" + delName + "” from your ledger. This cannot be undone."),
        e("div", { style: { display: "flex", gap: 10, justifyContent: "flex-end" } },
          e("button", { onClick: closeModal, style: ghostBtn }, "Cancel"),
          e("button", { onClick: confirmDelete, style: { font: "600 0.86rem var(--font-sans)", color: "#fff", background: "#C0392B", border: "none", borderRadius: "var(--radius-md)", padding: "11px 18px", cursor: "pointer" } }, "Delete")));
    } else if (modal === "add" || modal === "edit") {
      const field = (label, ctrl) => e("div", { style: { display: "flex", flexDirection: "column", gap: 7, marginBottom: 16 } },
        e("span", { style: { font: "600 0.64rem var(--font-sans)", textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--muted)" } }, label),
        ctrl);
      modalBody = e(React.Fragment, null,
        e("div", { style: { font: "700 1.35rem var(--font-display)", letterSpacing: "-0.01em", marginBottom: 20 } }, modal === "add" ? "Add new recipe" : "Edit recipe"),
        field("Name", e("input", { value: form.name, autoFocus: true, onChange: ev => setF("name", ev.target.value), placeholder: "Recipe name", style: inputStyle })),
        field("Cuisine", e("select", { value: form.cuisine, onChange: ev => setF("cuisine", ev.target.value), style: inputStyle },
          ORDER.map(c => e("option", { key: c, value: c }, c)))),
        field("Recipe link (optional)", e("input", { value: form.url, onChange: ev => setF("url", ev.target.value), placeholder: "https://…", style: inputStyle })),
        field("Times cooked", e("input", { type: "number", min: "0", value: form.cooked, onChange: ev => setF("cooked", ev.target.value), style: inputStyle })),
        e("div", { style: { display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 6 } },
          e("button", { onClick: closeModal, style: ghostBtn }, "Cancel"),
          e("button", { onClick: saveForm, style: { font: "600 0.86rem var(--font-sans)", color: "#fff", background: "var(--accent)", border: "none", borderRadius: "var(--radius-md)", padding: "11px 18px", cursor: "pointer", boxShadow: "0 6px 14px rgba(224,83,47,0.22)" } }, modal === "add" ? "Add to ledger" : "Save changes")));
    }

    // ---------- View buttons ----------
    const viewBtn = (on, label, onClick) => e("button", { onClick, style: { font: "600 0.74rem var(--font-sans)", padding: "7px 14px", borderRadius: 9, cursor: "pointer", border: "none", transition: "140ms ease", color: on ? "#fff" : "var(--muted)", background: on ? "var(--accent)" : "transparent" } }, label);

    // ---------- Cuisine pills ----------
    const pills = ["All", ...ORDER].map(label => {
      const active = cuisine === label;
      const base = { font: "600 0.76rem var(--font-sans)", borderRadius: "var(--radius-pill)", padding: "8px 15px", cursor: "pointer", transition: "140ms ease", whiteSpace: "nowrap" };
      const style = active
        ? { ...base, color: "#fff", background: "var(--accent)", border: "1px solid var(--accent)", boxShadow: "0 4px 10px rgba(224,83,47,0.22)" }
        : { ...base, color: "var(--ink-soft)", background: "var(--surface-soft)", border: "1px solid var(--line-strong)" };
      return e("button", { key: label, onClick: () => setCuisine(label), style }, label);
    });

    // ---------- Metric card ----------
    const metric = (label, val, caption, valColor) =>
      e("div", { style: { minHeight: 118, display: "flex", flexDirection: "column", justifyContent: "space-between", gap: 8, background: "var(--surface)", border: "1px solid var(--line)", borderRadius: "var(--radius-lg)", boxShadow: "var(--shadow-soft)", padding: "18px 19px" } },
        e("span", { style: { font: "600 0.65rem var(--font-sans)", textTransform: "uppercase", letterSpacing: "0.1em", color: "var(--muted)" } }, label),
        e("span", { style: { font: label === "Top cuisine" ? "600 clamp(1.3rem, 3.6vw, 1.8rem)/1.05 var(--font-display)" : "600 clamp(2rem, 6vw, 2.65rem)/1 var(--font-display)", fontVariantNumeric: "tabular-nums", letterSpacing: label === "Top cuisine" ? "-0.01em" : "normal", color: valColor || "inherit" } }, val),
        e("span", { style: { font: "400 0.8rem var(--font-sans)", color: "var(--muted)" } }, caption));

    return e("div", { style: { position: "relative", zIndex: 1, minHeight: "100vh", width: "min(1220px, calc(100vw - 28px))", margin: "0 auto", padding: "20px 0 80px", color: "var(--ink)" } },
      // Header
      e("div", { style: { display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, flexWrap: "wrap", padding: "6px 0 24px" } },
        e("div", { style: { display: "flex", alignItems: "center", gap: 14, minWidth: 0 } },
          e("div", { style: { width: 50, height: 50, borderRadius: 15, background: "linear-gradient(150deg, #E9633F, var(--accent-deep))", boxShadow: "0 8px 20px rgba(189,63,31,0.30)", display: "flex", alignItems: "center", justifyContent: "center", flex: "none" } }, svgUtensils),
          e("div", { style: { display: "flex", flexDirection: "column", gap: 5, minWidth: 0 } },
            e("div", { style: { display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" } },
              e("span", { style: { font: "700 clamp(1.5rem, 5vw, 1.85rem)/1 var(--font-display)", letterSpacing: "-0.01em" } }, "GourmetLog"),
              e("span", { style: { font: "600 0.64rem var(--font-sans)", textTransform: "uppercase", letterSpacing: "0.13em", color: "var(--accent-deep)", padding: "5px 10px", borderRadius: "var(--radius-pill)", background: "var(--accent-soft)", whiteSpace: "nowrap" } }, "Kitchen companion")),
            e("span", { style: { font: "400 0.9rem var(--font-sans)", color: "var(--muted)" } }, "Your recipe ledger and meal-metrics hub."))),
        e("button", { className: "gl-accent-btn", onClick: openAdd, style: { display: "inline-flex", alignItems: "center", gap: 8, font: "600 0.92rem var(--font-sans)", color: "#fff", background: "var(--accent)", border: "none", borderRadius: "var(--radius-md)", padding: "12px 19px", cursor: "pointer", boxShadow: "0 8px 18px rgba(224,83,47,0.26)", transition: "140ms ease" } },
          svgPlus, "Add new recipe")),

      // Error banner
      error ? e("div", { style: { marginBottom: 14, display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12, font: "400 0.88rem var(--font-sans)", color: "#8B2515", background: "#FBE8E2", border: "1px solid #F1C9BB", borderRadius: 12, padding: "10px 14px" } },
        e("span", null, error),
        e("button", { onClick: () => setError(null), title: "Dismiss", style: { flex: "none", background: "transparent", border: "none", color: "#8B2515", font: "700 1rem var(--font-sans)", cursor: "pointer", padding: "0 2px", lineHeight: 1 } }, "✕")) : null,

      // Loading banner (on initial load)
      loading && !recipes.length ? e("div", { style: { marginBottom: 14, font: "400 0.88rem var(--font-sans)", color: "var(--muted)", background: "var(--surface)", border: "1px solid var(--line)", borderRadius: 12, padding: "10px 14px" } }, "Loading your ledger…") : null,

      // Metrics
      e("div", { style: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 13, marginBottom: 20 } },
        metric("Total recipes", total, "In your personal ledger"),
        metric("Times cooked", timesCooked, "Accumulated cook history", "var(--accent)"),
        metric("To try", toTry, "Awaiting a first cook"),
        metric("Top cuisine", topCuisine, "Most frequent category")),

      // This week (Meal Planning calendar)
      e("div", { style: { background: "var(--surface)", border: "1px solid var(--line)", borderRadius: "var(--radius-xl)", boxShadow: "var(--shadow-card)", overflow: "hidden", marginBottom: 20 } },
        e("div", { style: { display: "flex", flexDirection: "column", gap: 3, padding: "20px 20px 0" } },
          e("span", { style: { font: "600 1.18rem var(--font-display)", letterSpacing: "-0.01em" } }, "This week"),
          e("span", { style: { font: "400 0.85rem var(--font-sans)", color: "var(--muted)" } }, "From your Meal Planning calendar.")),
        e("div", { style: { padding: "16px 20px 20px" } },
          weekErr
            ? e("div", { style: { font: "400 0.88rem var(--font-sans)", color: "var(--muted)" } }, "Couldn't load the calendar: " + weekErr)
            : week.length === 0
              ? e("div", { style: { font: "400 0.92rem var(--font-sans)", color: "var(--muted)" } }, "Nothing planned yet this week — roll the dice and plan something.")
              : e("div", { style: { display: "flex", gap: 12, flexWrap: "wrap" } },
                  week.map(ev => {
                    const isToday = ev.date === todayStr();
                    const m = matchRecipe(ev.title);
                    const d = new Date(ev.date + "T00:00:00");
                    const dayLabel = isToday ? "Tonight" : d.toLocaleDateString(undefined, { weekday: "short", month: "numeric", day: "numeric" });
                    const li = m ? linkInfo(m) : null;
                    return e("div", { key: ev.id, style: { flex: "1 1 200px", minWidth: 200, display: "flex", flexDirection: "column", gap: 9, background: isToday ? "var(--accent-soft)" : "var(--surface-soft)", border: "1px solid " + (isToday ? "#F1C9BB" : "var(--line)"), borderRadius: "var(--radius-lg)", padding: "14px 15px" } },
                      e("span", { style: { font: "600 0.62rem var(--font-sans)", textTransform: "uppercase", letterSpacing: "0.1em", color: isToday ? "var(--accent-deep)" : "var(--muted)" } }, dayLabel),
                      e("span", { style: { font: "600 1.05rem/1.2 var(--font-display)", letterSpacing: "-0.005em" } }, ev.title),
                      m
                        ? e("div", { style: { display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" } },
                            e("span", { style: pillStyle(m.cuisine) }, m.cuisine),
                            e("button", { className: "gl-cook-btn", disabled: pendingRow === m.rowNumber, onClick: () => cook(m), style: { font: "600 0.74rem var(--font-sans)", color: "var(--accent-deep)", background: "var(--surface)", border: "1px solid #F1C9BB", borderRadius: "var(--radius-md)", padding: "6px 10px", cursor: pendingRow === m.rowNumber ? "wait" : "pointer", transition: "140ms ease", whiteSpace: "nowrap", opacity: pendingRow === m.rowNumber ? 0.6 : 1 } }, "+ Cooked it"),
                            li && li.interactive ? e("button", { onClick: () => openLink(m), style: li.style }, li.text) : null)
                        : e("div", { style: { display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" } },
                            e("span", { style: { font: "400 0.76rem var(--font-sans)", color: "var(--muted)" } }, "Not in ledger"),
                            e("button", { onClick: () => openAddPrefill(ev.title), style: { font: "600 0.76rem var(--font-sans)", color: "var(--accent-deep)", background: "transparent", border: "none", cursor: "pointer", padding: "2px 0", whiteSpace: "nowrap" } }, "Add to ledger")));
                  })))),

      // Spinner + Coverage
      e("div", { style: { display: "flex", gap: 18, flexWrap: "wrap", marginBottom: 20 } },
        e("div", { style: { flex: "1.35 1 340px", background: "var(--surface)", border: "1px solid var(--line)", borderRadius: "var(--radius-xl)", boxShadow: "var(--shadow-card)", overflow: "hidden" } },
          e("div", { style: { display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 14, flexWrap: "wrap", padding: "20px 20px 0" } },
            e("div", { style: { display: "flex", flexDirection: "column", gap: 3 } },
              e("span", { style: { font: "600 1.18rem var(--font-display)", letterSpacing: "-0.01em" } }, "Indecisive? Dinner spinner"),
              e("span", { style: { font: "400 0.85rem var(--font-sans)", color: "var(--muted)" } }, "Picks a random recipe from your active filters.")),
            e("button", { className: "gl-accent-btn", onClick: roll, style: { display: "inline-flex", alignItems: "center", gap: 8, font: "600 0.85rem var(--font-sans)", color: "#fff", background: "var(--accent)", border: "none", borderRadius: "var(--radius-md)", padding: "10px 16px", cursor: "pointer", boxShadow: "0 6px 14px rgba(224,83,47,0.24)", transition: "140ms ease", whiteSpace: "nowrap" } },
              svgDice, "Roll the dice")),
          e("div", { style: { padding: "16px 20px 20px" } },
            e("div", { style: { border: "1.5px dashed var(--line-strong)", borderRadius: "var(--radius-lg)", minHeight: 150, display: "flex", alignItems: "center", justifyContent: "center", padding: 20, background: "var(--surface-soft)" } }, spinnerBody))),
        e("div", { style: { flex: "1 1 300px", background: "var(--surface)", border: "1px solid var(--line)", borderRadius: "var(--radius-xl)", boxShadow: "var(--shadow-card)", overflow: "hidden" } },
          e("div", { style: { display: "flex", flexDirection: "column", gap: 3, padding: "20px 20px 0" } },
            e("span", { style: { font: "600 1.18rem var(--font-display)", letterSpacing: "-0.01em" } }, "Cuisine coverage"),
            e("span", { style: { font: "400 0.85rem var(--font-sans)", color: "var(--muted)" } }, "Distribution across your recipe categories.")),
          e("div", { style: { display: "flex", flexDirection: "column", gap: 14, padding: "18px 20px 20px" } },
            coverage.map((row, i) => e("div", { key: i, style: { display: "flex", flexDirection: "column", gap: 7 } },
              e("div", { style: { display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 10 } },
                e("span", { style: { font: "500 0.88rem var(--font-sans)", color: "var(--ink)" } }, row.label),
                e("span", { style: { font: "600 0.82rem var(--font-sans)", color: "var(--ink-soft)", fontVariantNumeric: "tabular-nums" } }, row.readout)),
              e("div", { style: { height: 8, borderRadius: "var(--radius-pill)", background: "var(--surface-warm)", overflow: "hidden" } },
                e("div", { style: row.barStyle }))))))),

      // Controls
      e("div", { style: { background: "var(--surface)", border: "1px solid var(--line)", borderRadius: "var(--radius-xl)", boxShadow: "var(--shadow-soft)", padding: "16px 18px", marginBottom: 16 } },
        e("div", { style: { display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" } },
          e("div", { style: { flex: "1 1 250px", display: "flex", alignItems: "center", gap: 10, background: "var(--surface-soft)", border: "1px solid var(--line)", borderRadius: "var(--radius-md)", padding: "11px 14px" } },
            svgSearch,
            e("input", { value: search, onChange: ev => setSearch(ev.target.value), placeholder: "Search recipe name or category…", style: { flex: 1, minWidth: 0, background: "transparent", border: "none", outline: "none", color: "var(--ink)", font: "400 0.92rem var(--font-sans)" } })),
          e("div", { style: { display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" } },
            e("div", { style: { display: "flex", alignItems: "center", gap: 7, background: "var(--surface-soft)", border: "1px solid var(--line)", borderRadius: "var(--radius-md)", padding: "8px 12px" } },
              e("span", { style: { font: "600 0.6rem var(--font-sans)", textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--muted)" } }, "Status"),
              e("select", { value: status, onChange: ev => setStatus(ev.target.value), style: { background: "transparent", border: "none", outline: "none", color: "var(--ink)", font: "600 0.83rem var(--font-sans)", cursor: "pointer" } },
                ["All types","Cooked","Not yet cooked","Has recipe link"].map(o => e("option", { key: o, value: o }, o)))),
            e("div", { style: { display: "flex", alignItems: "center", gap: 7, background: "var(--surface-soft)", border: "1px solid var(--line)", borderRadius: "var(--radius-md)", padding: "8px 12px" } },
              e("span", { style: { font: "600 0.6rem var(--font-sans)", textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--muted)" } }, "Sort"),
              e("select", { value: sort, onChange: ev => setSort(ev.target.value), style: { background: "transparent", border: "none", outline: "none", color: "var(--ink)", font: "600 0.83rem var(--font-sans)", cursor: "pointer" } },
                ["Most cooked","Least cooked","Name A–Z","Name Z–A","Recently added"].map(o => e("option", { key: o, value: o }, o)))),
            e("div", { style: { display: "flex", gap: 4, background: "var(--surface-soft)", border: "1px solid var(--line)", borderRadius: "var(--radius-md)", padding: 4 } },
              viewBtn(view === "grid", "Grid", () => setView("grid")),
              viewBtn(view === "list", "List", () => setView("list"))))),
        e("div", { style: { display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginTop: 14 } },
          e("span", { style: { font: "600 0.6rem var(--font-sans)", textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--muted)", marginRight: 2 } }, "Cuisines"),
          pills)),

      // Result count
      e("div", { style: { display: "flex", alignItems: "baseline", gap: 7, padding: "2px 4px 14px" } },
        e("span", { style: { font: "400 0.88rem var(--font-sans)", color: "var(--muted)" } }, "Showing"),
        e("span", { style: { font: "700 0.9rem var(--font-sans)", color: "var(--ink)", fontVariantNumeric: "tabular-nums" } }, sorted.length),
        e("span", { style: { font: "400 0.88rem var(--font-sans)", color: "var(--muted)" } }, "of " + total + " recipes")),

      // Grid/List
      sorted.length === 0
        ? e("div", { style: { textAlign: "center", padding: "56px 20px", color: "var(--muted)", font: "400 0.96rem var(--font-sans)" } }, "No recipes match these filters. Clear them or add a new entry.")
        : view === "grid"
          ? e("div", { style: { display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(246px, 1fr))", gap: 15 } }, sorted.map(renderRecipeCard))
          : e("div", { style: { display: "flex", flexDirection: "column", gap: 10 } }, sorted.map(renderRecipeRow)),

      // Modal
      modal ? e("div", { onClick: closeModal, style: { position: "fixed", inset: 0, zIndex: 50, background: "rgba(40,28,16,0.40)", backdropFilter: "blur(3px)", display: "flex", alignItems: "center", justifyContent: "center", padding: 20, animation: "gl-fade 160ms ease" } },
        e("div", { onClick: ev => ev.stopPropagation(), style: { width: "min(460px, 100%)", background: "var(--surface)", border: "1px solid var(--line)", borderRadius: "var(--radius-xl)", boxShadow: "0 30px 70px rgba(50,30,10,0.28)", padding: 26, maxHeight: "90vh", overflow: "auto" } }, modalBody)) : null);
  }

  // Wait for DOM ready (script is at end of body so root exists, but be safe)
  const mount = () => {
    if (!window.GL_CONFIG || window.GL_CONFIG.GOOGLE_CLIENT_ID.indexOf("PASTE_YOUR") === 0) {
      document.getElementById("root").innerHTML =
        '<div style="position:relative;z-index:1;max-width:560px;margin:80px auto;background:#fff;border:1px solid var(--line);border-radius:22px;padding:30px;font-family:var(--font-sans);color:var(--ink)">' +
        '<h1 style="font-family:var(--font-display);font-weight:700;font-size:1.5rem;margin:0 0 10px;">Setup needed</h1>' +
        '<p style="color:var(--muted);font-size:0.92rem;line-height:1.55;">Edit <code>config.js</code> and paste your Google OAuth Client ID. Create one at <a href="https://console.cloud.google.com/apis/credentials" target="_blank" rel="noopener" style="color:var(--accent-deep)">Google Cloud Console → APIs &amp; Credentials → OAuth 2.0 Client ID (Web application)</a>. Add <code>https://dinners.thesunfam.net</code> and your local dev origin to the Authorized JavaScript origins.</p>' +
        '</div>';
      return;
    }
    const root = ReactDOM.createRoot(document.getElementById("root"));
    root.render(e(App));
  };
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", mount);
  else mount();
})();
