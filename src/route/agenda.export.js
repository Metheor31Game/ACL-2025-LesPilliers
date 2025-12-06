const express = require("express");
const Agenda = require("../model/Agenda");
const router = express.Router();

/** EXPORTER UN AGENDA EN JSON COMPLET */
router.get("/:agendaId/export", async (req, res) => {
  try {
    const { agendaId } = req.params;

    const agenda = await Agenda.findOne({
      _id: agendaId,
      userId: req.session.userId,
    });

    if (!agenda) {
      return res.status(404).json({ message: "Agenda introuvable" });
    }

    const data = {
      name: agenda.nom,
      rdvs: agenda.rdvs.map(r => ({
        id: r._id.toString(),
        titre: r.titre,
        description: r.description,
        startTime: r.startTime?.toISOString(),
        endTime: r.endTime?.toISOString(),
        recurrence: r.recurrence,
        exceptions: (r.exceptions || []).map(d => d.toISOString())
      }))
    };

    res.setHeader("Content-Disposition", `attachment; filename="${agenda.nom}.json"`);
    res.setHeader("Content-Type", "application/json");
    res.send(JSON.stringify(data, null, 2));

  } catch (err) {
    console.error("EXPORT ERROR:", err);
    res.status(500).json({ message: "Erreur export" });
  }
});

module.exports = router;
