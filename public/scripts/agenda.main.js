// Main entry for agenda page (initialisation)
document.addEventListener("DOMContentLoaded", () => {
  // it's important that other script files (utils, pw, importexport) are loaded before this
  try {
    if (window.chargerAgendas) window.chargerAgendas();
    if (window.initUIHandlers) window.initUIHandlers();
  } catch (e) {
    console.error("Erreur initialisation agenda:", e);
  }
});

// Fallback attachments: ensure core handlers exist even if initUIHandlers failed
document.addEventListener("DOMContentLoaded", () => {
  try {
    // sidebar toggle fallback
    const sidebar = document.getElementById("agendaSidebar");
    const sidebarToggle = document.getElementById("sidebarToggle");
    if (sidebar && sidebarToggle && !sidebarToggle.dataset._attached) {
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
      sidebarToggle.dataset._attached = "1";
      console.log("[agenda.main] sidebar fallback attached");
    }

    // agenda picker fallback (inside modal)
    const pickerToggle = document.getElementById("agendaPickerToggle");
    const picker = document.getElementById("agendaPicker");
    if (pickerToggle && picker && !pickerToggle.dataset._attached) {
      pickerToggle.addEventListener("click", () =>
        picker.classList.toggle("hidden")
      );
      pickerToggle.dataset._attached = "1";
      console.log("[agenda.main] picker fallback attached");
    }

    // export/import fallback
    const exportBtn = document.getElementById("exportAgenda");
    if (exportBtn && !exportBtn.dataset._attached) {
      exportBtn.addEventListener("click", async () => {
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
      exportBtn.dataset._attached = "1";
      console.log("[agenda.main] export fallback attached");
    }

    // import fallback
    const importInput = document.getElementById("importAgenda");
    if (importInput && !importInput.dataset._attached) {
      importInput.addEventListener("change", async (e) => {
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
          showPopupNotif("Agenda importé !", "ok");
          if (window.chargerAgendas) window.chargerAgendas();
        } else {
          showPopupNotif("Erreur lors de l'import", "err");
        }
      });
      importInput.dataset._attached = "1";
      console.log("[agenda.main] import fallback attached");
    }

    // logout fallback
    const logoutBtn = document.getElementById("logoutBtn");
    if (logoutBtn && !logoutBtn.dataset._attached) {
      logoutBtn.addEventListener("click", async () => {
        await fetch("/api/auth/logout", {
          method: "POST",
          credentials: "include",
        });
        window.location.href = "connexion.html";
      });
      logoutBtn.dataset._attached = "1";
      console.log("[agenda.main] logout fallback attached");
    }
  } catch (err) {
    console.error("[agenda.main] fallback attach error", err);
  }
});
