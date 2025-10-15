const express = require("express");
const router = express.Router();
const isAuthenticated = require("../middleware/auth");

// Route GET /agenda avec vérification de connexion
router.get("/agenda", (req, res, next) => {
  if (!req.session.userId) {
    return res.status(401).json({ message: "Non connecté" });
  }
  res.json({ message: "Bienvenue sur l'agenda !" });
});

module.exports = router;
