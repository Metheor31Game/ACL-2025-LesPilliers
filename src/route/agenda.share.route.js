// src/route/agenda.share.route.js
const express = require('express');
const router = express.Router();
const Agenda = require('../model/Agenda');
const authMiddleware = require('../middleware/auth');

// Partager un agenda via code
router.post('/:agendaId/share', authMiddleware, async (req, res) => {
  const { rights } = req.body;
  try {
    const agenda = await Agenda.findById(req.params.agendaId);
    if (!agenda) return res.status(404).send('Agenda non trouvé');

    // Vérifie que c'est bien le propriétaire
    if (agenda.userId.toString() !== req.session.userId.toString())
      return res.status(403).send("Pas autorisé");

    // Génère un code de partage
    const code = Math.random().toString(36).substring(2, 8).toUpperCase();

    // On ajoute le code dans sharedWith, sans userId
    agenda.sharedWith.push({ rights, code });
    await agenda.save();

    res.json({ code });
  } catch (err) {
    console.error(err);
    res.status(500).send('Erreur serveur');
  }
});

// Rejoindre un agenda via code
router.post('/join', authMiddleware, async (req, res) => {
  const { code } = req.body;
  try {
    const agenda = await Agenda.findOne({ 'sharedWith.code': code });
    if (!agenda) return res.status(404).send('Code invalide');

    const entry = agenda.sharedWith.find(e => e.code === code);

    // Vérifie si l'utilisateur n'est pas déjà ajouté
    const alreadyJoined = agenda.sharedWith.find(
      e => e.userId?.toString() === req.session.userId.toString()
    );

    if (!alreadyJoined) {
      agenda.sharedWith.push({ userId: req.session.userId, rights: entry.rights });
      await agenda.save();
    }

    res.json({ agendaId: agenda._id, rights: entry.rights });
  } catch (err) {
    console.error(err);
    res.status(500).send('Erreur serveur');
  }
});

module.exports = router;
  