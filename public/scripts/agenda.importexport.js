// Export / Import handlers (moved from agenda.js)
(function attachImportExport() {
  const exportBtn = document.getElementById("exportAgenda");
  const notify = (msg, type = "info") => {
    if (typeof showNotif === "function") {
      showNotif(msg, type === "error" ? "err" : type === "ok" ? "ok" : "info");
    } else {
      alert(msg);
    }
  };
  if (exportBtn) {
    exportBtn.addEventListener("click", async () => {
      const agendaId = window.currentAgendaId;
      if (!agendaId) return notify("Aucun agenda sélectionné", "error");
      try {
        const blob = await window.agendaApi.exportAgenda(agendaId);
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = "agenda_export.json";
        a.click();
        window.URL.revokeObjectURL(url);
        notify("Agenda exporté", "ok");
      } catch (err) {
        console.error(err);
        notify("Erreur export", "error");
      }
    });
  }

  const importEl = document.getElementById("importAgenda");
  if (importEl) {
    importEl.addEventListener("change", async (e) => {
      const file = e.target.files[0];
      if (!file) return;
      const text = await file.text();
      let data;
      try {
        data = JSON.parse(text);
      } catch (err) {
        notify("Fichier JSON invalide", "error");
        return;
      }
      const agendaId = window.currentAgendaId;
      if (!agendaId) return notify("Aucun agenda sélectionné", "error");
      try {
        await window.agendaApi.importAgenda(agendaId, data);
        if (typeof window.chargerAgendas === "function") {
          await window.chargerAgendas();
        }
        notify("Agenda importé !", "ok");
      } catch (err) {
        console.error(err);
        notify("Erreur lors de l'import", "error");
      }
    });
  }
})();
