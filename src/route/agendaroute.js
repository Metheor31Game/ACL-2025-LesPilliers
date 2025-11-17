/**
 * Agenda routes
 * - GET  /api/agenda/               -> list user's agendas
 * - POST /api/agenda/               -> create agenda
 * - PATCH/DELETE /api/agenda/:agendaId -> rename / delete agenda
 * - POST  /api/agenda/:agendaId/rdv  -> create RDV (supports multi-agenda via agendaIds)
 * - PATCH /api/agenda/:agendaId/rdv/:rdvId -> update RDV (supports sync across agendas)
 * - DELETE /api/agenda/:agendaId/rdv/:rdvId -> delete single RDV from one agenda
 * - POST /api/agenda/rdv/delete     -> delete RDV copies across multiple agendas
 */

const express = require("express");
const mongoose = require("mongoose");
const router = express.Router();

const Agenda = require("../model/Agenda");
const isAuthenticated = require("../middleware/auth");

// list agendas for current user
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
      } else if (rdv.recurrence === "monthly") {

      /* === RDV MENSUEL === */
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
      } else if (rdv.recurrence === "yearly") {

      /* === RDV ANNUEL === */
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

// create a new agenda
router.post("/", isAuthenticated, async (req, res) => {
  try {
    const { nom } = req.body;
    const agenda = new Agenda({
      nom: nom || "Nouvel agenda",
      userId: req.session.userId,
      rdvs: [],
    });
    await agenda.save();
    res.status(201).json(agenda);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// rename an agenda
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

// delete an agenda
router.delete("/:agendaId", isAuthenticated, async (req, res) => {
  try {
    const agenda = await Agenda.findOneAndDelete({
      _id: req.params.agendaId,
      userId: req.session.userId,
    });
    if (!agenda) return res.status(404).json({ message: "Agenda introuvable" });
    res.json({ message: "Agenda supprimé" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
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

  const rdv = agenda.rdvs.id(req.params.rdvId);
  if (!rdv) return res.status(404).json({ message: "RDV introuvable" });

  if (titre !== undefined) rdv.titre = titre;
  if (date !== undefined) rdv.date = date;
  if (description !== undefined) rdv.description = description;

  // ensure sharedId exists for synchronization
  let sharedId = rdv.sharedId;
  if (!sharedId) {
    sharedId = new mongoose.Types.ObjectId();
    rdv.sharedId = sharedId;
  }

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

// --- U3 EXPORTER un agenda ---
router.get("/:agendaId/export", isAuthenticated, async (req, res) => {
  const { agendaId } = req.params;

  const agenda = await Agenda.findOne({
    _id: agendaId,
    userId: req.session.userId,
  });

  if (!agenda) {
    return res.status(404).json({ message: "Agenda introuvable" });
  }

  const exportData = {
    name: agenda.nom,
    rdvs: agenda.rdvs.map((r) => ({
      titre: r.titre,
      description: r.description,
      date: r.date,
      recurrence: r.recurrence,
    })),
  };

  res.setHeader(
    "Content-Disposition",
    `attachment; filename="${agenda.nom}.json"`
  );
  res.setHeader("Content-Type", "application/json");

  res.send(JSON.stringify(exportData, null, 2));
});

// --- U3 IMPORTER un agenda ---
router.post("/:agendaId/import", isAuthenticated, async (req, res) => {
  const { agendaId } = req.params;
  const { rdvs } = req.body;

  const agenda = await Agenda.findOne({
    _id: agendaId,
    userId: req.session.userId,
  });

  if (!agenda) {
    return res.status(404).json({ message: "Agenda introuvable" });
  }

  if (!Array.isArray(rdvs)) {
    return res.status(400).json({ message: "Format d'import invalide" });
  }

  // Ajout des RDV importés
  for (const r of rdvs) {
    agenda.rdvs.push({
      titre: r.titre,
      description: r.description || "",
      date: r.date,
      recurrence: r.recurrence || "none",
    });
  }

  await agenda.save();
  res.json({ message: "Agenda importé avec succès" });
});

module.exports = router;
