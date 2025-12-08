/**
 * Agenda routes
 * - GET  /api/agenda/               -> list user's agendas
 * - POST /api/agenda/               -> create agenda
 * - PATCH/DELETE /api/agenda/:agendaId -> rename / delete agenda
 * - POST  /api/agenda/:agendaId/rdv  -> create RDV
 * - PUT   /api/agenda/:agendaId/rdv/:rdvId -> update/move RDV
 * - DELETE /api/agenda/:agendaId/rdv/:rdvId -> delete single RDV from one agenda
 * - POST /api/agenda/rdv/delete     -> delete RDV copies across multiple agendas
 */

const express = require("express");
const mongoose = require("mongoose");
const router = express.Router();

const Agenda = require("../model/Agenda");
const isAuthenticated = require("../middleware/auth");
const generateRecurrences = require("../utils/generateRecurrences");

// rdv recurrence types: none, weekly, monthly, yearly
router.get("/", isAuthenticated, async (req, res) => {
  const userId = new mongoose.Types.ObjectId(req.session.userId);
  const agendas = await Agenda.find({
    $or: [
      { userId },               // agendas possédés
      { 'sharedWith.userId': userId }  // agendas partagés avec lui
    ]
  });

  // Semaine demandée par le front (param ?week=YYYY-MM-DD)
  const weekParam = req.query.week;
  const startOfWeek = weekParam ? new Date(weekParam) : new Date();

  // Forcer lundi 00:00
  const day = startOfWeek.getDay(); // 0 = dimanche, 1 = lundi, ...
  const monday = new Date(startOfWeek);
  monday.setDate(startOfWeek.getDate() - (day === 0 ? 6 : day - 1));
  monday.setHours(0, 0, 0, 0);

  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  sunday.setHours(23, 59, 59, 999);

  const result = agendas.map((agenda) => {
    const a = agenda.toObject();

    const generated = generateRecurrences(agenda.rdvs, monday, sunday);

    a.rdvs = [...agenda.rdvs, ...generated];
    a.isShared = agenda.userId.toString() !== req.session.userId.toString();
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

router.get("/my-agendas", isAuthenticated, async (req, res) => {
  try {
    const agendas = await Agenda.find({
      $or: [
        { userId: req.session.userId },
        { "sharedWith.userId": req.session.userId }
      ]
    });

    const result = agendas.map(a => ({
      _id: a._id,
      nom: a.nom,
      isShared: a.userId.toString() !== req.session.userId.toString()
    }));

    res.json(result);
  } catch (err) {
    console.error(err);
    res.status(500).send("Erreur serveur");
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
  const { titre, date, description, startTime, endTime, recurrence } = req.body;
  if (!titre || !startTime || !endTime) {
    return res.status(400).json({ message: "Champs manquants" });
  }

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
    startTime,
    endTime,
    recurrence: recurrence || "none",
  });
  await agenda.save();

  res.status(201).json(agenda);
});

// --- SUPPRESSION D'UN RDV OU D'UNE OCCURRENCE ---
router.delete("/:agendaId/rdv/:rdvId", isAuthenticated, async (req, res) => {
  try {
    const { agendaId, rdvId } = req.params;

    const agenda = await Agenda.findOne({
      _id: agendaId,
      userId: req.session.userId,
    });
    if (!agenda) return res.status(404).json({ message: "Agenda introuvable" });

    const rdv = agenda.rdvs.id(rdvId);
    if (!rdv) return res.status(404).json({ message: "RDV introuvable" });

    // suppression complète du RDV (recurrence incluse)
    agenda.rdvs = agenda.rdvs.filter((item) => String(item._id) !== rdvId);
    await agenda.save();

    return res.json({ message: "RDV supprimé" });
  } catch (err) {
    console.error("DELETE RDV error:", err);
    return res.status(500).json({ message: "Erreur interne suppression RDV" });
  }
});

// delete RDV copies across multiple agendas (by sharedId or rdvId)
router.post("/rdv/delete", isAuthenticated, async (req, res) => {
  try {
    const { agendaIds, sharedId, rdvId } = req.body;
    if (!Array.isArray(agendaIds) || agendaIds.length === 0)
      return res.status(400).json({ message: "agendaIds requis" });

    for (const aid of agendaIds) {
      const agenda = await Agenda.findOne({
        _id: aid,
        userId: req.session.userId,
      });
      if (!agenda) continue;

      if (sharedId) {
        agenda.rdvs = agenda.rdvs.filter((r) => {
          if (!r.sharedId) return true;
          return r.sharedId.toString() !== String(sharedId);
        });
      } else if (rdvId) {
        agenda.rdvs = agenda.rdvs.filter(
          (r) => String(r._id) !== String(rdvId)
        );
      }

      await agenda.save();
    }

    res.json({ message: "RDV(s) supprimé(s)" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: err.message });
  }
});

// --- MODIFICATION D'UN RDV ---
router.put("/:agendaId/rdv/:rdvId", isAuthenticated, async (req, res) => {
  const { agendaId, rdvId } = req.params;
  const {
    titre,
    description,
    date,
    startTime,
    endTime,
    recurrence,
    agendaId: nextAgendaId,
  } = req.body;

  const sourceAgenda = await Agenda.findOne({
    _id: agendaId,
    userId: req.session.userId,
  });
  if (!sourceAgenda)
    return res.status(404).json({ message: "Agenda introuvable" });

  const rdv = sourceAgenda.rdvs.id(rdvId);
  if (!rdv) return res.status(404).json({ message: "RDV introuvable" });

  const targetAgendaId = nextAgendaId || agendaId;
  const updatedRdv = {
    titre: titre !== undefined ? titre : rdv.titre,
    description: description !== undefined ? description : rdv.description,
    date: date !== undefined ? date : rdv.date,
    startTime: startTime !== undefined ? startTime : rdv.startTime,
    endTime: endTime !== undefined ? endTime : rdv.endTime,
    recurrence: recurrence !== undefined ? recurrence : rdv.recurrence,
  };

  if (targetAgendaId === agendaId) {
    Object.assign(rdv, updatedRdv);
    await sourceAgenda.save();
    return res.json({ message: "Rendez-vous modifié" });
  }

  const destinationAgenda = await Agenda.findOne({
    _id: targetAgendaId,
    userId: req.session.userId,
  });
  if (!destinationAgenda)
    return res.status(404).json({ message: "Nouvel agenda introuvable" });

  sourceAgenda.rdvs = sourceAgenda.rdvs.filter(
    (item) => String(item._id) !== String(rdvId)
  );
  await sourceAgenda.save();

  destinationAgenda.rdvs.push(updatedRdv);
  await destinationAgenda.save();

  res.json({ message: "Rendez-vous déplacé" });
});

module.exports = router;
