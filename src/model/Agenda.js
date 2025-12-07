const mongoose = require("mongoose");
const rdvSchema = require("./Rdv");

const agendaSchema = new mongoose.Schema({
  nom: { type: String, required: true },
  rdvs: [rdvSchema], // liste de rendez-vous
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  sharedWith: [
    {
      userId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
      rights: { type: String, enum: ["lecture", "modification"], required: true },
      code: { type: String }, // code de partage temporaire
    },
  ],
   default: [],
});

module.exports = mongoose.model("Agenda", agendaSchema);
