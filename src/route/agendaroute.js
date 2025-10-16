const express = require("express");
const router = express.Router();
const isAuthenticated = require("../middleware/auth");

// Route GET /agenda avec vérification de connexion
router.get("/agenda", isAuthenticated, (req, res) => {
  res.json({ message: "Bienvenue sur l'agenda !" });
});

module.exports = router;
