// API helpers for agenda page — expose functions on window for compatibility
window.agendaApi = (function () {
  async function getAgendas() {
    const res = await fetch("/api/agenda", { credentials: "include" });
    if (res.status === 401) {
      window.location.href = "connexion.html";
      return null;
    }
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  }

  async function creerAgenda(nom) {
    if (creerAgenda._inFlight) return null;
    creerAgenda._inFlight = true;
    try {
      const res = await fetch("/api/agenda", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ nom }),
      });
      if (!res.ok) throw new Error(await res.text());
      showNotif("Agenda créé", "ok");
      if (window.chargerAgendas) await window.chargerAgendas();
      return await res.json();
    } catch (err) {
      console.error(err);
      showNotif("Erreur création agenda", "err");
      throw err;
    } finally {
      creerAgenda._inFlight = false;
    }
  }

  async function renommerAgenda(agendaId, nouveau) {
    try {
      const res = await fetch(`/api/agenda/${agendaId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ nom: nouveau }),
      });
      if (!res.ok) throw new Error(await res.text());
      showNotif("Agenda renommé", "ok");
      if (window.chargerAgendas) await window.chargerAgendas();
      return await res.json();
    } catch (err) {
      console.error(err);
      showNotif("Erreur renommage", "err");
      throw err;
    }
  }

  async function supprimerAgenda(agendaId) {
    try {
      const res = await fetch(`/api/agenda/${agendaId}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (!res.ok) throw new Error(await res.text());
      showNotif("Agenda supprimé", "ok");
      if (window.chargerAgendas) await window.chargerAgendas();
      return true;
    } catch (err) {
      console.error(err);
      showNotif("Erreur suppression", "err");
      throw err;
    }
  }

  async function createRdv(agendaId, payload) {
    const res = await fetch(`/api/agenda/${agendaId}/rdv`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error(await res.text());
    if (window.chargerAgendas) await window.chargerAgendas();
    return await res.json();
  }

  async function patchRdv(agendaId, rdvId, payload) {
    const res = await fetch(`/api/agenda/${agendaId}/rdv/${rdvId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error(await res.text());
    if (window.chargerAgendas) await window.chargerAgendas();
    return await res.json();
  }

  async function deleteRdvAcross(payload) {
    const res = await fetch("/api/agenda/rdv/delete", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error(await res.text());
    if (window.chargerAgendas) await window.chargerAgendas();
    return true;
  }

  async function exportAgenda(agendaId) {
    const res = await fetch(`/api/agenda/${agendaId}/export`, {
      credentials: "include",
    });
    if (!res.ok) throw new Error(await res.text());
    return res.blob();
  }

  async function importAgenda(agendaId, data) {
    const res = await fetch(`/api/agenda/${agendaId}/import`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error(await res.text());
    if (window.chargerAgendas) await window.chargerAgendas();
    return true;
  }

  async function updateAccount(data) {
    const res = await fetch("/api/auth/update", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error(await res.text());
    if (data.username) {
      localStorage.setItem("username", data.username);
      const accountNameEl = document.getElementById("accountName");
      if (accountNameEl) accountNameEl.textContent = data.username;
    }
    showNotif("Compte mis à jour", "ok");
    return true;
  }

  async function shareAgendaApi(agendaId, userId, rights) {
    return shareAgenda(agendaId, userId, rights);
  }

  async function joinAgendaApi(code, userId) {
    return joinAgenda(code, userId);
  }


  return {
    getAgendas,
    creerAgenda,
    renommerAgenda,
    supprimerAgenda,
    createRdv,
    patchRdv,
    deleteRdvAcross,
    exportAgenda,
    importAgenda,
    updateAccount,
    shareAgendaApi,
    joinAgendaApi,
  };
})();
