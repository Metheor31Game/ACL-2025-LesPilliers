const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const bodyParser = require("body-parser");
const session = require("express-session");
const path = require("path"); // Pour gérer les chemins de fichiers

// Routes
const authRoutes = require("./route/authroute");
const testRoutes = require("./route/testroute");
const agendaRoutes = require("./route/agendaroute");
const agendaExportRoutes = require("./src/route/agenda.export");
const agendaImportRoutes = require("./src/route/agenda.import");

const app = express();
const PORT = 3000;

// Middlewares globaux
app.use(cors());
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, "../public"))); 

// Sessions AVANT les routes
app.use(
  session({
    secret: "ton_secret", // à personnaliser
    resave: false,
    saveUninitialized: false,
    cookie: { secure: false }, // mettre true si HTTPS
  })
);

// Routes API
app.use("/api/auth", authRoutes);
app.use("/api/agenda", agendaRoutes);
app.use("/api/agenda", agendaExportRoutes);
app.use("/api/agenda", agendaImportRoutes);
app.use("/api/test", testRoutes);

// Connexion à MongoDB
mongoose
  .connect("mongodb://localhost:27017/agendaApp")
  .then(() => console.log("Connecté à MongoDB"))
  .catch((err) => console.error(" Erreur MongoDB :", err));

  // Démarrage du serveur
app.listen(PORT, () =>
  console.log(` Serveur en ligne : http://localhost:${PORT}`)
);
