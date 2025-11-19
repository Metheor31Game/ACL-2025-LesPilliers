// public/scripts/agenda.js
// public/scripts/agenda.js

// palette de couleurs (automatique)
const colors = [
  "#3b82f6",
  "#10b981",
  "#f59e0b",
  "#ef4444",
  "#8b5cf6",
  "#06b6d4",
  "#84cc16",
];

let agendas = []; // tableaux d'agendas côté client
let visibleAgendas = {}; // map agendaId -> bool visible
let currentWeekStart = getMonday(new Date());
window.currentAgendaId = null; // agenda utilisé pour import/export

// notifications rapides (compatible avec usages existants)
function showNotif(text, type = "info", ms = 2200) {
  const n = document.getElementById("notif");
  if (!n) return console.log(text);
  n.textContent = text;
  n.className = ""; // reset
  n.classList.add(
    "fixed",
    "top-4",
    "left-1/2",
    "-translate-x-1/2",
    "px-4",
    "py-2",
    "rounded",
    "shadow",
    "text-white",
    "text-sm"
  );
  if (type === "ok") n.style.background = "#10b981";
  else if (type === "err" || type === "error") n.style.background = "#ef4444";
  else n.style.background = "#3b82f6";
  n.classList.remove("hidden");
  setTimeout(() => n.classList.add("hidden"), ms);
}

// ---- utilitaires date ----
function getMonday(d) {
  d = new Date(d);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  return new Date(d.setDate(diff));
}
function formatDayHeader(d) {
  return d.toLocaleDateString("fr-FR", {
    weekday: "short",
    day: "numeric",
    month: "short",
  });
}
function timeStr(d) {
  return new Date(d).toLocaleTimeString("fr-FR", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

// ---- chargement / affichage ----
async function chargerAgendas() {
  console.log("[agenda] chargerAgendas() start");
  try {
    const res = await fetch("/api/agenda", { credentials: "include" });
    if (res.status === 401) return (window.location.href = "connexion.html");
    if (!res.ok) throw new Error("Erreur chargement agendas");
    agendas = await res.json();

    // si aucun agenda, on en crée un "defaut"
    if (!agendas || agendas.length === 0) {
      await creerAgenda("defaut");
      return chargerAgendas();
    }

    // mettre un agenda courant pour import/export
    window.currentAgendaId = window.currentAgendaId || agendas[0]._id;

    // initialiser visibleAgendas si besoin
    agendas.forEach((a) => {
      if (visibleAgendas[a._id] === undefined) visibleAgendas[a._id] = true;
    });

    populateSelect();
    afficherLegende();
    renderAgendaSemaine();
  } catch (err) {
    console.error(err);
    showNotif("Impossible de charger les agendas", "err");
  }
}

// remplir la select utilisée pour choisir l'agenda lors de création de RDV
function populateSelect() {
  const sel = document.getElementById("selectAgenda");
  if (!sel) return;
  sel.innerHTML = "";
  agendas.forEach((a, i) => {
    const opt = document.createElement("option");
    opt.value = a._id;
    opt.textContent = a.nom;
    sel.appendChild(opt);
  });
}

// légende (couleurs, toggle visibilité, edit, delete)
function afficherLegende() {
  const leg =
    document.getElementById("sidebarAgendaList") ||
    document.getElementById("legende");
  if (!leg) return;
  leg.innerHTML = "";
  agendas.forEach((a, i) => {
    const color = colors[i % colors.length];
    const wrapper = document.createElement("div");
    wrapper.className = "flex items-center gap-2";

    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.checked = visibleAgendas[a._id] !== false;
    checkbox.onchange = () => {
      visibleAgendas[a._id] = checkbox.checked;
      renderAgendaSemaine();
      const pickerCb = document.querySelector(
        `#agendaPickerList input[value='${a._id}']`
      );
      if (pickerCb) pickerCb.checked = checkbox.checked;
    };

    const swatch = document.createElement("span");
    swatch.style.background = color;
    swatch.className = "w-4 h-4 rounded-full inline-block";

    const label = document.createElement("span");
    label.className = "font-medium ml-1 mr-2";
    label.textContent = a.nom;

    const editBtn = document.createElement("button");
    editBtn.className = "text-xs text-blue-600 ml-2";
    editBtn.textContent = "✎";
    editBtn.title = "Renommer";
    editBtn.onclick = () => renommerAgendaPrompt(a);

    const delBtn = document.createElement("button");
    delBtn.className = "text-xs text-red-600 ml-1";
    delBtn.textContent = "🗑";
    delBtn.title = "Supprimer";
    delBtn.onclick = () => supprimerAgendaConfirm(a);

    wrapper.appendChild(checkbox);
    wrapper.appendChild(swatch);
    wrapper.appendChild(label);
    wrapper.appendChild(editBtn);
    wrapper.appendChild(delBtn);

    // clicking the label sets currentAgendaId for import/export
    label.onclick = () => {
      window.currentAgendaId = a._id;
    };

    leg.appendChild(wrapper);
  });
}

// RDV rendering moved to `agenda.rdv.js` to keep this file concise.
// `renderAgendaSemaine` is now defined in `public/scripts/agenda.rdv.js`.

// ---- actions agenda ----
async function creerAgenda(nom) {
  if (creerAgenda._inFlight) return;
  creerAgenda._inFlight = true;
  // disable sidebar add button to avoid double submissions
  const sidebarBtn = document.getElementById("sidebarBtnAddAgenda");
  if (sidebarBtn) sidebarBtn.disabled = true;
  try {
    const res = await fetch("/api/agenda", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ nom }),
    });
    if (!res.ok) {
      const err = await res.text();
      showNotif("Erreur création agenda: " + err, "err");
      return;
    }
    showNotif("Agenda créé", "ok");
    await chargerAgendas();
  } catch (err) {
    console.error(err);
    showNotif("Erreur création agenda", "err");
  } finally {
    creerAgenda._inFlight = false;
    if (sidebarBtn) sidebarBtn.disabled = false;
  }
}

