// Export / Import handlers (moved from agenda.js)
(function attachImportExport() {
  const exportBtn = document.getElementById("exportAgenda");
  if (exportBtn) {
    exportBtn.addEventListener("click", async () => {
      const agendaId = window.currentAgendaId;
      if (!agendaId) return alert("Aucun agenda sélectionné");
      try {
        const blob = await window.agendaApi.exportAgenda(agendaId);
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = "agenda_export.json";
        a.click();
        window.URL.revokeObjectURL(url);
      } catch (err) {
        console.error(err);
        alert("Erreur export");
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
        alert("Fichier JSON invalide");
        return;
      }
      const agendaId = window.currentAgendaId;
      if (!agendaId) return alert("Aucun agenda sélectionné");
      try {
        await window.agendaApi.importAgenda(agendaId, data);
        alert("Agenda importé !");
      } catch (err) {
        console.error(err);
        alert("Erreur lors de l'import");
      }
    });
  }
})();
