const mongoose = require("mongoose");

const rdvSchema = new mongoose.Schema({
  titre: { type: String, required: true },
  date: { type: Date, required: true },
  description: { type: String },
});

module.exports = rdvSchema; // Export en sous-schéma, pas un modèle complet
