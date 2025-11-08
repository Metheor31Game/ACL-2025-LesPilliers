const mongoose = require("mongoose");

const rdvSchema = new mongoose.Schema({
  titre: { type: String, required: true },
  date: { type: Date, required: true },
  description: { type: String },

  // === Gestion des rendez-vous récurrents ===
  recurrence: {
    freq: {
      type: String,
      enum: ["AUCUNE", "JOUR", "SEMAINE", "MOIS"], // types de récurrence
      default: "AUCUNE"
    },
    interval: { type: Number, default: 1 },
    count: { type: Number, default: null },
    until: { type: Date, default: null }
  }
});

module.exports = rdvSchema;
