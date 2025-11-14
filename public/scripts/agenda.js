let agendas = [];
let agendaDefaut = null;
let selectedDate = null;
let currentWeekStart = getMonday(new Date());
let rdvEnEdition = null;

/* === Helpers === */
function formatDateRange(d) {
  if (!d) return "";
  const dateStr = d.toLocaleDateString();
  const startH = d.getHours();
  const endH = startH + 1;
  return `${dateStr} · ${startH}h - ${endH}h`;
}

/* === Notification visuelle === */
function showNotif(message, type = "success") {
  const notif = document.getElementById("notif");
  notif.textContent = message;
  notif.className = `fixed top-4 left-1/2 transform -translate-x-1/2 px-4 py-2 rounded shadow text-white text-sm ${
    type === "success" ? "notif-success" : "notif-error"
  }`;
  notif.classList.remove("hidden");
  setTimeout(() => notif.classList.add("hidden"), 2500);
}

/* === Chargement des agendas === */
async function chargerAgendas() {
  const res = await fetch(`/api/agenda?week=${currentWeekStart.toISOString()}`, {
  credentials: "include",
  });

  if (res.status === 401) return (window.location.href = "connexion.html");
  agendas = await res.json();

  if (!agendas.length) {
    await fetch("/api/agenda", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ nom: "defaut" }),
    });
    return chargerAgendas();
  }

  agendaDefaut = agendas.find((a) => a.nom === "defaut") || agendas[0];
  afficherSemaine();
}

/* === Calcule le lundi de la semaine === */
function getMonday(d) {
  d = new Date(d);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  return new Date(d.setDate(diff));
}

/* === Affiche la grille de la semaine === */
function afficherSemaine() {
  const jours = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"];
  const container = document.getElementById("agendaContainer");
  container.innerHTML = "";

  const weekDates = Array.from(
    { length: 7 },
    (_, i) => new Date(currentWeekStart.getTime() + i * 86400000)
  );

  const header = document.createElement("div");
  header.className = "week-grid week-header";

  // build header cells showing day name + date number (eg. "Lun 12")
  const headerCells = ["<div></div>"];
  weekDates.forEach((d, i) => {
    const dayName = jours[i];
    const dayNum = d.getDate();
    const isToday = new Date().toDateString() === d.toDateString();
    const cls = isToday ? "today" : "";
    headerCells.push(
      `<div class="${cls}">${dayName} <span class="day-num">${dayNum}</span></div>`
    );
  });
  header.innerHTML = headerCells.join("");
  container.appendChild(header);

  const heures = Array.from({ length: 10 }, (_, i) => i + 8);
  // update month/year display for the current week
  const monthEl = document.getElementById("monthYear");
  if (monthEl) {
    const startMonth = weekDates[0].toLocaleDateString("fr-FR", {
      month: "long",
    });
    const endMonth = weekDates[6].toLocaleDateString("fr-FR", {
      month: "long",
    });
    const startYear = weekDates[0].getFullYear();
    const endYear = weekDates[6].getFullYear();
    let text = "";
    if (startMonth === endMonth && startYear === endYear) {
      text = `${startMonth} ${startYear}`;
    } else if (startYear === endYear) {
      text = `${startMonth} - ${endMonth} ${startYear}`;
    } else {
      text = `${startMonth} ${startYear} - ${endMonth} ${endYear}`;
    }
    // Capitalize first letter
    monthEl.textContent = text.charAt(0).toUpperCase() + text.slice(1);
  }

  heures.forEach((h) => {
    const row = document.createElement("div");
    row.className = "week-grid";
    row.innerHTML = `<div class='hour-cell'>${h}h</div>`;
    weekDates.forEach((day) => {
      const cell = document.createElement("div");
      cell.className = "day-cell";
      const slotDate = new Date(day);
      slotDate.setHours(h, 0, 0, 0);
      cell.onclick = () => ouvrirModal(slotDate);
      row.appendChild(cell);
    });
    container.appendChild(row);
  });

  afficherRdvs(weekDates);
}

