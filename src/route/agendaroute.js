const express = require("express");
const router = express.Router();
const Agenda = require("../model/Agenda");
const isAuthenticated = require("../middleware/auth");

/* === Récupération de tous les agendas de l’utilisateur === */
router.get("/", isAuthenticated, async (req, res) => {
  const agendas = await Agenda.find({ userId: req.session.userId });
  res.json(agendas);
});

/* === Création d’un nouvel agenda === */
router.post("/", isAuthenticated, async (req, res) => {
  const { nom } = req.body;
  if (!nom) return res.status(400).json({ message: "Nom obligatoire" });

  const agenda = new Agenda({ nom, rdvs: [], userId: req.session.userId });
  await agenda.save();
  res.status(201).json(agenda);
});

/* === Ajout d’un rendez-vous (avec récurrence possible) === */
router.post("/:agendaId/rdv", isAuthenticated, async (req, res) => {
  const { titre, description, date, recurrence } = req.body;

  const agenda = await Agenda.findOne({
    _id: req.params.agendaId,
    userId: req.session.userId,
  });

  if (!agenda) return res.status(404).json({ message: "Agenda introuvable" });

  agenda.rdvs.push({
    titre,
    description,
    date,
    recurrence: recurrence || { freq: "AUCUNE" },
  });

  await agenda.save();
  res.status(201).json(agenda);
});

/* === Suppression d’un rendez-vous === */
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

/* === Modification d’un rendez-vous === */
router.put("/:agendaId/rdv/:rdvId", isAuthenticated, async (req, res) => {
  const { agendaId, rdvId } = req.params;
  const { titre, description, date, recurrence } = req.body;

  const agenda = await Agenda.findOne({
    _id: agendaId,
    userId: req.session.userId,
  });

  if (!agenda) return res.status(404).json({ message: "Agenda introuvable" });

  const rdv = agenda.rdvs.id(rdvId);
  if (!rdv) return res.status(404).json({ message: "RDV introuvable" });

  if (titre) rdv.titre = titre;
  if (description) rdv.description = description;
  if (date) rdv.date = date;
  if (recurrence) rdv.recurrence = recurrence;

  await agenda.save();
  res.json({ message: "Rendez-vous modifié" });
});

module.exports = router;
