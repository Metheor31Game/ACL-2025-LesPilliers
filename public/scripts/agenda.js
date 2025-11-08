// public/scripts/agenda.js

// palette de couleurs (automatique)
const colors = [
  "#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#06b6d4", "#84cc16",
];

let agendas = [];           // tableaux d'agendas côté client
let visibleAgendas = {};    // map agendaId -> bool visible
let currentWeekStart = getMonday(new Date());

// notifications rapides
function showNotif(text, type = "info", ms = 2200) {
  const n = document.getElementById("notif");
  n.textContent = text;
  n.className = ""; // reset
  n.classList.add("fixed", "top-4", "left-1/2", "-translate-x-1/2", "px-4", "py-2", "rounded", "shadow", "text-white", "text-sm");
  if (type === "ok") n.style.background = "#10b981";
  else if (type === "err") n.style.background = "#ef4444";
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
  return d.toLocaleDateString("fr-FR", { weekday: "short", day: "numeric", month: "short" });
}
function timeStr(d) {
  return new Date(d).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
}

// ---- chargement / affichage ----
async function chargerAgendas() {
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
  const leg = document.getElementById("legende");
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

    leg.appendChild(wrapper);
  });
}

// ---- rendu grille hebdomadaire (simple colonne par jour) ----
function renderAgendaSemaine() {
  const container = document.getElementById("agendaContainer");
  container.innerHTML = "";

  // days Monday..Sunday based on currentWeekStart
  const jours = Array.from({ length: 7 }).map((_, i) => {
    const d = new Date(currentWeekStart);
    d.setDate(currentWeekStart.getDate() + i);
    return d;
  });

  // header (jours)
  const header = document.createElement("div");
  header.className = "grid grid-cols-7 gap-2 mb-2";
  jours.forEach((jour) => {
    const h = document.createElement("div");
    h.className = "text-center font-bold p-2";
    h.textContent = formatDayHeader(jour);
    header.appendChild(h);
  });
  container.appendChild(header);

  // colonnes jours (chaque colonne contiendra tous les rdv de ce jour)
  const grid = document.createElement("div");
  grid.className = "grid grid-cols-7 gap-2";
  jours.forEach((jour) => {
    const col = document.createElement("div");
    col.className = "bg-white rounded shadow-sm p-2 min-h-[420px]"; // ajustable
    // pour chaque agenda, afficher les rdvs si visible
    agendas.forEach((agenda, idx) => {
      if (!visibleAgendas[agenda._id]) return;
      const color = colors[idx % colors.length];
      const rdvs = (agenda.rdvs || []).filter((r) => new Date(r.date).toDateString() === jour.toDateString());
      rdvs.forEach((rdv) => {
        const el = document.createElement("div");
        el.className = "rounded text-white p-2 mb-2 cursor-pointer text-sm";
        el.style.background = color;
        el.title = `${agenda.nom} — ${rdv.titre}\n${rdv.description || ""}`;
        el.innerHTML = `<b>${rdv.titre}</b><div class="text-xs">${timeStr(rdv.date)}</div>`;
        // possibilité d'éditer/supprimer en cliquant
        el.onclick = () => ouvrirEditionRdv(agenda, rdv);
        col.appendChild(el);
      });
    });
    grid.appendChild(col);
  });
  container.appendChild(grid);

  // update week label
  const weekLabel = document.getElementById("weekLabel");
  if (weekLabel) {
    const start = jours[0];
    const end = jours[6];
    weekLabel.textContent = `Semaine du ${start.toLocaleDateString()} au ${end.toLocaleDateString()}`;
  }
}

// ---- actions agenda ----
async function creerAgenda(nom) {
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
  }
}

async function ajouterRdv() {
  const select = document.getElementById("selectAgenda");
  const titre = document.getElementById("titreRdv").value.trim();
  const date = document.getElementById("dateRdv").value;
  if (!select || !titre || !date) return showNotif("Remplis tous les champs", "err");

  const agendaId = select.value;
  try {
    const res = await fetch(`/api/agenda/${agendaId}/rdv`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ titre, date }),
    });
    if (!res.ok) {
      const err = await res.text();
      showNotif("Erreur ajout RDV: " + err, "err");
      return;
    }
    document.getElementById("titreRdv").value = "";
    document.getElementById("dateRdv").value = "";
    showNotif("RDV ajouté", "ok");
    await chargerAgendas();
  } catch (err) {
    console.error(err);
    showNotif("Erreur ajout RDV", "err");
  }
}

