const mongoose = require("mongoose");

const rdvSchema = new mongoose.Schema({
  titre: { type: String, required: true },
  description: { type: String },

  // Ajout pour RDV permanents
  recurrence: {
    type: String,
    enum: ["none", "daily","weekly", "monthly", "yearly"],
    default: "none",
  },
  startTime: { type: Date, required: true },
  endTime: { type: Date, required: true },

  // NOUVEAU : permet de supprimer une SEULE occurrence d’un RDV récurrent
  // Exemple : exceptions = ["2025-12-22T10:00:00.000Z"]
  exceptions: {
    type: [Date],
    default: [],
  }
});

module.exports = rdvSchema;
