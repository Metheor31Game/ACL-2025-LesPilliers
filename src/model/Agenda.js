const mongoose = require("mongoose");
const rdvSchema = require("./Rdv");

const agendaSchema = new mongoose.Schema({
  nom: { type: String, required: true },
  rdvs: [rdvSchema],
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },

  sharedWith: {
    type: [
      {
        userId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
        rights: { type: String, enum: ["lecture", "modification"], required: true },
        code: { type: String },
      }
    ],
    default: []
  }
});


module.exports = mongoose.model("Agenda", agendaSchema);
