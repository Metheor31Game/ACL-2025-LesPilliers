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

  agendaDefaut = agendas.find(a => a.nom === "defaut") || agendas[0];
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
  header.innerHTML = "<div></div>" + jours.map(j => `<div>${j}</div>`).join("");
  container.appendChild(header);

  const heures = Array.from({ length: 10 }, (_, i) => i + 8);
  const weekDates = Array.from({ length: 7 }, (_, i) =>
    new Date(currentWeekStart.getTime() + i * 86400000)
  );
  document.getElementById("weekLabel").textContent = `Semaine du ${
    weekDates[0].toLocaleDateString()
  } au ${weekDates[6].toLocaleDateString()}`;

  heures.forEach(h => {
    const row = document.createElement("div");
    row.className = "week-grid";
    row.innerHTML = `<div class='hour-cell'>${h}h</div>`;
    weekDates.forEach(day => {
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
  agendaDefaut.rdvs.forEach(rdv => {
    const date = new Date(rdv.date);
    const col = (date.getDay() + 6) % 7;
    const row = date.getHours() - 8;
    if (row >= 0 && row < 10 && col >= 0 && col < 7) {
      const grid = document.querySelectorAll(".week-grid")[row + 1];
      const cell = grid.children[col + 1];
      const div = document.createElement("div");
      div.className = "rdv";
      div.textContent = rdv.titre;
      div.title = rdv.description || "";

      // clic gauche → modifier
      div.onclick = () => modifierRdv(rdv);
      // clic droit → supprimer
      div.oncontextmenu = e => {
        e.preventDefault();
        if (confirm("Supprimer ce rendez-vous ?")) supprimerRdv(rdv._id);
      };

      cell.appendChild(div);
    }
  });
}

/* === Ouvre la fenêtre d'ajout/modif === */
function ouvrirModal(date) {
  rdvEnEdition = null;
  selectedDate = date;
  document.getElementById("modalTitle").textContent = "Nouveau RDV";
  document.getElementById("titre").value = "";
  document.getElementById("desc").value = "";
  document.getElementById("modal").classList.remove("hidden");
}

/* === Fermer la fenêtre === */
document.getElementById("closeModal").onclick = () =>
  document.getElementById("modal").classList.add("hidden");

/* === Enregistrer (ajout/modif) === */
document.getElementById("saveRdv").onclick = async () => {
  const titre = document.getElementById("titre").value.trim();
  const description = document.getElementById("desc").value.trim();
  if (!titre) return showNotif("Titre requis", "error");
  if (!agendaDefaut) return showNotif("Aucun agenda trouvé", "error");

  const url = rdvEnEdition
    ? `/api/agenda/${agendaDefaut._id}/rdv/${rdvEnEdition._id}`
    : `/api/agenda/${agendaDefaut._id}/rdv`;
  const method = rdvEnEdition ? "PUT" : "POST";
  const body = JSON.stringify({ titre, description, date: selectedDate });

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
    const res = await fetch(
      `/api/agenda/${agendaDefaut._id}/rdv/${rdvId}`,
      { method: "DELETE", credentials: "include" }
    );
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
  selectedDate = new Date(rdv.date);
  document.getElementById("modalTitle").textContent = "Modifier RDV";
  document.getElementById("titre").value = rdv.titre;
  document.getElementById("desc").value = rdv.description || "";
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
document.getElementById("logoutBtn").onclick = async () => {
  await fetch("/api/auth/logout", {
    method: "POST",
    credentials: "include",
  });
  window.location.href = "connexion.html";
};

/* === Initialisation === */
chargerAgendas();
