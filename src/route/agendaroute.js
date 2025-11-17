const express = require("express");
const router = express.Router();
const Agenda = require("../model/Agenda");
const isAuthenticated = require("../middleware/auth");

router.get("/", isAuthenticated, async (req, res) => {
  const agendas = await Agenda.find({ userId: req.session.userId });
  res.json(agendas);
});

router.post("/", isAuthenticated, async (req, res) => {
  const { nom } = req.body;
  if (!nom) return res.status(400).json({ message: "Nom obligatoire" });

  const agenda = new Agenda({ nom, rdvs: [], userId: req.session.userId });
  await agenda.save();
  res.status(201).json(agenda);
});

router.post("/:agendaId/rdv", isAuthenticated, async (req, res) => {
  const { titre, description, startTime, endTime } = req.body;

  if (!titre || !startTime || !endTime) {
    return res.status(400).json({ message: "Champs manquants" });
  }

  const agenda = await Agenda.findOne({
    _id: req.params.agendaId,
    userId: req.session.userId,
  });

  if (!agenda) return res.status(404).json({ message: "Agenda introuvable" });

  agenda.rdvs.push({ titre, startTime, endTime, description });
  await agenda.save();

  res.status(201).json(agenda);
});

router.delete("/:agendaId/rdv/:rdvId", isAuthenticated, async (req, res) => {
  const { agendaId, rdvId } = req.params;
  const agenda = await Agenda.findOne({
    _id: agendaId,
    userId: req.session.userId,
  });

  if (!agenda) return res.status(404).json({ message: "Agenda introuvable" });

  agenda.rdvs = agenda.rdvs.filter((r) => r._id.toString() !== rdvId);
  await agenda.save();

  res.json({ message: "Rendez-vous supprimé" });
});

// --- MODIFICATION D'UN RDV ---
router.put("/:agendaId/rdv/:rdvId", isAuthenticated, async (req, res) => {
  const { agendaId, rdvId } = req.params;
  const { titre, description, startTime, endTime } = req.body;

  const agenda = await Agenda.findOne({
    _id: agendaId,
    userId: req.session.userId,
  });
  if (!agenda) return res.status(404).json({ message: "Agenda introuvable" });

  const rdv = agenda.rdvs.id(rdvId);
  if (!rdv) return res.status(404).json({ message: "RDV introuvable" });

  if (titre) rdv.titre = titre;
  if (description) rdv.description = description;
  if (startTime) rdv.startTime = startTime;
  if (endTime) rdv.endTime = endTime;

  await agenda.save();
  res.json({ message: "Rendez-vous modifié" });
});

module.exports = router;
