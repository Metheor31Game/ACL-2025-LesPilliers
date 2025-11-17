const mongoose = require("mongoose");

const rdvSchema = new mongoose.Schema({
  titre: { type: String, required: true },
  date: { type: Date, required: true },
  description: { type: String },

  // Ajout pour RDV permanents
  recurrence: {
    type: String,
    enum: ["none", "weekly", "monthly", "yearly"],
    default: "none",
  },
});

module.exports = rdvSchema;
