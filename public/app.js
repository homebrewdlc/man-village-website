(function () {
  "use strict";
  const FIELDS = ["name", "phone", "fax", "email", "social", "website", "business", "category", "area", "activities", "misc"];
  const $ = (s) => document.querySelector(s);
  const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const tidy = (s) => String(s ?? "").trim().replace(/\s+/g, " ");
  const cmp = (a, b) => (a || "").localeCompare(b || "", undefined, { sensitivity: "base" });

  // ---------- local storage (edit codes, admin key) ----------
  const ls = {
    get(k, d) { try { return JSON.parse(localStorage.getItem(k)) ?? d; } catch { return d; } },
    set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} },
  };
  const codes = ls.get("mv_codes", {});
  const saveCode = (id, code) => { codes[id] = code; ls.set("mv_codes", codes); };
  const forgetCode = (id) => { delete codes[id]; ls.set("mv_codes", codes); };
  let adminKey = (() => { try { return sessionStorage.getItem("mv_admin") || ""; } catch { return ""; } })();

  // ---------- API ----------
  async function api(method, url, body, code) {
    const headers = { "Content-Type": "application/json" };
    if (adminKey) headers["X-Admin-Key"] = adminKey;
    if (code) headers["X-Edit-Code"] = code;
    const res = await fetch(url, { method, headers, body: body ? JSON.stringify(body) : undefined });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw Object.assign(new Error(data.error || "Request failed."), { status: res.status });
    return data;
  }

  // ---------- card artwork ----------
  const LOGO_ICON = `<svg viewBox="0 0 120 92" style="height:1.12em;width:auto;margin-bottom:.02em" aria-hidden="true">
    <circle cx="25" cy="34" r="11" fill="#1460D2"/><path d="M4 92V76c0-12 9-20 21-20s21 8 21 20v16Z" fill="#1460D2"/>
    <circle cx="95" cy="34" r="11" fill="#1460D2"/><path d="M74 92V76c0-12 9-20 21-20s21 8 21 20v16Z" fill="#1460D2"/>
    <path d="M24 92V72c0-16 15-27 36-27s36 11 36 27v20Z" fill="#fff"/>
    <circle cx="60" cy="20" r="18" fill="#0B2E6E"/>
    <path d="M27 92V73c0-14 13-24 33-24s33 10 33 24v19Z" fill="#1460D2"/>
    <path d="M50 49l10 13 10-13Z" fill="#fff"/><path d="M57 54h6l2 30-5 6-5-6Z" fill="#0B2E6E"/></svg>`;
  const logo = () => `<div class="logo" aria-label="Man Village Member"><div class="r1"><span class="w">Man</span>${LOGO_ICON}</div><span class="w r2">Village</span><span class="mem">MEMBER</span></div>`;
  const SWOOSH = `<svg class="swoosh" viewBox="0 0 1200 120" preserveAspectRatio="none" aria-hidden="true">
    <path d="M0 52C380 112 820 104 1200 6V120H0Z" fill="#0B3A86"/>
    <path d="M0 30C380 90 820 82 1200-14V6C820 104 380 112 0 52Z" fill="#2B80F4"/>
    <path d="M0 52C380 112 820 104 1200 6V14C820 110 380 118 0 60Z" fill="#1460D2" opacity=".6"/></svg>`;
  const ICON_PHONE = `<svg viewBox="0 0 24 24" fill="#fff"><path d="M6.6 10.8a15.1 15.1 0 0 0 6.6 6.6l2.2-2.2a1 1 0 0 1 1-.25 11.4 11.4 0 0 0 3.6.57 1 1 0 0 1 1 1V20a1 1 0 0 1-1 1A17 17 0 0 1 3 4a1 1 0 0 1 1-1h3.5a1 1 0 0 1 1 1c0 1.25.2 2.45.57 3.57a1 1 0 0 1-.25 1Z"/></svg>`;
  const ICON_FAX = `<svg viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="1.8"><rect x="7" y="3" width="10" height="6" rx="1"/><rect x="3" y="9" width="18" height="10" rx="2"/><path d="M7 13h2M11 13h2M15 13h2M7 16h2M11 16h2M15 16h2"/></svg>`;

  const val = (v, ph) => (v ? esc(v) : ph ? `<span class="ph">${esc(ph)}</span>` : "");
  const site = (v, ph) => {
    if (!v) return val(v, ph);
    const href = /^https?:\/\//i.test(v) ? v : "https://" + v;
    return /^https?:\/\/[^\s/]+\.[^\s]+/i.test(href)
      ? `<a href="${esc(href)}" target="_blank" rel="noopener nofollow" style="color:inherit">${esc(v.replace(/^https?:\/\//i, "").replace(/\/$/, ""))}</a>`
      : esc(v);
  };
  const tel = (v) => (v && /\d/.test(v) ? `<a href="tel:${esc(v.replace(/[^\d+]/g, ""))}" style="color:inherit;text-decoration:none">${esc(v)}</a>` : esc(v));
  const mail = (v) => (v && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v) ? `<a href="mailto:${esc(v)}" style="color:inherit">${esc(v)}</a>` : esc(v));

  function cardBack(m, ph) {
    return `<div class="mv"><div class="mvcard">
      <div class="mvbody">
        <div>
          ${logo()}
          <div class="fields">
            <div class="f"><span class="l">Name:</span><span class="v">${val(m.name, ph && "Your name")}</span></div>
            <div class="f"><span class="l">Phone:</span><span class="v">${m.phone ? tel(m.phone) : val("", ph && "(555) 555-0100")}</span></div>
            <div class="f"><span class="l">Emails:</span><span class="v">${m.email ? mail(m.email) : val("", ph && "you@example.com")}</span></div>
            <div class="f"><span class="l">Social media:</span><span class="v">${val(m.social, ph && "@yourhandle")}</span></div>
            <div class="f"><span class="l">Website:</span><span class="v">${site(m.website, ph && "yourbusiness.com")}</span></div>
          </div>
        </div>
        <div class="rightcol">
          <div class="stack"><span class="l">Business / Organization / Other:</span><span class="v">${val(m.business, ph && "Business name")}</span></div>
          <div class="stack"><span class="l">Business/Organization Category:</span><span class="v">${val(m.category, ph && "Occupation")}</span></div>
          <div class="stack"><span class="l">Town / Service area:</span><span class="v">${val(m.area, ph && "Where you work")}</span></div>
          <div class="stack"><span class="l">Activities / What business or organization does:</span><span class="v multi">${val(m.activities, ph && "What you do, in a sentence or two")}</span></div>
        </div>
      </div>
      <div class="f misc"><span class="l">Misc:</span><span class="v">${val(m.misc)}</span></div>
      ${SWOOSH}
    </div></div>`;
  }
  function cardFront(m) {
    return `<div class="mv"><div class="mvcard front">
      <div class="mvbody">
        <div>
          ${logo()}
          <div class="contactico">
            <div class="ci"><span class="dot">${ICON_PHONE}</span><span>${tel(m.phone)}</span></div>
            <div class="ci"><span class="dot">${ICON_FAX}</span><span>${esc(m.fax)}</span></div>
          </div>
        </div>
        <div class="frontinfo">
          <div class="biz">${esc(m.business || m.name)}</div>
          ${m.business ? `<div class="who">${esc(m.name)}</div>` : ""}
          <div class="occ">${esc(m.category)}${m.area ? " · " + esc(m.area) : ""}</div>
          ${m.website ? `<div class="who" style="font-size:max(10px,1.6cqw)">${site(m.website)}</div>` : ""}
        </div>
      </div>
      ${SWOOSH}
    </div></div>`;
  }

  // ---------- state ----------
  let members = [], loaded = false, loadError = "";
  let editingId = null, query = "", activeCat = null, activeArea = "", sortBy = "cat";
  const flipped = new Set();
  const keyOf = (m) => (sortBy === "name" ? m.name : m.category);
  const letterOf = (c) => { const ch = (c || "").trim().charAt(0).toUpperCase(); return /[A-Z]/.test(ch) ? ch : "#"; };
  const LETTERS = ["#", ..."ABCDEFGHIJKLMNOPQRSTUVWXYZ"];

  function filtered() {
    const q = query.toLowerCase().trim();
    return members
      .filter((m) => {
        if (activeCat && (m.category || "").toLowerCase() !== activeCat) return false;
        if (activeArea && (m.area || "").toLowerCase() !== activeArea) return false;
        if (!q) return true;
        return ["category", "business", "activities", "name", "area", "misc"].some((k) => (m[k] || "").toLowerCase().includes(q));
      })
      .sort((a, b) => (sortBy === "name" ? cmp(a.name, b.name) || cmp(a.category, b.category) : cmp(a.category, b.category) || cmp(a.name, b.name)));
  }

  function render() {
    const list = filtered();
    $("#count").innerHTML = `<b>${members.length}</b>${members.length === 1 ? "member" : "members"}`;

    const cats = new Map();
    members.forEach((m) => { const k = (m.category || "").toLowerCase(); if (!k) return; const e = cats.get(k) || { label: m.category, n: 0 }; e.n++; cats.set(k, e); });
    const sortedCats = [...cats.entries()].sort((a, b) => cmp(a[1].label, b[1].label));
    if (activeCat && !cats.has(activeCat)) activeCat = null;
    $("#chips").innerHTML = sortedCats.length
      ? `<button class="chip${activeCat ? "" : " on"}" data-cat="">All occupations</button>` +
        sortedCats.map(([k, e]) => `<button class="chip${activeCat === k ? " on" : ""}" data-cat="${esc(k)}">${esc(e.label)}<small>${e.n}</small></button>`).join("")
      : "";
    $("#catlist").innerHTML = sortedCats.map(([, e]) => `<option value="${esc(e.label)}"></option>`).join("");

    const areas = new Map();
    members.forEach((m) => { const k = (m.area || "").toLowerCase(); if (k && !areas.has(k)) areas.set(k, m.area); });
    const sortedAreas = [...areas.entries()].sort((a, b) => cmp(a[1], b[1]));
    if (activeArea && !areas.has(activeArea)) activeArea = "";
    $("#area").innerHTML = `<option value="">All towns</option>` + sortedAreas.map(([k, l]) => `<option value="${esc(k)}"${k === activeArea ? " selected" : ""}>${esc(l)}</option>`).join("");
    $("#arealist").innerHTML = sortedAreas.map(([, l]) => `<option value="${esc(l)}"></option>`).join("");

    const groups = new Map();
    list.forEach((m) => { const L = letterOf(keyOf(m)); if (!groups.has(L)) groups.set(L, []); groups.get(L).push(m); });
    $("#tabs").innerHTML = LETTERS.map((L) => `<button type="button" data-l="${L}" ${groups.has(L) ? "" : "disabled"} aria-label="Jump to ${L === "#" ? "other" : L}">${L}</button>`).join("");

    if (!loaded) {
      $("#list").innerHTML = loadError
        ? `<div class="empty"><h3>Couldn't load the rolodex</h3><p>${esc(loadError)}</p><button class="btn ghost" type="button" data-act="reload">Try again</button></div>`
        : `<div class="empty"><h3>Loading the rolodex…</h3></div>`;
      return;
    }
    if (!members.length) {
      $("#list").innerHTML = `<div class="empty"><h3>The rolodex is empty</h3><p>Member cards appear here, filed A to Z by occupation, as soon as someone saves one. Fill out the form to add the first card.</p><button class="btn" type="button" data-act="toform">Add the first card</button></div>`;
      return;
    }
    if (!list.length) {
      $("#list").innerHTML = `<div class="empty"><h3>No members match this search</h3><p>Try a broader word, like “repair” instead of “auto body repair”, pick “All towns”, or clear the filters.</p><button class="btn ghost" type="button" data-act="clear">Clear filters</button></div>`;
      return;
    }
    let html = "";
    for (const L of LETTERS) {
      const g = groups.get(L);
      if (!g) continue;
      const sub = sortBy === "name" ? [`${g.length} ${g.length === 1 ? "member" : "members"}`] : [...new Set(g.map((m) => m.category))];
      html += `<section class="group" id="L-${L === "#" ? "other" : L}"><div class="grouphead"><div class="letter">${L}</div><div class="cats">${esc(sub.join(" · "))}</div><div class="rule"></div></div><div class="cardgrid">`;
      for (const m of g) {
        const front = flipped.has(m.id);
        html += `<article class="entry">
          <div class="bar"><span class="cat">${esc(sortBy === "name" ? m.name : m.category)}${m.area ? ` <span style="color:var(--muted);font-weight:600">· ${esc(m.area)}</span>` : ""}</span>
            <span class="acts">
              <button class="btn ghost small" data-act="flip" data-id="${esc(m.id)}">${front ? "Show details" : "Flip to front"}</button>
              <button class="btn ghost small" data-act="edit" data-id="${esc(m.id)}">Edit</button>
            </span></div>
          ${front ? cardFront(m) : cardBack(m)}
        </article>`;
      }
      html += `</div></section>`;
    }
    $("#list").innerHTML = html;
  }

  async function load() {
    try {
      members = await api("GET", "/api/cards");
      loaded = true; loadError = "";
    } catch (e) {
      loadError = "Check your connection and try again.";
    }
    render();
  }

  // ---------- form ----------
  const form = $("#form");
  const readForm = () => { const o = {}; FIELDS.forEach((k) => (o[k] = tidy(form.elements[k].value))); return o; };
  const renderPreview = () => {
    const d = readForm();
    $("#preview").innerHTML = cardBack(d, true);
    $("#previewFront").innerHTML = cardFront({ ...d, business: d.business || (d.name ? "" : "Business name"), category: d.category || "Occupation" });
  };
  const setStatus = (t, cls) => { const s = $("#status"); s.textContent = t; s.className = "status" + (cls ? " " + cls : ""); };
  let delArmed = false, delTimer = null;
  const disarm = () => { delArmed = false; $("#delBtn").textContent = "Delete card"; $("#delBtn").classList.remove("armed"); };

  function loadIntoForm(m) {
    FIELDS.forEach((k) => (form.elements[k].value = m?.[k] || ""));
    form.elements.company_url.value = "";
    editingId = m?.id || null;
    const needsCode = !!editingId && !adminKey;
    $("#codeGroup").hidden = !needsCode;
    $("#f-code").value = editingId ? codes[editingId] || "" : "";
    $("#formTitle").textContent = editingId ? "Edit member card" : "Fill out your member card";
    $("#saveBtn").textContent = editingId ? "Save changes" : "Save to rolodex";
    $("#delBtn").hidden = !editingId;
    $("#codeBox").hidden = true;
    disarm();
    renderPreview();
  }

  form.addEventListener("input", renderPreview);
  $("#resetBtn").addEventListener("click", () => { loadIntoForm(null); setStatus(""); form.elements.name.focus(); });

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const data = { ...readForm(), company_url: form.elements.company_url.value };
    if (!data.name) { setStatus("Add a name before saving.", "err"); form.elements.name.focus(); return; }
    if (!data.category) { setStatus("Add an occupation so the card can be filed.", "err"); form.elements.category.focus(); return; }
    const code = tidy($("#f-code").value).toUpperCase();
    if (editingId && !adminKey && !code) { setStatus("Enter the edit code you got when this card was saved.", "err"); $("#f-code").focus(); return; }
    $("#saveBtn").disabled = true; setStatus("Saving…");
    try {
      if (editingId) {
        await api("PUT", `/api/cards/${encodeURIComponent(editingId)}`, data, code);
        if (code) saveCode(editingId, code);
        setStatus("Card updated.", "ok");
        await load();
        setTimeout(() => setView("home"), 900);
      } else {
        const res = await api("POST", "/api/cards", data);
        if (res.card && res.editCode) {
          saveCode(res.card.id, res.editCode);
          await load();
          loadIntoForm(res.card);
          $("#codeVal").textContent = res.editCode;
          $("#codeBox").hidden = false;
          setStatus(`Card saved and filed under ${letterOf(res.card.category)}.`, "ok");
          $("#codeBox").scrollIntoView({ block: "center" });
        }
      }
    } catch (err) {
      setStatus(err.message || "Couldn't save the card. Try again.", "err");
    } finally {
      $("#saveBtn").disabled = false;
    }
  });

  $("#delBtn").addEventListener("click", async () => {
    if (!editingId) return;
    const code = tidy($("#f-code").value).toUpperCase();
    if (!adminKey && !code) { setStatus("Enter the card's edit code to delete it.", "err"); $("#f-code").focus(); return; }
    if (!delArmed) {
      delArmed = true; $("#delBtn").textContent = "Tap again to delete"; $("#delBtn").classList.add("armed");
      clearTimeout(delTimer); delTimer = setTimeout(disarm, 4000); return;
    }
    disarm();
    try {
      await api("DELETE", `/api/cards/${encodeURIComponent(editingId)}`, null, code);
      forgetCode(editingId);
      await load(); loadIntoForm(null); setStatus("Card deleted.", "ok");
      setTimeout(() => setView("home"), 900);
    } catch (err) { setStatus(err.message || "Couldn't delete the card.", "err"); }
  });

  $("#copyCode").addEventListener("click", async () => {
    const t = $("#codeVal").textContent;
    try { await navigator.clipboard.writeText(t); $("#copyCode").textContent = "Copied"; }
    catch { const r = document.createRange(); r.selectNodeContents($("#codeVal")); const s = getSelection(); s.removeAllRanges(); s.addRange(r); }
    setTimeout(() => ($("#copyCode").textContent = "Copy"), 1500);
  });

  // ---------- views + list interactions ----------
  function setView(v) { document.body.dataset.view = v; window.scrollTo(0, 0); if (v === "home") history.replaceState(null, "", location.pathname); }
  const toForm = (m) => {
    if (m !== undefined) loadIntoForm(m);
    setStatus(""); setView("form"); history.replaceState(null, "", "#join");
    // Phones: don't pop the keyboard open on arrival, it hides the page heading
    if (!matchMedia("(pointer:coarse)").matches) setTimeout(() => form.elements.name.focus({ preventScroll: true }), 50);
  };
  $("#jumpForm").addEventListener("click", () => toForm(editingId ? null : undefined));
  $("#jumpFormM").addEventListener("click", () => toForm(editingId ? null : undefined));
  const toTop = $("#toTop");
  let topTick = false;
  window.addEventListener("scroll", () => {
    if (topTick) return; topTick = true;
    requestAnimationFrame(() => { toTop.hidden = window.scrollY < 900; topTick = false; });
  }, { passive: true });
  toTop.addEventListener("click", () => window.scrollTo({ top: 0, behavior: matchMedia("(prefers-reduced-motion:reduce)").matches ? "auto" : "smooth" }));
  $("#backBtn").addEventListener("click", () => setView("home"));
  $("#q").addEventListener("input", (e) => { query = e.target.value; render(); });
  $("#area").addEventListener("change", (e) => { activeArea = e.target.value; render(); });
  $("#sort").addEventListener("change", (e) => { sortBy = e.target.value; render(); });
  $("#chips").addEventListener("click", (e) => { const b = e.target.closest(".chip"); if (!b) return; activeCat = b.dataset.cat || null; render(); });
  $("#tabs").addEventListener("click", (e) => {
    const b = e.target.closest("button[data-l]"); if (!b || b.disabled) return;
    document.querySelectorAll("#tabs button").forEach((x) => x.classList.toggle("on", x === b));
    const el = document.getElementById("L-" + (b.dataset.l === "#" ? "other" : b.dataset.l));
    el && el.scrollIntoView({ behavior: matchMedia("(prefers-reduced-motion:reduce)").matches ? "auto" : "smooth", block: "start" });
  });
  $("#list").addEventListener("click", (e) => {
    const b = e.target.closest("button[data-act]"); if (!b) return;
    const { act, id } = b.dataset;
    if (act === "toform") return toForm(null);
    if (act === "reload") { loadError = ""; render(); return load(); }
    if (act === "clear") { query = ""; activeCat = null; activeArea = ""; $("#q").value = ""; return render(); }
    if (act === "flip") { flipped.has(id) ? flipped.delete(id) : flipped.add(id); return render(); }
    if (act === "edit") return toForm(members.find((m) => m.id === id));
  });

  // ---------- admin ----------
  function applyAdmin() {
    $("#adminToggle").hidden = !!adminKey;
    $("#adminOn").hidden = !adminKey;
    $("#adminForm").hidden = true;
    $("#formSub").textContent = adminKey
      ? "Admin mode: you can add cards for any member and edit or delete every card without an edit code."
      : "Type in the form and your card fills in as you go. Save it and it's filed in the rolodex right away.";
    if (editingId) $("#codeGroup").hidden = !!adminKey;
  }
  $("#adminToggle").addEventListener("click", () => { $("#adminForm").hidden = false; $("#adminKey").focus(); });
  const adminSignIn = async () => {
    const key = $("#adminKey").value;
    if (!key) return;
    adminKey = key;
    try {
      await api("POST", "/api/admin/verify");
      try { sessionStorage.setItem("mv_admin", key); } catch {}
      $("#adminKey").value = "";
      applyAdmin();
    } catch {
      adminKey = "";
      $("#adminKey").value = ""; $("#adminKey").placeholder = "Wrong key, try again";
    }
  };
  $("#adminGo").addEventListener("click", adminSignIn);
  $("#adminKey").addEventListener("keydown", (e) => { if (e.key === "Enter") adminSignIn(); });
  $("#adminOff").addEventListener("click", () => { adminKey = ""; try { sessionStorage.removeItem("mv_admin"); } catch {} applyAdmin(); });

  // ---------- boot ----------
  loadIntoForm(null);
  applyAdmin();
  if (location.hash === "#join") setView("form");
  render();
  load();
})();
