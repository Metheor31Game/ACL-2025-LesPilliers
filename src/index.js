const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const bodyParser = require("body-parser");
const authRoutes = require("./route/authroute");
const testRoutes = require("./route/testroute");
const agendaRoutes = require("./route/agendaroute");
const session = require("express-session");
const path = require("path"); // Pour gérer les chemins de fichiers

const app = express();
const PORT = 3000;

app.use(cors());
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, "../public"))); //par rapport a package.json

mongoose
  .connect("mongodb://localhost:27017/agendaApp")
  .then(() => console.log("Connecté à MongoDB"))
  .catch((err) => console.error(" Erreur MongoDB :", err));

//Gestion de la connection avec session + cookie
app.use(
  session({
    secret: "ton_secret", // à personnaliser
    resave: false,
    saveUninitialized: false,
    cookie: { secure: false }, // mettre true si HTTPS
  })
);

app.use("/api/auth", authRoutes);
app.use("/api/agenda", agendaRoutes);
app.use("/api/test", testRoutes);

app.listen(PORT, () =>
  console.log(`🚀 Serveur en ligne : http://localhost:${PORT}`)
);
