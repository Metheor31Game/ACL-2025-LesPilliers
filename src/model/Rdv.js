const mongoose = require("mongoose");

const rdvSchema = new mongoose.Schema({
  titre: { type: String, required: true },
  description: { type: String },
  startTime: { type: Date, required: true },
  endTime: { type: Date, required: true }
});

module.exports = rdvSchema; // Export en sous-schéma, pas un modèle complet