// renommer (prompt)
async function renommerAgendaPrompt(agenda) {
  const nouveau = prompt("Nouveau nom pour l'agenda", agenda.nom);
  if (!nouveau || nouveau.trim() === "" || nouveau.trim() === agenda.nom) return;
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
  if (!confirm(`Supprimer l'agenda "${agenda.nom}" ? Tous ses RDV seront perdus.`)) return;
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

// édition RDV : ouvrir modal prérempli + supprimer/sauvegarder
function ouvrirEditionRdv(agenda, rdv) {
  const modal = document.getElementById("modal");
  const titre = document.getElementById("titre");
  const desc = document.getElementById("desc");
  const modalTitle = document.getElementById("modalTitle");
  modalTitle.textContent = `Modifier: ${rdv.titre}`;
  titre.value = rdv.titre;
  desc.value = rdv.description || "";
  modal.classList.remove("hidden");

  // on remplace l'action save pour faire un patch
  const saveBtn = document.getElementById("saveRdv");
  saveBtn.onclick = async () => {
    try {
      const newTitre = titre.value.trim();
      const newDesc = desc.value.trim();
      if (!newTitre) return showNotif("Titre requis", "err");

      const res = await fetch(`/api/agenda/${agenda._id}/rdv/${rdv._id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ titre: newTitre, description: newDesc }),
      });
      if (!res.ok) {
        const err = await res.text();
        showNotif("Erreur modification RDV: " + err, "err");
        return;
      }
      modal.classList.add("hidden");
      titre.value = "";
      desc.value = "";
      showNotif("RDV modifié", "ok");
      await chargerAgendas();
    } catch (err) {
      console.error(err);
      showNotif("Erreur modification RDV", "err");
    }
  };

  // bouton annuler
  document.getElementById("closeModal").onclick = () => {
    modal.classList.add("hidden");
    titre.value = "";
    desc.value = "";
    // restore default save action
    setDefaultSaveAction();
  };

  // ajouter suppression directement depuis modal (optionnel)
  // on crée un bouton supprimer temporaire
  let delBtn = document.getElementById("modalDeleteBtn");
  if (!delBtn) {
    delBtn = document.createElement("button");
    delBtn.id = "modalDeleteBtn";
    delBtn.className = "ml-2 px-4 py-1 bg-red-500 text-white rounded";
    delBtn.textContent = "Supprimer";
    document.getElementById("saveRdv").after(delBtn);
  }
  delBtn.onclick = async () => {
    if (!confirm("Supprimer ce RDV ?")) return;
    try {
      const res = await fetch(`/api/agenda/${agenda._id}/rdv/${rdv._id}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (!res.ok) {
        const err = await res.text();
        showNotif("Erreur suppression RDV: " + err, "err");
        return;
      }
      modal.classList.add("hidden");
      titre.value = "";
      desc.value = "";
      showNotif("RDV supprimé", "ok");
      await chargerAgendas();
    } catch (err) {
      console.error(err);
      showNotif("Erreur suppression RDV", "err");
    }
  };
}

// remettre l'action par défaut du modal (nouveau RDV)
function setDefaultSaveAction() {
  const saveBtn = document.getElementById("saveRdv");
  saveBtn.onclick = async () => {
    // quand on ouvre modal pour nouveau RDV, on choisit l'agenda par défaut (premier select)
    const select = document.getElementById("selectAgenda");
    const agendaId = select ? select.value : (agendas[0] && agendas[0]._id);
    const titre = document.getElementById("titre").value.trim();
    const description = document.getElementById("desc").value.trim();
    const date = selectedDateForModal; // variable set when opening modal for a timeslot
    if (!titre || !date) return showNotif("Titre et heure requis", "err");

    try {
      const res = await fetch(`/api/agenda/${agendaId}/rdv`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ titre, description, date }),
      });
      if (!res.ok) {
        const err = await res.text();
        showNotif("Erreur ajout RDV: " + err, "err");
        return;
      }
      document.getElementById("titre").value = "";
      document.getElementById("desc").value = "";
      document.getElementById("modal").classList.add("hidden");
      showNotif("RDV ajouté", "ok");
      await chargerAgendas();
    } catch (err) {
      console.error(err);
      showNotif("Erreur ajout RDV", "err");
    }
  };
}

// variable pour stocker date sélectionnée depuis calendrier
let selectedDateForModal = null;
function openModalForDate(date) {
  selectedDateForModal = date;
  document.getElementById("modal").classList.remove("hidden");
  setDefaultSaveAction();
}

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
document.getElementById("btnAddRdv")?.addEventListener("click", ajouterRdv);
document.getElementById("logoutBtn")?.addEventListener("click", async () => {
  await fetch("/api/auth/logout", { method: "POST", credentials: "include" });
  window.location.href = "connexion.html";
});

// Lorsqu'on clique sur une case horaire dans la grille, on ouvre le modal
function attachGridSlotHandlers() {
  // On parcourt toutes les colonnes et cellules et leur attache un handler si besoin.
  // Ici on suppose que les cellules ont la classe .timeslot et un attribut data-datetime
  document.querySelectorAll(".timeslot").forEach((cell) => {
    cell.onclick = () => {
      const dt = cell.getAttribute("data-datetime");
      if (!dt) return;
      openModalForDate(dt);
    };
  });
}

// initialisation
setTimeout(() => {
  // si tu n'as pas de select/inputs remplace par tes propres éléments HTML
  chargerAgendas();
}, 50);