// renommer (prompt)
async function renommerAgendaPrompt(agenda) {
  const nouveau = prompt("Nouveau nom pour l'agenda", agenda.nom);
  if (!nouveau || nouveau.trim() === "" || nouveau.trim() === agenda.nom)
    return;
  try {
    const res = await fetch(`/api/agenda/${agenda._id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ nom: nouveau.trim() }),
    });
    if (!res.ok) {
      const err = await res.text();
      showNotif("Erreur renommage: " + err, "err");
      return;
    }
    showNotif("Agenda renommé", "ok");
    await chargerAgendas();
  } catch (err) {
    console.error(err);
    showNotif("Erreur renommage", "err");
  }
}

// suppression (confirm)
async function supprimerAgendaConfirm(agenda) {
  if (
    !confirm(`Supprimer l'agenda "${agenda.nom}" ? Tous ses RDV seront perdus.`)
  )
    return;
  try {
    const res = await fetch(`/api/agenda/${agenda._id}`, {
      method: "DELETE",
      credentials: "include",
    });
    if (!res.ok) {
      const err = await res.text();
      showNotif("Erreur suppression: " + err, "err");
      return;
    }
    showNotif("Agenda supprimé", "ok");
    await chargerAgendas();
  } catch (err) {
    console.error(err);
    showNotif("Erreur suppression", "err");
  }
}

// RDV edit modal logic moved to `agenda.rdv.js`.

// remettre l'action par défaut du modal (nouveau RDV)
// RDV creation/save logic moved to `agenda.rdv.js`.

// build/populate the agenda picker UI inside the modal
// ---- navigation semaine ----
document.getElementById("prevWeek")?.addEventListener("click", () => {
  currentWeekStart.setDate(currentWeekStart.getDate() - 7);
  renderAgendaSemaine();
});
document.getElementById("nextWeek")?.addEventListener("click", () => {
  currentWeekStart.setDate(currentWeekStart.getDate() + 7);
  renderAgendaSemaine();
});

// actions boutons statiques (ajout agenda, ajout rdv, logout)
document.getElementById("btnAddAgenda")?.addEventListener("click", async () => {
  const nom = document.getElementById("agendaNom").value.trim();
  if (!nom) return showNotif("Nom obligatoire", "err");
  await creerAgenda(nom);
});

document.getElementById("logoutBtn")?.addEventListener("click", async () => {
  await fetch("/api/auth/logout", { method: "POST", credentials: "include" });
  window.location.href = "connexion.html";
});

// Lorsqu'on clique sur une case horaire dans la grille, on ouvre le modal
// Grid slot handlers moved to `agenda.rdv.js`.

/* Init UI: handlers for account modal and modal close/save defaults */
function initUIHandlers() {
  console.log("[agenda] initUIHandlers() start");
  const accountBtn = document.getElementById("accountBtn");
  const accountModal = document.getElementById("accountModal");
  const accountNameEl = document.getElementById("accountName");
  if (accountBtn && accountModal) {
    accountBtn.addEventListener("click", () => {
      const stored = localStorage.getItem("username");
      const input = document.getElementById("accountUsername");
      if (input && stored) input.value = stored;
      accountModal.classList.remove("hidden");
    });
  }

  const closeAccount = document.getElementById("closeAccountModal");
  if (closeAccount && accountModal) {
    closeAccount.addEventListener("click", () => {
      accountModal.classList.add("hidden");
    });
  }

  const saveAccount = document.getElementById("saveAccount");
  if (saveAccount) {
    saveAccount.addEventListener("click", async () => {
      const input = document.getElementById("accountUsername");
      const pass = document.getElementById("accountPassword");
      const data = {};
      if (input && input.value.trim()) data.username = input.value.trim();
      if (pass && pass.value.trim()) data.password = pass.value.trim();
      if (Object.keys(data).length === 0)
        return showNotif("Rien à changer", "err");
      try {
        const res = await fetch("/api/auth/update", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify(data),
        });
        if (!res.ok) {
          const txt = await res.text();
          return showNotif("Erreur mise à jour: " + txt, "err");
        }
        if (data.username) {
          localStorage.setItem("username", data.username);
          if (accountNameEl) accountNameEl.textContent = data.username;
        }
        accountModal.classList.add("hidden");
        showNotif("Compte mis à jour", "ok");
      } catch (err) {
        console.error(err);
        showNotif("Erreur mise à jour", "err");
      }
    });
  }

  const closeModalBtn = document.getElementById("closeModal");
  if (closeModalBtn) {
    closeModalBtn.addEventListener("click", () => {
      const modal = document.getElementById("modal");
      if (modal) modal.classList.add("hidden");
      const titre = document.getElementById("titre");
      const desc = document.getElementById("desc");
      if (titre) titre.value = "";
      if (desc) desc.value = "";
      setDefaultSaveAction();
    });
  }

  const pickerToggle = document.getElementById("agendaPickerToggle");
  const picker = document.getElementById("agendaPicker");
  if (pickerToggle && picker) {
    pickerToggle.addEventListener("click", () =>
      picker.classList.toggle("hidden")
    );
  } else {
    console.warn("[agenda] agendaPickerToggle or agendaPicker not found", {
      pickerToggle: !!pickerToggle,
      picker: !!picker,
    });
  }

  const sidebar = document.getElementById("agendaSidebar");
  const sidebarToggle = document.getElementById("sidebarToggle");
  if (sidebar && sidebarToggle) {
    sidebarToggle.addEventListener("click", () => {
      const open = sidebar.classList.toggle("open");
      if (open) {
        sidebar.classList.remove("closed");
        sidebar.setAttribute("aria-hidden", "false");
        sidebarToggle.setAttribute("aria-expanded", "true");
        sidebarToggle.classList.add("open");
      } else {
        sidebar.classList.add("closed");
        sidebar.setAttribute("aria-hidden", "true");
        sidebarToggle.setAttribute("aria-expanded", "false");
        sidebarToggle.classList.remove("open");
      }
    });
  } else {
    console.warn("[agenda] sidebarToggle or agendaSidebar not found", {
      sidebar: !!sidebar,
      sidebarToggle: !!sidebarToggle,
    });
  }

  const sidebarAdd = document.getElementById("sidebarBtnAddAgenda");
  if (sidebarAdd) {
    sidebarAdd.addEventListener("click", async () => {
      const input = document.getElementById("sidebarAgendaName");
      if (!input) return;
      const nom = input.value.trim();
      if (!nom) return showNotif("Nom obligatoire", "err");
      await creerAgenda(nom);
      input.value = "";
    });
  }
}

