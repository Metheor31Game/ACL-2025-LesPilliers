const express = require("express");
const Agenda = require("../model/Agenda");
const router = express.Router();

/** IMPORTER UN AGENDA DEPUIS UN JSON */
router.post("/:agendaId/import", async (req, res) => {
  try {
    const { agendaId } = req.params;
    const { rdvs } = req.body;

    const agenda = await Agenda.findOne({
      _id: agendaId,
      userId: req.session.userId,
    });

    if (!agenda) return res.status(404).json({ message: "Agenda introuvable" });

    if (!Array.isArray(rdvs)) {
      return res.status(400).json({ message: "Format JSON invalide" });
    }

    for (const r of rdvs) {

      // Validation minimale
      if (!r.titre || !r.startTime || !r.endTime) continue;

      agenda.rdvs.push({
        titre: r.titre,
        description: r.description || "",
        startTime: new Date(r.startTime),
        endTime: new Date(r.endTime),
        recurrence: r.recurrence || "none",
        exceptions: Array.isArray(r.exceptions)
          ? r.exceptions.map(d => new Date(d))
          : [],
      });
    }

    await agenda.save();

    res.json({ message: "Agenda importé avec succès" });

  } catch (err) {
    console.error("IMPORT ERROR:", err);
    res.status(500).json({ message: "Erreur import" });
  }
});

module.exports = router;
