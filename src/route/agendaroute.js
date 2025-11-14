const express = require("express");
const router = express.Router();
const Agenda = require("../model/Agenda");
const isAuthenticated = require("../middleware/auth");

router.get("/", isAuthenticated, async (req, res) => {
  const agendas = await Agenda.find({ userId: req.session.userId });

  // Récupération de la semaine envoyée par le frontend
  const weekParam = req.query.week;
  const startOfWeek = weekParam ? new Date(weekParam) : new Date();

  // Forcer lundi 00:00
  const day = startOfWeek.getDay();
  const monday = new Date(startOfWeek);
  monday.setDate(startOfWeek.getDate() - (day === 0 ? 6 : day - 1));
  monday.setHours(0, 0, 0, 0);

  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  sunday.setHours(23, 59, 59, 999);

  const result = agendas.map((agenda) => {
    const a = agenda.toObject();
    const generated = [];

    for (const rdv of agenda.rdvs) {
      const original = new Date(rdv.date);

      /* === RDV HEBDOMADAIRE === */
      if (rdv.recurrence === "weekly") {

        const originalDow = (original.getDay() + 6) % 7;

        const clone = new Date(monday);
        clone.setDate(monday.getDate() + originalDow);
        clone.setHours(original.getHours(), original.getMinutes(), 0, 0);

        if (clone >= monday && clone <= sunday) {
          generated.push({
            ...rdv.toObject(),
            date: clone,
            _id: rdv._id,
          });
        }
      }

    /* === RDV MENSUEL === */
    else if (rdv.recurrence === "monthly") {

      // On génère le RDV si le jour du mois correspond
      const clone = new Date(monday);
      clone.setDate(original.getDate());
      clone.setHours(original.getHours(), original.getMinutes(), 0, 0);

      // Et on remet le bon mois/année de la semaine affichée
      clone.setMonth(monday.getMonth());
      clone.setFullYear(monday.getFullYear());

      if (clone >= monday && clone <= sunday) {
        generated.push({
          ...rdv.toObject(),
          date: clone,
          _id: rdv._id,
        });
      }
    }

    /* === RDV ANNUEL === */
    else if (rdv.recurrence === "yearly") {

      const clone = new Date(
        monday.getFullYear(),
        original.getMonth(),
        original.getDate(),
        original.getHours(),
        original.getMinutes(),
        0,
        0
      );

      if (clone >= monday && clone <= sunday) {
        generated.push({
          ...rdv.toObject(),
          date: clone,
          _id: rdv._id,
        });
      }
    }
  }

    a.rdvs = [...agenda.rdvs, ...generated];
    return a;
  });

  res.json(result);
});



router.post("/", isAuthenticated, async (req, res) => {
  const { nom } = req.body;
  if (!nom) return res.status(400).json({ message: "Nom obligatoire" });

  const agenda = new Agenda({ nom, rdvs: [], userId: req.session.userId });
  await agenda.save();
  res.status(201).json(agenda);
});

// --- AJOUT D'UN RDV perm ---
router.post("/:agendaId/rdv", isAuthenticated, async (req, res) => {
  // modification pour RDV perm
  const { titre, date, description, recurrence } = req.body;
  const agenda = await Agenda.findOne({
    _id: req.params.agendaId,
    userId: req.session.userId,
  });

  if (!agenda) return res.status(404).json({ message: "Agenda introuvable" });

  /* modification pour RDV perm */
  agenda.rdvs.push({
  titre,
  date,
  description,
  recurrence: recurrence || "none",
});

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
