// public/scripts/agenda.rdv.js
// Logique RDV extraite depuis agenda.js

let selectedDateForModal = null;
let rdvEnEdition = null;

// affiche le badge de récurrence dans le RDV
function recurrenceLabel(r) {
  switch (r.recurrence) {
    case "daily":
      return `<span class="rec-badge daily">quotidien</span>`;
    case "weekly":
      return `<span class="rec-badge weekly">hebdo</span>`;
    case "monthly":
      return `<span class="rec-badge monthly">mensuel</span>`;
    case "yearly":
      return `<span class="rec-badge yearly">annuel</span>`;
    default:
      return "";
  }
}

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

  const todayMidnight = new Date();
  todayMidnight.setHours(0, 0, 0, 0);

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
    if (jour.getTime() === todayMidnight.getTime()) h.classList.add("today");
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
      if (jour.getTime() === todayMidnight.getTime()) {
        dayCell.classList.add("today-day");
      }

      const displayedRdvKeys = new Set();
      let rdvsPourCell = [];

      agendas.forEach((agenda, idx) => {
        if (!visibleAgendas[agenda._id]) return;
        const color = colors[idx % colors.length];

        (agenda.rdvs || []).forEach((r) => {
          const rdvDate = new Date(r.date || r.startTime);
          const original = new Date(r.startTime || r.date);
          if (dt < original) return;

          const exact =
            rdvDate.getFullYear() === dt.getFullYear() &&
            rdvDate.getMonth() === dt.getMonth() &&
            rdvDate.getDate() === dt.getDate() &&
            rdvDate.getHours() === dt.getHours();
          const daily =
            r.recurrence === "daily" && rdvDate.getHours() === dt.getHours();
          const weekly =
            r.recurrence === "weekly" &&
            rdvDate.getDay() === dt.getDay() &&
            rdvDate.getHours() === dt.getHours();
          const monthly =
            r.recurrence === "monthly" &&
            rdvDate.getDate() === dt.getDate() &&
            rdvDate.getHours() === dt.getHours();
          const yearly =
            r.recurrence === "yearly" &&
            rdvDate.getDate() === dt.getDate() &&
            rdvDate.getMonth() === dt.getMonth() &&
            rdvDate.getHours() === dt.getHours();

          if (!(exact || daily || weekly || monthly || yearly)) return;

          const key = r._id + "_" + dt.getHours();
          if (displayedRdvKeys.has(key)) return;
          displayedRdvKeys.add(key);

          rdvsPourCell.push({ rdv: r, agenda, color });
        });
      });

      // Affichage des RDVs concurrents
      rdvsPourCell.forEach(({ rdv, agenda, color }, i) => {
        const el = document.createElement("div");
        el.className = "rdv";
        el.style.background = color;
        el.title = `${agenda.nom} — ${rdv.titre}\n${rdv.description || ""}`;

        const recurringLabel = recurrenceLabel(rdv);
        const start = new Date(rdv.startTime || rdv.date);
        const end = rdv.endTime
          ? new Date(rdv.endTime)
          : new Date(start.getTime() + 60 * 60 * 1000);
        const durationMin = Math.max(15, (end - start) / (1000 * 60));

        el.innerHTML =
          `<strong>${rdv.titre}${recurringLabel}</strong>` +
          `<div class="text-xs">${timeStr(start)} - ${timeStr(end)}</div>`;

        const cellHeight = dayCell.offsetHeight || 60;
        const minuteOffset = start.getMinutes() || 0;
        const topPx = Math.round((minuteOffset / 60) * cellHeight) + 4;
        const heightPx = Math.round((durationMin / 60) * cellHeight) - 8;

        el.style.top = `${topPx}px`;
        el.style.height = `${Math.max(18, heightPx)}px`;
        el.style.bottom = "auto";
        el.style.zIndex = 5;

        const concurrents = rdvsPourCell.length;
        const widthPercent = 100 / concurrents;
        el.style.width = `calc(${widthPercent}% - 2px)`;
        el.style.left = `calc(${i * widthPercent}% + 1px)`;

        el.onclick = (ev) => {
          ev.stopPropagation();
          ouvrirEditionRdv(agenda, rdv);
        };
        dayCell.appendChild(el);
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

// édition RDV : ouvrir modal prérempli + supprimer/sauvegarder
function ouvrirEditionRdv(agenda, rdv) {
  const modal = document.getElementById("modal");
  const titre = document.getElementById("titre");
  const desc = document.getElementById("desc");
  const modalTitle = document.getElementById("modalTitle");
  if (modalTitle) modalTitle.textContent = `Modifier: ${rdv.titre}`;
  if (titre) titre.value = rdv.titre;
  if (desc) desc.value = rdv.description || "";
  if (modal) modal.classList.remove("hidden");
  rdvEnEdition = rdv;
  showTimeError("");

  const selectedAgendaId = agenda?._id || null;
  populateAgendaPicker(selectedAgendaId);

  const recur = document.getElementById("recurrence");
  if (recur) recur.value = rdv.recurrence || "none";

  const startEl = document.getElementById("startTime");
  const endEl = document.getElementById("endTime");
  const formatTime = (value) => {
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return null;
    const h = String(d.getHours()).padStart(2, "0");
    const m = String(d.getMinutes()).padStart(2, "0");
    return `${h}:${m}`;
  };
  const initialStart = rdv.startTime || rdv.date;
  const fallbackEnd = () => {
    if (!initialStart) return null;
    const clone = new Date(initialStart);
    clone.setHours(clone.getHours() + 1);
    clone.setMinutes(clone.getMinutes(), 0, 0);
    return clone;
  };
  const initialEnd = rdv.endTime || fallbackEnd();
  if (startEl && initialStart) {
    const startValue = formatTime(initialStart);
    if (startValue) startEl.value = startValue;
  }
  if (endEl && initialEnd) {
    const endValue = formatTime(initialEnd);
    if (endValue) endEl.value = endValue;
  }

  const saveBtn = document.getElementById("saveRdv");
  if (saveBtn)
    saveBtn.onclick = async () => {
      const targetAgendaId = getSelectedAgendaId() || getDefaultAgendaId();
      if (!targetAgendaId) return showNotif("Sélectionnez un agenda", "err");

      const newTitre = titre?.value?.trim() || "";
      const newDesc = desc?.value?.trim() || "";
      const recurrence = recur?.value || "none";
      if (!newTitre) return showNotif("Titre requis", "err");

      const startInput = document.getElementById("startTime")?.value;
      const endInput = document.getElementById("endTime")?.value;
      if (!validateTimeRange(startInput, endInput)) return;

      let payload = {
        titre: newTitre,
        description: newDesc,
        recurrence,
        agendaId: targetAgendaId,
      };
      if (startInput && endInput) {
        const base = rdv.startTime
          ? new Date(rdv.startTime)
          : rdv.date
          ? new Date(rdv.date)
          : new Date();
        const [sh, sm] = startInput.split(":").map(Number);
        const [eh, em] = endInput.split(":").map(Number);
        const startDate = new Date(base);
        startDate.setHours(sh, sm, 0, 0);
        const endDate = new Date(base);
        endDate.setHours(eh, em, 0, 0);
        payload.startTime = startDate;
        payload.endTime = endDate;
      }

      try {
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
        if (modal) modal.classList.add("hidden");
        if (titre) titre.value = "";
        if (desc) desc.value = "";
        rdvEnEdition = null;
        showTimeError("");
        showNotif("RDV modifié", "ok");
        await chargerAgendas();
      } catch (err) {
        console.error(err);
        showNotif("Erreur modification RDV", "err");
      }
    };

  const closeBtn = document.getElementById("closeModal");
  if (closeBtn)
    closeBtn.onclick = () => {
      const modal = document.getElementById("modal");
      if (modal) modal.classList.add("hidden");
      if (titre) titre.value = "";
      if (desc) desc.value = "";
      rdvEnEdition = null;
      showTimeError("");
      setDefaultSaveAction();
    };

  const delBtn = document.getElementById("deleteRdv");
  if (delBtn) {
    delBtn.classList.remove("hidden");
    delBtn.onclick = async () => {
      const confirmDelete = confirm(
        `Confirmer la suppression du RDV "${rdv.titre}" dans l'agenda "${agenda.nom}" ?`
      );
      if (!confirmDelete) return;

      const deleteUrl = `/api/agenda/${agenda._id}/rdv/${rdv._id}`;
      try {
        const res = await fetch(deleteUrl, {
          method: "DELETE",
          credentials: "include",
        });
        if (!res.ok) {
          const err = await res.text();
          showNotif("Erreur suppression RDV: " + err, "err");
          return;
        }
        if (modal) modal.classList.add("hidden");
        if (titre) titre.value = "";
        if (desc) desc.value = "";
        rdvEnEdition = null;
        showTimeError("");
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
  if (saveBtn)
    saveBtn.onclick = async () => {
      const targetAgendaId = getSelectedAgendaId() || getDefaultAgendaId();
      if (!targetAgendaId) return showNotif("Sélectionnez un agenda", "err");

      const titre = document.getElementById("titre").value.trim();
      const description = document.getElementById("desc").value.trim();
      const recurrence = document.getElementById("recurrence")?.value || "none";
      const startInput = document.getElementById("startTime")?.value;
      const endInput = document.getElementById("endTime")?.value;
      let baseDate = selectedDateForModal
        ? typeof selectedDateForModal === "string"
          ? new Date(selectedDateForModal)
          : new Date(selectedDateForModal)
        : null;
      if (!baseDate) baseDate = new Date();

      if (!titre || !startInput || !endInput)
        return showNotif("Titre et heure requis", "err");
      if (!validateTimeRange(startInput, endInput)) return;

      const [sh, sm] = startInput.split(":").map(Number);
      const [eh, em] = endInput.split(":").map(Number);
      const startTime = new Date(baseDate);
      startTime.setHours(sh, sm, 0, 0);
      const endTime = new Date(baseDate);
      endTime.setHours(eh, em, 0, 0);

      try {
        const res = await fetch(`/api/agenda/${targetAgendaId}/rdv`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({
            titre,
            description,
            startTime,
            endTime,
            agendaId: targetAgendaId,
            recurrence,
          }),
        });
        if (!res.ok) {
          const err = await res.text();
          showNotif("Erreur ajout RDV: " + err, "err");
          return;
        }
        const titreEl = document.getElementById("titre");
        const descEl = document.getElementById("desc");
        if (titreEl) titreEl.value = "";
        if (descEl) descEl.value = "";
        const modal = document.getElementById("modal");
        if (modal) modal.classList.add("hidden");
        showTimeError("");
        showNotif("RDV ajouté", "ok");
        await chargerAgendas();
      } catch (err) {
        console.error(err);
        showNotif("Erreur ajout RDV", "err");
      }
    };
}

// build/populate the agenda picker UI inside the modal
function populateAgendaPicker(initialAgendaId = null) {
  const container = document.getElementById("agendaPickerList");
  if (!container) return;
  container.innerHTML = "";

  const defaultId = initialAgendaId || getDefaultAgendaId();

  agendas.forEach((a) => {
    const id = a._id;
    const label = document.createElement("label");
    label.className = "flex items-center gap-2";
    const radio = document.createElement("input");
    radio.type = "radio";
    radio.name = "agendaPicker";
    radio.value = id;
    radio.checked = id === defaultId;
    const span = document.createElement("span");
    span.textContent = a.nom;
    label.appendChild(radio);
    label.appendChild(span);
    container.appendChild(label);
  });
}

function getSelectedAgendaId() {
  const checked = document.querySelector(
    "#agendaPickerList input[type=radio]:checked"
  );
  return checked ? checked.value : null;
}

function getDefaultAgendaId() {
  for (const a of agendas) {
    if (visibleAgendas[a._id] !== false) return a._id;
  }
  return agendas[0]?._id || null;
}

function validateTimeRange(startValue, endValue) {
  if (!startValue || !endValue) {
    showTimeError("");
    return true;
  }
  const [sh, sm] = startValue.split(":").map(Number);
  const [eh, em] = endValue.split(":").map(Number);
  const startMinutes = sh * 60 + sm;
  const endMinutes = eh * 60 + em;
  if (endMinutes <= startMinutes) {
    showTimeError("L'heure de fin doit être après l'heure de début.");
    return false;
  }
  showTimeError("");
  return true;
}

function showTimeError(message) {
  const errorEl = document.getElementById("timeError");
  if (!errorEl) return;
  if (message) {
    errorEl.textContent = message;
    errorEl.classList.remove("hidden");
  } else {
    errorEl.textContent = "";
    errorEl.classList.add("hidden");
  }
}

function openModalForDate(date) {
  if (typeof date === "string") selectedDateForModal = new Date(date);
  else selectedDateForModal = date;
  const modal = document.getElementById("modal");
  if (modal) modal.classList.remove("hidden");
  populateAgendaPicker();
  showTimeError("");
  const recur = document.getElementById("recurrence");
  if (recur) recur.value = "none";
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

function attachGridSlotHandlers() {
  document.querySelectorAll(".timeslot").forEach((cell) => {
    cell.onclick = () => {
      const dt = cell.getAttribute("data-datetime");
      if (!dt) return;
      openModalForDate(dt);
    };
  });
}

// expose functions globally used by other scripts
if (typeof renderAgendaSemaine === "function")
  window.renderAgendaSemaine = renderAgendaSemaine;
if (typeof openModalForDate === "function")
  window.openModalForDate = openModalForDate;
if (typeof ouvrirEditionRdv === "function")
  window.ouvrirEditionRdv = ouvrirEditionRdv;

document.addEventListener("keydown", (event) => {
  if (event.key !== "Enter") return;
  const modal = document.getElementById("modal");
  if (!modal || modal.classList.contains("hidden")) return;
  const target = event.target;
  const isTextarea =
    target &&
    (target.tagName === "TEXTAREA" ||
      target.getAttribute("role") === "textbox");
  if (isTextarea) return;
  event.preventDefault();
  document.getElementById("saveRdv")?.click();
});
