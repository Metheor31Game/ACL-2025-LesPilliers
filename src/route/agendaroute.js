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
  const { titre, date, description } = req.body;
  const agenda = await Agenda.findOne({
    _id: req.params.agendaId,
    userId: req.session.userId,
  });

  if (!agenda) return res.status(404).json({ message: "Agenda introuvable" });

  agenda.rdvs.push({ titre, date, description });
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
  const { titre, description, date } = req.body;

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

  await agenda.save();
  res.json({ message: "Rendez-vous modifié" });
});

module.exports = router;

// renommer un agenda
router.patch("/:agendaId", isAuthenticated, async (req, res) => {
  const { nom } = req.body;
  try {
    const agenda = await Agenda.findOneAndUpdate(
      { _id: req.params.agendaId, userId: req.session.userId },
      { $set: { nom } },
      { new: true }
    );
    if (!agenda) return res.status(404).json({ message: "Agenda introuvable" });
    res.json(agenda);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// supprimer un agenda (et ses rdvs intégrés)
router.delete("/:agendaId", isAuthenticated, async (req, res) => {
  try {
    const agenda = await Agenda.findOneAndDelete({ _id: req.params.agendaId, userId: req.session.userId });
    if (!agenda) return res.status(404).json({ message: "Agenda introuvable" });
    res.json({ message: "Agenda supprimé" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// modifier un RDV (dans le sous-document rdvs)
router.patch("/:agendaId/rdv/:rdvId", isAuthenticated, async (req, res) => {
  const { titre, description, date } = req.body;
  try {
    const agenda = await Agenda.findOne({ _id: req.params.agendaId, userId: req.session.userId });
    if (!agenda) return res.status(404).json({ message: "Agenda introuvable" });

    const rdv = agenda.rdvs.id(req.params.rdvId);
    if (!rdv) return res.status(404).json({ message: "RDV introuvable" });

    if (titre !== undefined) rdv.titre = titre;
    if (description !== undefined) rdv.description = description;
    if (date !== undefined) rdv.date = date;

    await agenda.save();
    res.json(rdv);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// supprimer un RDV
router.delete("/:agendaId/rdv/:rdvId", isAuthenticated, async (req, res) => {
  try {
    const agenda = await Agenda.findOne({ _id: req.params.agendaId, userId: req.session.userId });
    if (!agenda) return res.status(404).json({ message: "Agenda introuvable" });
    agenda.rdvs = agenda.rdvs.filter(r => r._id.toString() !== req.params.rdvId);
    await agenda.save();
    res.json({ message: "RDV supprimé" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});
