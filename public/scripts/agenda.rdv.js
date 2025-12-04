// public/scripts/agenda.rdv.js
// Logique RDV extraite depuis agenda.js

let selectedDateForModal = null;
let rdvEnEdition = null;

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
          const rdvDate = new Date(r.date || r.startTime);
          const exact =
            rdvDate.getFullYear() === dt.getFullYear() &&
            rdvDate.getMonth() === dt.getMonth() &&
            rdvDate.getDate() === dt.getDate() &&
            rdvDate.getHours() === dt.getHours();
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

  const recur = document.getElementById("recurrence");
  if (recur) recur.value = rdv.recurrence || "none";

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

  const saveBtn = document.getElementById("saveRdv");
  if (saveBtn)
    saveBtn.onclick = async () => {
      try {
        const newTitre = titre.value.trim();
        const newDesc = desc.value.trim();
        const recurrence =
          document.getElementById("recurrence")?.value || "none";
        if (!newTitre) return showNotif("Titre requis", "err");

        const picker = document.querySelectorAll(
          "#agendaPickerList input[type=checkbox]"
        );
        let agendaIds = [];
        if (picker && picker.length) {
          agendaIds = Array.from(picker)
            .filter((c) => c.checked)
            .map((c) => c.value);
        }

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
        if (modal) modal.classList.add("hidden");
        if (titre) titre.value = "";
        if (desc) desc.value = "";
        rdvEnEdition = null;
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
      setDefaultSaveAction();
    };

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
        const modal = document.getElementById("modal");
        if (modal) modal.classList.add("hidden");
        if (titre) titre.value = "";
        if (desc) desc.value = "";
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
  if (saveBtn)
    saveBtn.onclick = async () => {
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
        if (agendaIds.length === 0 && agendas[0])
          agendaIds.push(agendas[0]._id);
      }

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

      console.log("[agenda] creating RDV payload values", {
        titre,
        baseDate,
        startInput,
        endInput,
        agendaIds,
      });
      if (!titre || !startInput || !endInput)
        return showNotif("Titre et heure requis", "err");

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
        const titreEl = document.getElementById("titre");
        const descEl = document.getElementById("desc");
        if (titreEl) titreEl.value = "";
        if (descEl) descEl.value = "";
        const modal = document.getElementById("modal");
        if (modal) modal.classList.add("hidden");
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
  if (typeof date === "string") selectedDateForModal = new Date(date);
  else selectedDateForModal = date;
  const modal = document.getElementById("modal");
  if (modal) modal.classList.remove("hidden");
  populateAgendaPicker();
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