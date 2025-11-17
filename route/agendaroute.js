/**
 * Agenda routes (root-level route folder)
 */

const express = require("express");
const mongoose = require("mongoose");
const router = express.Router();

const Agenda = require("../src/model/Agenda") || require("../model/Agenda");
const isAuthenticated =
  require("../src/middleware/auth") || require("../middleware/auth");

// list agendas for current user
router.get("/", isAuthenticated, async (req, res) => {
  try {
    const agendas = await Agenda.find({ userId: req.session.userId });
    res.json(agendas);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
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

// create a RDV in an agenda (optionally propagate to multiple agendas)
router.post("/:agendaId/rdv", isAuthenticated, async (req, res) => {
  try {
    const { titre, date, description, agendaIds } = req.body;
    const agenda = await Agenda.findOne({
      _id: req.params.agendaId,
      userId: req.session.userId,
    });
    if (!agenda) return res.status(404).json({ message: "Agenda introuvable" });

    const sharedId = new mongoose.Types.ObjectId();
    const rdv = { titre, date, description, sharedId };
    agenda.rdvs.push(rdv);
    await agenda.save();

    if (Array.isArray(agendaIds) && agendaIds.length > 0) {
      const uniqueIds = [...new Set(agendaIds.map((x) => x.toString()))];
      for (const aid of uniqueIds) {
        if (aid === req.params.agendaId) continue;
        const a = await Agenda.findOne({
          _id: aid,
          userId: req.session.userId,
        });
        if (!a) continue;
        a.rdvs.push({ titre, date, description, sharedId });
        await a.save();
      }
    }

    const created = agenda.rdvs[agenda.rdvs.length - 1];
    res.status(201).json(created);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// update a RDV in an agenda and optionally synchronize presence across agendas
router.patch("/:agendaId/rdv/:rdvId", isAuthenticated, async (req, res) => {
  try {
    const { titre, date, description, agendaIds } = req.body;
    const agenda = await Agenda.findOne({
      _id: req.params.agendaId,
      userId: req.session.userId,
    });
    if (!agenda) return res.status(404).json({ message: "Agenda introuvable" });

    const rdv = agenda.rdvs.id(req.params.rdvId);
    if (!rdv) return res.status(404).json({ message: "RDV introuvable" });

    if (titre !== undefined) rdv.titre = titre;
    if (date !== undefined) rdv.date = date;
    if (description !== undefined) rdv.description = description;

    let sharedId = rdv.sharedId;
    if (!sharedId) {
      sharedId = new mongoose.Types.ObjectId();
      rdv.sharedId = sharedId;
    }

    await agenda.save();

    if (Array.isArray(agendaIds)) {
      const desired = new Set(agendaIds.map((x) => x.toString()));
      const allUserAgendas = await Agenda.find({ userId: req.session.userId });
      for (const a of allUserAgendas) {
        const has = a.rdvs.some(
          (r) => r.sharedId && r.sharedId.toString() === sharedId.toString()
        );
        const should = desired.has(a._id.toString());
        if (has && !should) {
          a.rdvs = a.rdvs.filter(
            (r) =>
              !(r.sharedId && r.sharedId.toString() === sharedId.toString())
          );
          await a.save();
        } else if (!has && should) {
          a.rdvs.push({
            titre: rdv.titre,
            date: rdv.date,
            description: rdv.description,
            sharedId,
          });
          await a.save();
        } else if (has && should) {
          let updated = false;
          for (const r of a.rdvs) {
            if (r.sharedId && r.sharedId.toString() === sharedId.toString()) {
              r.titre = rdv.titre;
              r.date = rdv.date;
              r.description = rdv.description;
              updated = true;
            }
          }
          if (updated) await a.save();
        }
      }
    }

    res.json(rdv);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// delete RDV copies across multiple agendas
router.post("/rdv/delete", isAuthenticated, async (req, res) => {
  try {
    const { agendaIds, sharedId, rdvId } = req.body;
    if (!Array.isArray(agendaIds) || agendaIds.length === 0) {
      return res.status(400).json({ message: "agendaIds requis" });
    }
    let removed = 0;
    for (const aid of agendaIds) {
      try {
        const a = await Agenda.findOne({
          _id: aid,
          userId: req.session.userId,
        });
        if (!a) continue;
        const before = a.rdvs.length;
        if (sharedId) {
          a.rdvs = a.rdvs.filter(
            (r) => !(r.sharedId && r.sharedId.toString() === sharedId)
          );
        } else if (rdvId) {
          a.rdvs = a.rdvs.filter((r) => r._id.toString() !== rdvId);
        }
        if (a.rdvs.length !== before) {
          removed += before - a.rdvs.length;
          await a.save();
        }
      } catch (e) {
        continue;
      }
    }
    res.json({ message: "Suppression effectuée", removed });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// delete single RDV from one agenda
router.delete("/:agendaId/rdv/:rdvId", isAuthenticated, async (req, res) => {
  try {
    const agenda = await Agenda.findOne({
      _id: req.params.agendaId,
      userId: req.session.userId,
    });
    if (!agenda) return res.status(404).json({ message: "Agenda introuvable" });
    agenda.rdvs = agenda.rdvs.filter(
      (r) => r._id.toString() !== req.params.rdvId
    );
    await agenda.save();
    res.json({ message: "RDV supprimé" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