// Password visibility toggles
(function initPwToggles() {
  const eyeSvg = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8S1 12 1 12z"></path><circle cx="12" cy="12" r="3"></circle></svg>`;
  const eyeOffSvg = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M17.94 17.94A10.94 10.94 0 0 1 12 20c-7 0-11-8-11-8a21.66 21.66 0 0 1 5.06-6.09"></path><path d="M1 1l22 22"></path></svg>`;

  document.querySelectorAll(".pw-toggle").forEach((btn) => {
    const targetId = btn.dataset.target;
    const input = document.getElementById(targetId);
    if (!input) return;
    if (!btn.innerHTML.trim()) btn.innerHTML = eyeSvg;
    btn.addEventListener("click", () => {
      const isPwd = input.type === "password";
      input.type = isPwd ? "text" : "password";
      btn.innerHTML = isPwd ? eyeOffSvg : eyeSvg;
      btn.setAttribute(
        "aria-label",
        isPwd ? "Masquer le mot de passe" : "Afficher le mot de passe"
      );
    });
  });
})();

// expose functions for the initializer (agenda.main.js) to call
if (typeof initUIHandlers === "function")
  window.initUIHandlers = initUIHandlers;
if (typeof chargerAgendas === "function")
  window.chargerAgendas = chargerAgendas;

// --- EXPORT / IMPORT ---
document.getElementById("exportAgenda")?.addEventListener("click", async () => {
  const agendaId = window.currentAgendaId;
  if (!agendaId) return alert("Aucun agenda sélectionné");
  const response = await fetch(`/api/agenda/${agendaId}/export`);
  if (!response.ok) return alert("Erreur export");
  const blob = await response.blob();
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "agenda_export.json";
  a.click();
  window.URL.revokeObjectURL(url);
});

document
  .getElementById("importAgenda")
  ?.addEventListener("change", async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const text = await file.text();
    let data;
    try {
      data = JSON.parse(text);
    } catch (err) {
      alert("Fichier JSON invalide");
      return;
    }
    const agendaId = window.currentAgendaId;
    if (!agendaId) return alert("Aucun agenda sélectionné");
    const res = await fetch(`/api/agenda/${agendaId}/import`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
      credentials: "include",
    });
    if (res.ok) {
      alert("Agenda importé !");
      chargerAgendas();
    } else {
      alert("Erreur lors de l'import");
    }
  });

// initialisation
setTimeout(() => {
  chargerAgendas();
  initUIHandlers();
}, 50);

// global error catcher to help debugging in-browser
window.addEventListener("error", (e) => {
  console.error("[agenda] uncaught error", e.error || e.message, e);
  try {
    showNotif(
      "Erreur JS: " + (e.error?.message || e.message || "inconnu"),
      "err"
    );
  } catch (_) {}
});
