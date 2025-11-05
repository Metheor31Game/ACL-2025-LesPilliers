const mongoose = require("mongoose");
const rdvSchema = require("./Rdv");

const agendaSchema = new mongoose.Schema({
  nom: { type: String, required: true },
  rdvs: [rdvSchema], // liste de rendez-vous
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
});

module.exports = mongoose.model("Agenda", agendaSchema);
