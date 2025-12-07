const express = require('express');
const router = express.Router();
const Agenda = require('../models/Agenda');
const User = require('../models/User');

// Partager un agenda
router.post('/:agendaId/share', async (req, res) => {
  const { userId, rights } = req.body;
  const agenda = await Agenda.findById(req.params.agendaId);
  if (!agenda) return res.status(404).send('Agenda non trouvé');

  // Génère un code unique pour partage
  const code = Math.random().toString(36).substring(2, 8).toUpperCase();

  agenda.sharedWith.push({ userId, rights, code });
  await agenda.save();
  res.json({ code });
});

// Rejoindre via code
router.post('/join', async (req, res) => {
  const { code, userId } = req.body;
  const agenda = await Agenda.findOne({ 'sharedWith.code': code });
  if (!agenda) return res.status(404).send('Code invalide');

  // Ajoute l'utilisateur au partage s'il n'est pas déjà présent
  const existing = agenda.sharedWith.find(e => e.userId.toString() === userId);
  if (!existing) {
    const entry = agenda.sharedWith.find(e => e.code === code);
    agenda.sharedWith.push({ userId, rights: entry.rights });
    await agenda.save();
  }
  res.json({ agendaId: agenda._id, rights: entry.rights });
});

module.exports = router;
