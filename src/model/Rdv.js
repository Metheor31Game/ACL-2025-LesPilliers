const mongoose = require("mongoose");

const rdvSchema = new mongoose.Schema({
  titre: { type: String, required: true },
  description: { type: String },

  // Ajout pour RDV permanents
  recurrence: {
    type: String,
    enum: ["none", "weekly", "monthly", "yearly"],
    default: "none",
  },
  startTime: { type: Date, required: true },
  endTime: { type: Date, required: true },
});

module.exports = rdvSchema;
