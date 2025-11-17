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

// notifications rapides
function showNotif(text, type = "info", ms = 2200) {
  const n = document.getElementById("notif");
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
  // Populate either the sidebar list (`#sidebarAgendaList`) or fallback `#legende`
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
      // if sidebar picker exists, also reflect in picker checkboxes
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
    // clear time part for comparisons
    d.setHours(0, 0, 0, 0);
    return d;
  });

  // header row (uses .week-header layout: first cell reserved for hours)
  const header = document.createElement("div");
  header.className = "week-header";

  // first empty header cell (hours column)
  const empty = document.createElement("div");
  empty.textContent = "";
  header.appendChild(empty);

  // day headers
  jours.forEach((jour) => {
    const h = document.createElement("div");
    const dayName = document.createElement("span");
    dayName.textContent = jour.toLocaleDateString("fr-FR", {
      weekday: "short",
    });
    const dayNum = document.createElement("span");
    dayNum.className = "day-num";
    dayNum.textContent = jour.getDate();
    h.appendChild(dayName);
    h.appendChild(dayNum);
    // highlight today
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (jour.getTime() === today.getTime()) h.classList.add("today");
    header.appendChild(h);
  });

  container.appendChild(header);

  // build grid: left column hours, then 7 day cells per row
  const grid = document.createElement("div");
  grid.className = "week-grid";

  // hour range (8h..20h) - adjust if you need full day
  const startHour = 8;
  const endHour = 20;
  for (let h = startHour; h <= endHour; h++) {
    // hour label cell
    const hourCell = document.createElement("div");
    hourCell.className = "hour-cell";
    hourCell.textContent = `${String(h).padStart(2, "0")}h`;
    grid.appendChild(hourCell);

    // one cell per day for this hour
    jours.forEach((jour) => {
      const dayCell = document.createElement("div");
      dayCell.className = "day-cell timeslot";
      // data-datetime for click handlers (ISO string at hour)
      const dt = new Date(jour);
      dt.setHours(h, 0, 0, 0);
      dayCell.setAttribute("data-datetime", dt.toISOString());

      // populate rdvs matching this day and hour
      agendas.forEach((agenda, idx) => {
        if (!visibleAgendas[agenda._id]) return;
        const color = colors[idx % colors.length];
        const rdvs = (agenda.rdvs || []).filter((r) => {
          const rdvDate = new Date(r.date);
          return (
            rdvDate.getFullYear() === dt.getFullYear() &&
            rdvDate.getMonth() === dt.getMonth() &&
            rdvDate.getDate() === dt.getDate() &&
            rdvDate.getHours() === dt.getHours()
          );
        });
        rdvs.forEach((rdv) => {
          const el = document.createElement("div");
          el.className = "rdv";
          el.style.background = color;
          el.title = `${agenda.nom} — ${rdv.titre}\n${rdv.description || ""}`;
          el.innerHTML = `<strong>${
            rdv.titre
          }</strong><div class="text-xs">${timeStr(rdv.date)}</div>`;
          el.onclick = (ev) => {
            ev.stopPropagation();
            ouvrirEditionRdv(agenda, rdv);
          };
          dayCell.appendChild(el);
        });
      });

      grid.appendChild(dayCell);
    });
  }

  container.appendChild(grid);

  // update monthYear display (centered between arrows)
  const monthEl = document.getElementById("monthYear");
  if (monthEl) {
    const start = jours[0];
    const end = jours[6];
    const opts = { month: "long", year: "numeric" };
    if (start.getMonth() === end.getMonth()) {
      monthEl.textContent = start.toLocaleDateString("fr-FR", opts);
    } else {
      monthEl.textContent = `${start.toLocaleDateString("fr-FR", {
        month: "long",
      })} - ${end.toLocaleDateString("fr-FR", {
        month: "long",
        year: "numeric",
      })}`;
    }
  }

  // attach click handlers to timeslots
  attachGridSlotHandlers();
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

