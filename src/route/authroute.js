const express = require("express");
const router = express.Router();
const User = require("../model/personne");

//route inscription
router.post("/register", async (req, res) => {
  const { username, password } = req.body;

  try {
    // Vérif si la personne existe
    const existing = await User.findOne({ username });
    if (existing) {
      return res.status(400).json({ message: "Cet identifiant existe déjà." });
    }

    // Crée un nouvel utilisateur
    const user = new User({ username, password });
    await user.save();

    res.status(201).json({ message: " Inscription réussie !" });
  } catch (err) {
    console.error("Erreur lors de l’inscription :", err);
    res.status(500).json({ message: "Erreur serveur lors de l’inscription." });
  }
});

//route de connexion
router.post("/login", async (req, res) => {
  const { username, password } = req.body;

  try {
    // Recherche de l'utilisateur
    const user = await User.findOne({ username });
    if (!user) {
      return res.status(400).json({ message: "Utilisateur introuvable." });
    }

    // Vérif le mot de passe
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(400).json({ message: "Mot de passe incorrect." });
    }

    // Réponse en cas de succès
    req.session.userId = user._id;
    res.json({ message: `Bienvenue ${user.username}` });
  } catch (err) {
    console.error("Erreur lors de la connexion :", err);
    res.status(500).json({ message: "Erreur serveur lors de la connexion." });
  }
});

module.exports = router;
