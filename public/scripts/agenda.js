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
let selectedDateForModal = null;
let rdvEnEdition = null;
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

// ---- rendu grille hebdomadaire (avec support RDV récurrents weekly) ----
function renderAgendaSemaine() {
  const container = document.getElementById("agendaContainer");
  if (!container) return;
  container.innerHTML = "";

  const jours = Array.from({ length: 7 }).map((_, i) => {
    const d = new Date(currentWeekStart);
    d.setDate(currentWeekStart.getDate() + i);
    d.setHours(0, 0, 0, 0);
    return d;
  });

  const header = document.createElement("div");
  header.className = "week-header";
  const empty = document.createElement("div");
  empty.textContent = "";
  header.appendChild(empty);

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
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (jour.getTime() === today.getTime()) h.classList.add("today");
    header.appendChild(h);
  });

  container.appendChild(header);

  const grid = document.createElement("div");
  grid.className = "week-grid";

  const startHour = 8;
  const endHour = 20;
  for (let h = startHour; h <= endHour; h++) {
    const hourCell = document.createElement("div");
    hourCell.className = "hour-cell";
    hourCell.textContent = `${String(h).padStart(2, "0")}h`;
    grid.appendChild(hourCell);

    jours.forEach((jour) => {
      const dayCell = document.createElement("div");
      dayCell.className = "day-cell timeslot";
      const dt = new Date(jour);
      dt.setHours(h, 0, 0, 0);
      dayCell.setAttribute("data-datetime", dt.toISOString());

      // populate rdvs matching this day and hour
      agendas.forEach((agenda, idx) => {
        if (!visibleAgendas[agenda._id]) return;
        const color = colors[idx % colors.length];
        const rdvs = (agenda.rdvs || []).filter((r) => {
          // support rdvs stored with `date` or with `startTime`
          const rdvDate = new Date(r.date || r.startTime);
          // exact match
          const exact =
            rdvDate.getFullYear() === dt.getFullYear() &&
            rdvDate.getMonth() === dt.getMonth() &&
            rdvDate.getDate() === dt.getDate() &&
            rdvDate.getHours() === dt.getHours();
          // weekly recurrence match (weekday + hour)
          const weekly =
            r.recurrence === "weekly" &&
            rdvDate.getDay() === dt.getDay() &&
            rdvDate.getHours() === dt.getHours();
          return exact || weekly;
        });
        rdvs.forEach((rdv) => {
          const el = document.createElement("div");
          el.className = "rdv";
          el.style.background = color;
          el.title = `${agenda.nom} — ${rdv.titre}\n${rdv.description || ""}`;
          const recurringLabel = rdv.recurrence === "weekly" ? " (perm.)" : "";

          // compute start and end times (support `date` or `startTime`)
          const start = new Date(rdv.startTime || rdv.date);
          const end = rdv.endTime
            ? new Date(rdv.endTime)
            : new Date(start.getTime() + 60 * 60 * 1000);
          const durationMin = Math.max(15, (end - start) / (1000 * 60)); // at least 15 minutes

          // show title and full time range (start - end)
          el.innerHTML =
            `<strong>${rdv.titre}${recurringLabel}</strong>` +
            `<div class="text-xs">${timeStr(start)} - ${timeStr(end)}</div>`;

          // position and size the element within the hour cell according to minutes/duration
          const cellHeight = dayCell.offsetHeight || 60;
          const minuteOffset = start.getMinutes() || 0;
          const topPx = Math.round((minuteOffset / 60) * cellHeight) + 4; // small padding
          const heightPx = Math.round((durationMin / 60) * cellHeight) - 8; // account for padding

          el.style.top = `${topPx}px`;
          el.style.height = `${Math.max(18, heightPx)}px`;
          el.style.bottom = "auto";
          el.style.zIndex = 5;

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

  attachGridSlotHandlers();
}

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
  rdvEnEdition = rdv;

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
      initial = [agenda._id];
    }
    populateAgendaPicker(initial);
  } catch (e) {
    populateAgendaPicker([agenda._id]);
  }

  // set recurrence select
  const recur = document.getElementById("recurrence");
  if (recur) recur.value = rdv.recurrence || "none";

  // populate start/end inputs for editing (support startTime/endTime or date)
  try {
    const startEl = document.getElementById("startTime");
    const endEl = document.getElementById("endTime");
    const debut = rdv.startTime
      ? new Date(rdv.startTime)
      : rdv.date
      ? new Date(rdv.date)
      : null;
    const fin = rdv.endTime
      ? new Date(rdv.endTime)
      : debut
      ? new Date(debut.getTime() + 60 * 60 * 1000)
      : null;
    if (debut && startEl) startEl.value = debut.toTimeString().slice(0, 5);
    if (fin && endEl) endEl.value = fin.toTimeString().slice(0, 5);
    if (debut) selectedDateForModal = new Date(debut);
  } catch (e) {
    console.warn("[agenda] could not populate edit times", e);
  }

  // override save button for patch
  const saveBtn = document.getElementById("saveRdv");
  saveBtn.onclick = async () => {
    try {
      const newTitre = titre.value.trim();
      const newDesc = desc.value.trim();
      const recurrence = document.getElementById("recurrence")?.value || "none";
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

      // include updated times when editing
      const startInput = document.getElementById("startTime")?.value;
      const endInput = document.getElementById("endTime")?.value;
      let payload = {
        titre: newTitre,
        description: newDesc,
        recurrence,
        agendaIds,
      };
      if (startInput && endInput) {
        const base = rdv.startTime
          ? new Date(rdv.startTime)
          : rdv.date
          ? new Date(rdv.date)
          : new Date();
        const [sh, sm] = startInput.split(":").map(Number);
        const [eh, em] = endInput.split(":").map(Number);
        const s = new Date(base);
        s.setHours(sh, sm, 0, 0);
        const e = new Date(base);
        e.setHours(eh, em, 0, 0);
        payload.startTime = s;
        payload.endTime = e;
      }

      const res = await fetch(`/api/agenda/${agenda._id}/rdv/${rdv._id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const err = await res.text();
        showNotif("Erreur modification RDV: " + err, "err");
        return;
      }
      modal.classList.add("hidden");
      titre.value = "";
      desc.value = "";
      rdvEnEdition = null;
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
    rdvEnEdition = null;
    setDefaultSaveAction();
  };

  // delete button
  const delBtn = document.getElementById("deleteRdv");
  if (delBtn) {
    delBtn.classList.remove("hidden");
    delBtn.onclick = async () => {
      if (!confirm("Supprimer ce RDV ?")) return;
      try {
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
        rdvEnEdition = null;
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
  const delBtn = document.getElementById("deleteRdv");
  if (delBtn) delBtn.classList.add("hidden");
  const modalTitle = document.getElementById("modalTitle");
  if (modalTitle) modalTitle.textContent = "Nouveau RDV";
  rdvEnEdition = null;
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
    const recurrence = document.getElementById("recurrence")?.value || "none";
    const startInput = document.getElementById("startTime")?.value;
    const endInput = document.getElementById("endTime")?.value;
    // selectedDateForModal should be a Date or parsable string
    let baseDate = selectedDateForModal
      ? typeof selectedDateForModal === "string"
        ? new Date(selectedDateForModal)
        : new Date(selectedDateForModal)
      : null;
    // fallback to today if no base date (allow user to create by typing times)
    if (!baseDate) {
      console.warn("[agenda] no selectedDateForModal, falling back to now");
      baseDate = new Date();
    }

    // debug: log values to help identify why validation fails
    console.log("[agenda] creating RDV payload values", {
      titre,
      baseDate,
      startInput,
      endInput,
      agendaIds,
    });
    if (!titre || !startInput || !endInput)
      return showNotif("Titre et heure requis", "err");

    // build full Date objects for startTime and endTime
    const [sh, sm] = startInput.split(":").map(Number);
    const [eh, em] = endInput.split(":").map(Number);
    const startTime = new Date(baseDate);
    startTime.setHours(sh, sm, 0, 0);
    const endTime = new Date(baseDate);
    endTime.setHours(eh, em, 0, 0);

    try {
      const res = await fetch(`/api/agenda/${agendaIds[0]}/rdv`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          titre,
          description,
          startTime,
          endTime,
          agendaIds,
          recurrence,
        }),
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

function openModalForDate(date) {
  // accept ISO string or Date
  if (typeof date === "string") selectedDateForModal = new Date(date);
  else selectedDateForModal = date;
  const modal = document.getElementById("modal");
  if (modal) modal.classList.remove("hidden");
  populateAgendaPicker();
  const recur = document.getElementById("recurrence");
  if (recur) recur.value = "none";
  // set sensible default start/end times based on clicked date
  try {
    const startEl = document.getElementById("startTime");
    const endEl = document.getElementById("endTime");
    if (selectedDateForModal && startEl && endEl) {
      const d =
        typeof selectedDateForModal === "string"
          ? new Date(selectedDateForModal)
          : new Date(selectedDateForModal);
      const h = d.getHours();
      startEl.value = String(h).padStart(2, "0") + ":00";
      endEl.value = String((h + 1) % 24).padStart(2, "0") + ":00";
    }
  } catch (e) {
    console.warn("[agenda] could not set default times", e);
  }
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

document.getElementById("logoutBtn")?.addEventListener("click", async () => {
  await fetch("/api/auth/logout", { method: "POST", credentials: "include" });
  window.location.href = "connexion.html";
});

// Lorsqu'on clique sur une case horaire dans la grille, on ouvre le modal
function attachGridSlotHandlers() {
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