/* === Affiche les rendez-vous === */
function afficherRdvs(weekDates) {
  if (!agendaDefaut) return;
  // calculer borne de la semaine affichée (inclusif)
  const weekStart = new Date(weekDates[0]);
  weekStart.setHours(0, 0, 0, 0);
  const weekEnd = new Date(weekDates[6]);
  weekEnd.setHours(23, 59, 59, 999);

  // parcourir les rdvs et n'afficher que ceux dont la date est dans la semaine
  agendaDefaut.rdvs.forEach((rdv) => {
    const date = new Date(rdv.date);

    // ignorer les rdvs hors de la semaine affichée
    if (date < weekStart || date > weekEnd) return;

    const col = (date.getDay() + 6) % 7; // lundi=0
    const row = date.getHours() - 8;
    if (row < 0 || row >= 10 || col < 0 || col >= 7) return;

    const grid = document.querySelectorAll(".week-grid")[row + 1];
    if (!grid) return;
    const cell = grid.children[col + 1];
    if (!cell) return;

    //Marquer visuellement les RDVs permanents
    const div = document.createElement("div");
    div.className = "rdv";

    const isWeekly = rdv.recurrence === "weekly";
    div.textContent = isWeekly ? `${rdv.titre} (perm.)` : rdv.titre;

    div.title = rdv.description || "";


    // clic gauche → modifier (stopPropagation pour éviter que la cellule parent n'ouvre un nouveau RDV)
    div.onclick = (e) => {
      e.stopPropagation();
      modifierRdv(rdv);
    };
    // clic droit suppression retirée: suppression via le modal maintenant
    div.oncontextmenu = (e) => {
      e.preventDefault();
      e.stopPropagation();
    };

    cell.appendChild(div);
  });
}

/* === Ouvre la fenêtre d'ajout/modif  rdv-perm === */
function ouvrirModal(date) {
  rdvEnEdition = null;
  selectedDate = date;
  document.getElementById("modalTitle").textContent = "Nouveau RDV";
  document.getElementById("titre").value = "";
  document.getElementById("desc").value = "";


  // reset récurrence
  const recurSelect = document.getElementById("recurrence");
  if (recurSelect) recurSelect.value = "none";

  // afficher date/plage
  const info = document.getElementById("modalDateInfo");
  if (info) info.textContent = formatDateRange(selectedDate);
  // masquer bouton supprimer
  const delBtn = document.getElementById("deleteRdv");
  if (delBtn) delBtn.classList.add("hidden");
  document.getElementById("modal").classList.remove("hidden");
}

/* === Fermer la fenêtre === */
document.getElementById("closeModal").onclick = () => {
  rdvEnEdition = null;
  const info = document.getElementById("modalDateInfo");
  if (info) info.textContent = "";
  document.getElementById("modal").classList.add("hidden");
};

/* === Enregistrer (ajout/modif) rdv-perm === */
document.getElementById("saveRdv").onclick = async () => {
  const titre = document.getElementById("titre").value.trim();
  const description = document.getElementById("desc").value.trim();
  const recurrence =
    document.getElementById("recurrence")?.value || "none";

  if (!titre) return showNotif("Titre requis", "error");
  if (!agendaDefaut) return showNotif("Aucun agenda trouvé", "error");

  const url = rdvEnEdition
    ? `/api/agenda/${agendaDefaut._id}/rdv/${rdvEnEdition._id}`
    : `/api/agenda/${agendaDefaut._id}/rdv`;
  const method = rdvEnEdition ? "PUT" : "POST";

  const body = JSON.stringify({
    titre,
    description,
    date: selectedDate,
    recurrence,
  });

  try {
    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body,
    });

    if (!res.ok) {
      const err = await res.text();
      return showNotif(err || "Erreur lors de l'enregistrement", "error");
    }

    document.getElementById("modal").classList.add("hidden");
    showNotif(
      rdvEnEdition ? "Rendez-vous modifié" : "Rendez-vous ajouté",
      "success"
    );
    chargerAgendas();
  } catch (e) {
    showNotif("Erreur réseau lors de l'enregistrement", "error");
  }
};


/* === Suppression d'un RDV === */
async function supprimerRdv(rdvId) {
  if (!agendaDefaut) return showNotif("Aucun agenda trouvé", "error");

  try {
    const res = await fetch(`/api/agenda/${agendaDefaut._id}/rdv/${rdvId}`, {
      method: "DELETE",
      credentials: "include",
    });
    if (!res.ok) {
      const err = await res.text();
      return showNotif(err || "Erreur lors de la suppression", "error");
    }
    showNotif("Rendez-vous supprimé", "success");
    chargerAgendas();
  } catch (e) {
    showNotif("Erreur réseau lors de la suppression", "error");
  }
}

/* === Modification d'un RDV  rdv-perm=== */
function modifierRdv(rdv) {
  rdvEnEdition = rdv;
  selectedDate = new Date(rdv.date);
  document.getElementById("modalTitle").textContent = "Modifier RDV";
  document.getElementById("titre").value = rdv.titre;
  document.getElementById("desc").value = rdv.description || "";

  // renseigner la récurrence (par défaut "none" si pas définie)
  const recurSelect = document.getElementById("recurrence");
  if (recurSelect) {
    recurSelect.value = rdv.recurrence || "none";
  }

  // afficher date/plage
  const info = document.getElementById("modalDateInfo");
  if (info) info.textContent = formatDateRange(selectedDate);
  // afficher bouton supprimer et lier
  const delBtn = document.getElementById("deleteRdv");
  if (delBtn) {
    delBtn.classList.remove("hidden");
    delBtn.onclick = async () => {
      if (!rdvEnEdition) return;
      // fermer modal puis supprimer
      document.getElementById("modal").classList.add("hidden");
      await supprimerRdv(rdvEnEdition._id);
      rdvEnEdition = null;
    };
  }
  document.getElementById("modal").classList.remove("hidden");
}

