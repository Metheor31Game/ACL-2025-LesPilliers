// /scripts/agenda.share.js

function initAgendaSharing() {
  const shareBtn = document.getElementById('shareAgendaBtn');
  const modal = document.getElementById('shareModal');
  const shareAction = document.getElementById('shareAction');
  const shareFields = document.getElementById('shareFields');
  const shareSubmit = document.getElementById('shareSubmit');
  const shareCancel = document.getElementById('shareCancel');

  function openModal() {
    modal.classList.remove('hidden');
    renderFields();
  }

  function closeModal() {
    modal.classList.add('hidden');
    shareFields.innerHTML = '';
  }

  function renderFields() {
    shareFields.innerHTML = '';
    if (shareAction.value === 'share') {
      // Sélecteur d'agenda
      const agendaItems = Array.from(document.querySelectorAll('#sidebarAgendaList .agenda-item'));
      const agendaSelect = document.createElement('select');
      agendaSelect.id = 'shareAgendaSelect';
      agendaSelect.className = 'input mb-2';
      agendaItems.forEach(el => {
        const option = document.createElement('option');
        option.value = el.dataset.agendaId;
        option.textContent = el.textContent.trim();
        agendaSelect.appendChild(option);
      });
      shareFields.appendChild(createLabel('Agenda', 'shareAgendaSelect'));
      shareFields.appendChild(agendaSelect);

      // Droits
      const rightsSelect = document.createElement('select');
      rightsSelect.id = 'shareRights';
      rightsSelect.className = 'input mb-2';
      ['lecture', 'modification'].forEach(r => {
        const option = document.createElement('option');
        option.value = r;
        option.textContent = r;
        rightsSelect.appendChild(option);
      });
      shareFields.appendChild(createLabel('Droits', 'shareRights'));
      shareFields.appendChild(rightsSelect);

    } else {
      // Rejoindre via code
      const codeInput = document.createElement('input');
      codeInput.id = 'shareCode';
      codeInput.className = 'input mb-2';
      codeInput.placeholder = 'Code de partage';
      shareFields.appendChild(createLabel('Code', 'shareCode'));
      shareFields.appendChild(codeInput);
    }
  }

  function createLabel(text, forId) {
        const label = document.createElement('label');
        label.className = 'note';
        label.htmlFor = forId;
        label.textContent = text;
        return label;
      }function renderFields() {
      shareFields.innerHTML = '';
      if (shareAction.value === 'share') {
        const agendaSelect = document.createElement('select');
        agendaSelect.id = 'shareAgendaSelect';
        agendaSelect.className = 'input mb-2';
    
        // Utiliser le tableau global `agendas` chargé par chargerAgendas()
        agendas.forEach(a => {
          const option = document.createElement('option');
          option.value = a._id;
          option.textContent = a.nom;
          agendaSelect.appendChild(option);
        });
    
        shareFields.appendChild(createLabel('Agenda', 'shareAgendaSelect'));
        shareFields.appendChild(agendaSelect);
    
        // Droits
        const rightsSelect = document.createElement('select');
        rightsSelect.id = 'shareRights';
        rightsSelect.className = 'input mb-2';
        ['lecture', 'modification'].forEach(r => {
          const option = document.createElement('option');
          option.value = r;
          option.textContent = r;
          rightsSelect.appendChild(option);
        });
        shareFields.appendChild(createLabel('Droits', 'shareRights'));
        shareFields.appendChild(rightsSelect);
    
      } else {
        const codeInput = document.createElement('input');
        codeInput.id = 'shareCode';
        codeInput.className = 'input mb-2';
        codeInput.placeholder = 'Code de partage';
        shareFields.appendChild(createLabel('Code', 'shareCode'));
        shareFields.appendChild(codeInput);
      }
    }
    

    shareBtn.addEventListener('click', openModal);
    shareCancel.addEventListener('click', closeModal);
    shareAction.addEventListener('change', renderFields);

    shareSubmit.addEventListener('click', async () => {
    try {
      if (shareAction.value === 'share') {
        const agendaId = document.getElementById('shareAgendaSelect').value;
        const rights = document.getElementById('shareRights').value;

        const res = await fetch(`/api/agenda/${agendaId}/share`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ rights }),
        });

        if (!res.ok) throw new Error(await res.text());
        const data = await res.json();
        alert(`Agenda partagé !\nCode de partage : ${data.code}`);
      } else {
        const code = document.getElementById('shareCode').value.trim();

        const res = await fetch(`/api/agenda/join`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ code }),
        });

        if (!res.ok) throw new Error(await res.text());
        const data = await res.json();
        alert(`Vous avez rejoint l'agenda ${data.agendaId} avec droits : ${data.rights}`);
        window.location.reload();
      }
    } catch (err) {
      console.error(err);
      alert('Erreur: ' + err.message);
    }
    closeModal();
});
}

async function fetchUserAgendas() {
  try {
    const res = await fetch('/api/agenda/my-agendas', { credentials: 'include' });
    if (!res.ok) throw new Error(await res.text());
    return res.json(); // renvoie [{ _id, nom }, ...]
  } catch (err) {
    console.error(err);
    alert('Impossible de charger vos agendas');
    return [];
  }
}

document.addEventListener('DOMContentLoaded', initAgendaSharing);
