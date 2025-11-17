const mongoose = require("mongoose");

const rdvSchema = new mongoose.Schema({
  titre: { type: String, required: true },
  date: { type: Date, required: true },
  description: { type: String },
  sharedId: { type: mongoose.Schema.Types.ObjectId, default: null },
});

module.exports = rdvSchema; // Export en sous-schéma, pas un modèle complet