/* === Navigation entre semaines === */
function changeWeek(weeks) {
  currentWeekStart.setDate(currentWeekStart.getDate() + weeks * 7);
  // Important : recharger les RDVs de la nouvelle semaine
  chargerAgendas();
}

document.getElementById("prevWeek").onclick = () => changeWeek(-1);
document.getElementById("nextWeek").onclick = () => changeWeek(1);

// Keyboard navigation: left/right arrows change the week
document.addEventListener("keydown", (e) => {
  // ignore when focus is on an input, textarea or contenteditable
  const tag = document.activeElement && document.activeElement.tagName;
  const isInput =
    tag === "INPUT" ||
    tag === "TEXTAREA" ||
    document.activeElement.isContentEditable;
  if (isInput) return;

  if (e.key === "ArrowLeft") {
    e.preventDefault();
    changeWeek(-1);
  } else if (e.key === "ArrowRight") {
    e.preventDefault();
    changeWeek(1);
  }
});

/* === Déconnexion === */
// Déconnexion — version robuste avec feedback utilisateur
const logoutBtn = document.getElementById("logoutBtn");
if (logoutBtn) {
  logoutBtn.addEventListener("click", async () => {
    try {
      const res = await fetch("/api/auth/logout", {
        method: "POST",
        credentials: "include",
      });

      if (res.ok) {
        alert("Déconnexion réussie !");
        window.location.href = "connexion.html";
      } else {
        let error = {};
        try {
          error = await res.json();
        } catch (e) {
          /* ignore */
        }
        alert("Erreur : " + (error.message || "Déconnexion échouée"));
      }
    } catch (err) {
      alert("Erreur réseau lors de la déconnexion");
    }
  });
}

// Accès aux paramètres de compte (si bouton présent)
// Ouvrir modal de modification du compte
const accountBtn = document.getElementById("accountBtn");
if (accountBtn) {
  accountBtn.addEventListener("click", openAccountModal);
}

function openAccountModal() {
  const modal = document.getElementById("accountModal");
  if (!modal) return;
  // préremplir le pseudo si disponible
  try {
    const name = localStorage.getItem("username");
    const input = document.getElementById("accountUsername");
    if (name && input) input.value = name;
  } catch (e) {
    /* ignore */
  }
  modal.classList.remove("hidden");
}

function closeAccountModal() {
  const modal = document.getElementById("accountModal");
  if (!modal) return;
  modal.classList.add("hidden");
}

document.getElementById("closeAccountModal")?.addEventListener("click", () => {
  closeAccountModal();
});

// Soumission du formulaire de modification du compte
document.getElementById("saveAccount")?.addEventListener("click", async () => {
  const username = document.getElementById("accountUsername")?.value?.trim();
  const password =
    document.getElementById("accountPassword")?.value || undefined;

  if (!username && !password) {
    showNotif("Renseignez un nouveau pseudo ou mot de passe", "error");
    return;
  }

  try {
    const res = await fetch("/api/auth/update", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({
        username: username || undefined,
        password: password || undefined,
      }),
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      showNotif(data.message || "Erreur lors de la mise à jour", "error");
      return;
    }

    // mise à jour ok: mettre à jour l'affichage et localStorage
    if (username) {
      try {
        localStorage.setItem("username", username);
      } catch (e) {
        /* ignore */
      }
      const acctEl = document.getElementById("accountName");
      if (acctEl) acctEl.textContent = username;
    }

    showNotif(data.message || "Compte mis à jour", "success");
    closeAccountModal();
  } catch (err) {
    showNotif("Erreur réseau lors de la mise à jour", "error");
  }
});

/* === Initialisation === */
// afficher nom de compte si disponible (stocké après connexion)
const acctEl = document.getElementById("accountName");
if (acctEl) {
  try {
    const name = localStorage.getItem("username");
    if (name) acctEl.textContent = name;
  } catch (e) {
    /* ignore */
  }
}

/* Password visibility toggles for any .pw-toggle buttons on this page (account modal) */
(function initPwToggles() {
  const eyeSvg = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8S1 12 1 12z"></path><circle cx="12" cy="12" r="3"></circle></svg>`;
  const eyeOffSvg = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M17.94 17.94A10.94 10.94 0 0 1 12 20c-7 0-11-8-11-8a21.66 21.66 0 0 1 5.06-6.09"></path><path d="M1 1l22 22"></path></svg>`;

  document.querySelectorAll(".pw-toggle").forEach((btn) => {
    const targetId = btn.dataset.target;
    const input = document.getElementById(targetId);
    if (!input) return;
    // ensure initial icon present
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

chargerAgendas();
