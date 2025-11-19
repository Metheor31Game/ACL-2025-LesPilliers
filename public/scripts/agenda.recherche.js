// public/scripts/agenda.recherche.js
// Recherche dynamique des RDV par titre — affichage sous la barre, coloré par agenda

(function () {
  // utilitaire debounce
  function debounce(fn, ms = 200) {
    let t;
    return (...args) => {
      clearTimeout(t);
      t = setTimeout(() => fn(...args), ms);
    };
  }

  // crée la barre de recherche si elle n'existe pas
  function ensureSearchUI() {
    const headerRight = document.getElementById("accountArea");
    if (!headerRight) return null;
    if (document.getElementById("rdvSearchWrap"))
      return document.getElementById("rdvSearchWrap");

    const wrap = document.createElement("div");
    wrap.id = "rdvSearchWrap";
    wrap.style.position = "relative";
    wrap.className = "mr-3";

    const input = document.createElement("input");
    input.id = "rdvSearchInput";
    input.type = "search";
    input.placeholder = "Rechercher un RDV...";
    input.className = "input";
    input.style.minWidth = "220px";
    input.style.padding = "8px 12px";
    input.style.borderRadius = "999px";
    input.style.border = "1px solid rgba(15,23,42,0.06)";
    input.style.boxShadow = "0 2px 8px rgba(2,6,23,0.04)";
    input.style.transition = "box-shadow .18s, transform .12s";
    input.autocomplete = "off";

    const results = document.createElement("div");
    results.id = "rdvSearchResults";
    results.style.position = "absolute";
    results.style.top = "calc(100% + 8px)";
    results.style.right = "0";
    results.style.zIndex = 60;
    results.style.minWidth = "280px";
    results.style.maxWidth = "420px";
    results.style.maxHeight = "360px";
    results.style.overflow = "auto";
    results.style.background = "rgba(255,255,255,0.98)";
    results.style.boxShadow = "0 10px 30px rgba(2,6,23,0.12)";
    results.style.borderRadius = "14px";
    results.style.padding = "8px";
    results.className = "card";
    // use flex column so gap works consistently between items
    results.style.display = "flex";
    results.style.flexDirection = "column";
    results.style.gap = "10px";
    results.style.boxSizing = "border-box";
    results.style.display = "none";

    wrap.appendChild(input);
    wrap.appendChild(results);

    // insert before accountName so it's next to "Mon Compte"
    const accountName = document.getElementById("accountName");
    if (accountName && accountName.parentNode) {
      accountName.parentNode.insertBefore(wrap, accountName);
    } else {
      headerRight.insertBefore(wrap, headerRight.firstChild);
    }

    return wrap;
  }

  // format a result element
  function makeResultEl(rdv, agenda) {
    const el = document.createElement("div");
    el.className = "rdv-search-item p-2 mb-2 rounded shadow-sm";
    el.style.cursor = "pointer";
    el.style.display = "flex";
    el.style.alignItems = "center";
    el.style.gap = "12px";
    el.style.borderRadius = "10px";
    el.style.transition =
      "transform .12s ease, box-shadow .12s ease, opacity .12s";
    el.style.boxShadow = "0 2px 10px rgba(2,6,23,0.06)";
    // ensure small vertical spacing if gap isn't applied (fallback)
    el.style.margin = "6px 0";

    const idx = agendas.findIndex((a) => a._id === agenda._id);
    const color =
      typeof idx === "number" && idx >= 0
        ? colors[idx % colors.length]
        : "#3b82f6";

    // determine readable text color (black or white) based on background
    function textForBg(hex) {
      if (!hex) return "#fff";
      const h = hex.replace("#", "");
      const bigint = parseInt(
        h.length === 3
          ? h
              .split("")
              .map((c) => c + c)
              .join("")
          : h,
        16
      );
      const r = (bigint >> 16) & 255;
      const g = (bigint >> 8) & 255;
      const b = bigint & 255;
      const yiq = (r * 299 + g * 587 + b * 114) / 1000;
      return yiq >= 128 ? "#0f172a" : "#ffffff";
    }

    const textColor = textForBg(color);
    el.style.background = color;
    el.style.color = textColor;
    el.style.padding = "12px";

    const content = document.createElement("div");
    content.style.flex = "1";

    const title = document.createElement("div");
    title.textContent = rdv.titre || "(sans titre)";
    title.style.fontWeight = "600";
    title.style.fontSize = "0.95rem";
    title.style.color = textColor;

    const meta = document.createElement("div");
    meta.style.fontSize = "0.85rem";
    meta.style.color =
      textColor === "#ffffff" ? "rgba(255,255,255,0.9)" : "rgba(15,23,42,0.8)";
    try {
      const start = new Date(
        rdv.startTime || rdv.date || rdv.dateTime || Date.now()
      );
      const end = rdv.endTime
        ? new Date(rdv.endTime)
        : new Date(start.getTime() + 60 * 60 * 1000);
      meta.textContent = `${agenda.nom} — ${timeStr(start)}${
        rdv.recurrence === "weekly" ? " (perm.)" : ""
      }`;
    } catch (e) {
      meta.textContent = agenda.nom;
    }

    content.appendChild(title);
    content.appendChild(meta);

    el.appendChild(content);

    // hover / interaction for smoother feel
    el.addEventListener("mouseenter", () => {
      el.style.transform = "translateY(-3px)";
      el.style.boxShadow = "0 8px 28px rgba(2,6,23,0.12)";
    });
    el.addEventListener("mouseleave", () => {
      el.style.transform = "translateY(0)";
      el.style.boxShadow = "0 2px 10px rgba(2,6,23,0.06)";
    });

    // click: open edition modal + focus
    el.addEventListener("click", (ev) => {
      ev.stopPropagation();
      if (window.ouvrirEditionRdv) window.ouvrirEditionRdv(agenda, rdv);
      const results = document.getElementById("rdvSearchResults");
      if (results) results.style.display = "none";
    });

    return el;
  }

  // perform search and render results
  function performSearch(q) {
    const wrap = document.getElementById("rdvSearchWrap");
    if (!wrap) return;
    const results = document.getElementById("rdvSearchResults");
    const input = document.getElementById("rdvSearchInput");
    if (!results || !input) return;
    const term = (q || input.value || "").trim().toLowerCase();
    results.innerHTML = "";
    if (!term) {
      results.style.display = "none";
      return;
    }

    const matches = [];
    for (const agenda of agendas || []) {
      for (const rdv of agenda.rdvs || []) {
        if ((rdv.titre || "").toLowerCase().includes(term)) {
          matches.push({ rdv, agenda });
        }
      }
    }

    if (matches.length === 0) {
      const empty = document.createElement("div");
      empty.textContent = "Aucun RDV trouvé";
      empty.style.padding = "6px 8px";
      empty.style.color = "#64748b";
      results.appendChild(empty);
      results.style.display = "block";
      return;
    }

    // show up to 12 results
    for (let i = 0; i < Math.min(matches.length, 12); i++) {
      const { rdv, agenda } = matches[i];
      results.appendChild(makeResultEl(rdv, agenda));
    }
    results.style.display = "block";
  }

  // initialize
  function init() {
    const wrap = ensureSearchUI();
    if (!wrap) return;
    const input = document.getElementById("rdvSearchInput");
    input.addEventListener(
      "input",
      debounce(() => performSearch(), 180)
    );

    // hide results when clicking elsewhere
    document.addEventListener("click", (e) => {
      const results = document.getElementById("rdvSearchResults");
      if (!results) return;
      if (
        e.target &&
        (e.target.id === "rdvSearchInput" || results.contains(e.target))
      )
        return;
      results.style.display = "none";
    });
  }

  // wait for global `agendas` to be available; try now and also after DOMContentLoaded
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
