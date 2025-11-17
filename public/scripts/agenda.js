let agendas = [];
let agendaDefaut = null;
let selectedDate = null;
let currentWeekStart = getMonday(new Date());
let rdvEnEdition = null;

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
  const res = await fetch("/api/agenda", { credentials: "include" });
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

  const header = document.createElement("div");
  header.className = "week-grid week-header";
  header.innerHTML =
    "<div></div>" + jours.map((j) => `<div>${j}</div>`).join("");
  container.appendChild(header);

  const heures = Array.from({ length: 10 }, (_, i) => i + 8);
  const weekDates = Array.from(
    { length: 7 },
    (_, i) => new Date(currentWeekStart.getTime() + i * 86400000)
  );
  document.getElementById(
    "weekLabel"
  ).textContent = `Semaine du ${weekDates[0].toLocaleDateString()} au ${weekDates[6].toLocaleDateString()}`;

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

  // borne de la semaine affichée (inclusif)
  const weekStart = new Date(weekDates[0]);
  weekStart.setHours(0, 0, 0, 0);
  const weekEnd = new Date(weekDates[6]);
  weekEnd.setHours(23, 59, 59, 999);

  agendaDefaut.rdvs.forEach((rdv) => {
    const start = new Date(rdv.startTime);
    const end = new Date(rdv.endTime);

    // ignorer les RDVs hors de la semaine affichée
    if (start < weekStart || start > weekEnd) return;

    // calcul de la colonne (jour) et ligne (heure de début)
    const col = (start.getDay() + 6) % 7; // lundi = 0
    const row = start.getHours() - 8;
    if (row < 0 || row >= 10 || col < 0 || col >= 7) return;

    const grid = document.querySelectorAll(".week-grid")[row + 1];
    if (!grid) return;
    const cell = grid.children[col + 1];
    if (!cell) return;

    // créer le bloc RDV
    const div = document.createElement("div");
    div.className = "rdv";
    div.textContent = rdv.titre;
    div.title = rdv.description || "";

    // calculer la hauteur proportionnelle à la durée
    const durationMin = (end - start) / (1000 * 60); // durée en minutes
    const cellHeight = cell.offsetHeight; // hauteur d'une ligne
    div.style.height = `${(durationMin / 60) * cellHeight}px`;

    // clic gauche → modifier
    div.onclick = (e) => {
      e.stopPropagation();
      modifierRdv(rdv);
    };
    // clic droit → supprimer
    div.oncontextmenu = (e) => {
      e.preventDefault();
      e.stopPropagation();
      if (confirm("Supprimer ce rendez-vous ?")) supprimerRdv(rdv._id);
    };

    cell.appendChild(div);
  });
}


function ouvrirModal(date) {
  rdvEnEdition = null;
  selectedDate = date;

  document.getElementById("modalTitle").textContent = "Nouveau RDV";
  document.getElementById("titre").value = "";
  document.getElementById("desc").value = "";

  // heure par défaut = heure cliquée
  const hour = date.getHours().toString().padStart(2, "0") + ":00";
  document.getElementById("startTime").value = hour;
  document.getElementById("endTime").value = (date.getHours() + 1)
    .toString()
    .padStart(2, "0") + ":00";

  document.getElementById("modal").classList.remove("hidden");
}

/* === Fermer la fenêtre === */
document.getElementById("closeModal").onclick = () =>
  document.getElementById("modal").classList.add("hidden");

/* === Enregistrer (ajout/modif) === */
document.getElementById("saveRdv").onclick = async () => {
  const titre = document.getElementById("titre").value.trim();
  const description = document.getElementById("desc").value.trim();
  const start = document.getElementById("startTime").value;
  const end = document.getElementById("endTime").value;

  if (!titre) return showNotif("Titre requis", "error");
  if (!agendaDefaut) return showNotif("Aucun agenda trouvé", "error");

  if (!start || !end) return showNotif("Heure début/fin requise", "error");
  if (end <= start)
    return showNotif("L'heure de fin doit être après l'heure de début", "error");

  // Construire vraies dates complètes
  const startTime = new Date(selectedDate);
  const [sh, sm] = start.split(":").map(Number);
  startTime.setHours(sh, sm, 0, 0);

  const endTime = new Date(selectedDate);
  const [eh, em] = end.split(":").map(Number);
  endTime.setHours(eh, em, 0, 0);

  console.log("selectedDate:", selectedDate);
  console.log("dateDebut:", startTime);
  console.log("dateFin:", endTime);
  const body = JSON.stringify({
    titre,
    description,
    startTime,
    endTime
  });

  const url = rdvEnEdition
    ? `/api/agenda/${agendaDefaut._id}/rdv/${rdvEnEdition._id}`
    : `/api/agenda/${agendaDefaut._id}/rdv`;
  const method = rdvEnEdition ? "PUT" : "POST";

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

/* === Modification d'un RDV === */
function modifierRdv(rdv) {
  rdvEnEdition = rdv;

  const debut = new Date(rdv.startTime);
  const fin = new Date(rdv.endTime);

  selectedDate = debut; // date de référence du jour

  document.getElementById("modalTitle").textContent = "Modifier RDV";
  document.getElementById("titre").value = rdv.titre;
  document.getElementById("desc").value = rdv.description || "";

  document.getElementById("startTime").value =
    debut.toTimeString().slice(0, 5);
  document.getElementById("endTime").value =
    fin.toTimeString().slice(0, 5);

  document.getElementById("modal").classList.remove("hidden");
}

/* === Navigation entre semaines === */
document.getElementById("prevWeek").onclick = () => {
  currentWeekStart.setDate(currentWeekStart.getDate() - 7);
  afficherSemaine();
};
document.getElementById("nextWeek").onclick = () => {
  currentWeekStart.setDate(currentWeekStart.getDate() + 7);
  afficherSemaine();
};

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
const accSettingsBtn = document.getElementById("accSettingsBtn");
if (accSettingsBtn) {
  accSettingsBtn.addEventListener("click", () => {
    window.location.href = "accSettings.html";
  });
}

/* === Initialisation === */
chargerAgendas();