// legacy: fallback RDV-creation removed (use modal).

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

  // populate the agenda picker with agendas that already contain this RDV (by sharedId)
  try {
    let initial = [];
    if (rdv.sharedId) {
      const sid = rdv.sharedId.toString();
      agendas.forEach((a) => {
        if (
          (a.rdvs || []).some(
            (r) => r.sharedId && r.sharedId.toString() === sid
          )
        ) {
          initial.push(a._id);
        }
      });
    } else {
      // default to current agenda only
      initial = [agenda._id];
    }
    populateAgendaPicker(initial);
  } catch (e) {
    populateAgendaPicker([agenda._id]);
  }

  // on remplace l'action save pour faire un patch
  const saveBtn = document.getElementById("saveRdv");
  saveBtn.onclick = async () => {
    try {
      const newTitre = titre.value.trim();
      const newDesc = desc.value.trim();
      if (!newTitre) return showNotif("Titre requis", "err");

      // collect selected agendaIds from picker
      const picker = document.querySelectorAll(
        "#agendaPickerList input[type=checkbox]"
      );
      let agendaIds = [];
      if (picker && picker.length) {
        agendaIds = Array.from(picker)
          .filter((c) => c.checked)
          .map((c) => c.value);
      }

      const res = await fetch(`/api/agenda/${agenda._id}/rdv/${rdv._id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          titre: newTitre,
          description: newDesc,
          agendaIds,
        }),
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
  // utiliser le bouton de suppression présent dans le modal (id="deleteRdv")
  const delBtn = document.getElementById("deleteRdv");
  if (delBtn) {
    delBtn.classList.remove("hidden");
    delBtn.onclick = async () => {
      if (!confirm("Supprimer ce RDV ?")) return;
      try {
        // collect selected agendaIds from picker (if none, default to current agenda)
        const picker = document.querySelectorAll(
          "#agendaPickerList input[type=checkbox]"
        );
        let agendaIds = [];
        if (picker && picker.length) {
          agendaIds = Array.from(picker)
            .filter((c) => c.checked)
            .map((c) => c.value);
        }
        if (!agendaIds || agendaIds.length === 0) agendaIds = [agenda._id];

        const payload = { agendaIds };
        if (rdv.sharedId) payload.sharedId = rdv.sharedId.toString();
        else payload.rdvId = rdv._id;

        const res = await fetch(`/api/agenda/rdv/delete`, {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
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
}

// remettre l'action par défaut du modal (nouveau RDV)
function setDefaultSaveAction() {
  const saveBtn = document.getElementById("saveRdv");
  // hide delete button by default when creating new RDV
  const delBtn = document.getElementById("deleteRdv");
  if (delBtn) delBtn.classList.add("hidden");
  // set modal title to new RDV when in default (create) mode
  const modalTitle = document.getElementById("modalTitle");
  if (modalTitle) modalTitle.textContent = "Nouveau RDV";
  saveBtn.onclick = async () => {
    // collect selected agendaIds from picker (if none, default to visible agendas)
    const picker = document.querySelectorAll(
      "#agendaPickerList input[type=checkbox]"
    );
    let agendaIds = [];
    if (picker && picker.length) {
      agendaIds = Array.from(picker)
        .filter((c) => c.checked)
        .map((c) => c.value);
    }
    if (!agendaIds || agendaIds.length === 0) {
      for (const a of agendas)
        if (visibleAgendas[a._id] !== false) agendaIds.push(a._id);
      if (agendaIds.length === 0 && agendas[0]) agendaIds.push(agendas[0]._id);
    }

    const titre = document.getElementById("titre").value.trim();
    const description = document.getElementById("desc").value.trim();
    const date = selectedDateForModal; // variable set when opening modal for a timeslot
    if (!titre || !date) return showNotif("Titre et heure requis", "err");

    try {
      // use POST with agendaIds to create copies across selected agendas
      const res = await fetch(`/api/agenda/${agendaIds[0]}/rdv`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ titre, description, date, agendaIds }),
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

// build/populate the agenda picker UI inside the modal
function populateAgendaPicker(initialCheckedIds = []) {
  const container = document.getElementById("agendaPickerList");
  if (!container) return;
  container.innerHTML = "";
  agendas.forEach((a, idx) => {
    const id = a._id;
    const label = document.createElement("label");
    label.className = "flex items-center gap-2";
    const cb = document.createElement("input");
    cb.type = "checkbox";
    cb.value = id;
    // default checked: if initialCheckedIds provided use it, otherwise check visible
    if (initialCheckedIds && initialCheckedIds.length > 0) {
      cb.checked = initialCheckedIds.includes(id);
    } else {
      cb.checked = visibleAgendas[id] !== false;
    }
    const span = document.createElement("span");
    span.textContent = a.nom;
    label.appendChild(cb);
    label.appendChild(span);
    container.appendChild(label);
  });
}

// variable pour stocker date sélectionnée depuis calendrier
let selectedDateForModal = null;
function openModalForDate(date) {
  selectedDateForModal = date;
  document.getElementById("modal").classList.remove("hidden");
  // populate picker with visible agendas by default
  populateAgendaPicker();
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
// legacy fallback removed: btnAddRdv listener omitted (RDV creation via modal)
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

/* Init UI: handlers for account modal and modal close/save defaults */
function initUIHandlers() {
  // account modal open
  const accountBtn = document.getElementById("accountBtn");
  const accountModal = document.getElementById("accountModal");
  const accountNameEl = document.getElementById("accountName");
  if (accountBtn && accountModal) {
    accountBtn.addEventListener("click", () => {
      // prefill username from localStorage if available
      const stored = localStorage.getItem("username");
      const input = document.getElementById("accountUsername");
      if (input && stored) input.value = stored;
      accountModal.classList.remove("hidden");
    });
  }

  // account modal close
  const closeAccount = document.getElementById("closeAccountModal");
  if (closeAccount && accountModal) {
    closeAccount.addEventListener("click", () => {
      accountModal.classList.add("hidden");
    });
  }

  // account save
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
        // update UI
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

  // generic close for RDV modal (when creating new RDV)
  const closeModalBtn = document.getElementById("closeModal");
  if (closeModalBtn) {
    closeModalBtn.addEventListener("click", () => {
      const modal = document.getElementById("modal");
      if (modal) modal.classList.add("hidden");
      // clear fields
      const titre = document.getElementById("titre");
      const desc = document.getElementById("desc");
      if (titre) titre.value = "";
      if (desc) desc.value = "";
      setDefaultSaveAction();
    });
  }

  // agenda picker toggle
  const pickerToggle = document.getElementById("agendaPickerToggle");
  const picker = document.getElementById("agendaPicker");
  if (pickerToggle && picker) {
    pickerToggle.addEventListener("click", () => {
      picker.classList.toggle("hidden");
    });
  }

  // sidebar toggle + add-agenda
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
        // visual state handled by CSS (.open class) — no inner text manipulation
      } else {
        sidebar.classList.add("closed");
        sidebar.setAttribute("aria-hidden", "true");
        sidebarToggle.setAttribute("aria-expanded", "false");
        sidebarToggle.classList.remove("open");
        // visual state handled by CSS (.open class) — no inner text manipulation
      }
    });
  }

  // sidebar add agenda
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

// initialisation
setTimeout(() => {
  // si tu n'as pas de select/inputs remplace par tes propres éléments HTML
  chargerAgendas();
  // init UI handlers
  initUIHandlers();
}, 50);
