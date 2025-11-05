const express = require("express");
const router = express.Router();
const path = require("path");
const User = require("../model/personne");
const Agenda = require("../model/Agenda");
const isAuthenticated = require("../middleware/auth");

// 🔹 Déconnexion
router.post("/logout", (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      console.error("Erreur lors de la déconnexion :", err);
      return res
        .status(500)
        .json({ message: "Erreur lors de la déconnexion." });
    }
    res.json({ message: "Déconnecté." });
  });
});

// 🔹 Inscription
router.post("/register", async (req, res) => {
  const { username, password } = req.body;

  try {
    // Vérifier si l'utilisateur existe déjà
    const existing = await User.findOne({ username });
    if (existing) {
      return res.status(400).json({ message: "Cet identifiant existe déjà." });
    }

    // Créer le nouvel utilisateur
    const user = new User({ username, password });
    await user.save();

    // ✅ Créer automatiquement un agenda "defaut" vide
    const agendaDefaut = new Agenda({
      nom: "defaut",
      rdvs: [],
      userId: user._id,
    });
    await agendaDefaut.save();

    // Stocker l'utilisateur dans la session
    req.session.userId = user._id;

    res
      .status(201)
      .json({ message: "Inscription réussie ! Agenda par défaut créé." });
  } catch (err) {
    console.error("Erreur lors de l’inscription :", err);
    res.status(500).json({ message: "Erreur serveur lors de l’inscription." });
  }
});

// 🔹 Connexion
router.post("/login", async (req, res) => {
  const { username, password } = req.body;

  try {
    // Rechercher l'utilisateur
    const user = await User.findOne({ username });
    if (!user) {
      return res.status(400).json({ message: "Utilisateur introuvable." });
    }

    // Vérifier le mot de passe
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(400).json({ message: "Mot de passe incorrect." });
    }

    // Enregistrer la session utilisateur
    req.session.userId = user._id;

    res.json({ message: `Bienvenue ${user.username}` });
  } catch (err) {
    console.error("Erreur lors de la connexion :", err);
    res.status(500).json({ message: "Erreur serveur lors de la connexion." });
  }
});

// Update d un compte
router.post("/update", isAuthenticated, async (req, res) => {
  const { username, password } = req.body;

  try {
    const user = await User.findById(req.session.userId);
    if (!user) {
      return res.status(404).json({ message: "Utilisateur non trouvé." });
    }

    // changement d username
    if (username && username !== user.username) {
      const existing = await User.findOne({ username });
      if (existing) {
        return res
          .status(400)
          .json({ message: "Ce nom d'utilisateur existe déjà." });
      }
      user.username = username;
    }

    // changement de mdp
    if (password) {
      user.password = password;
    }

    await user.save();

    res.json({ message: "Compte mis à jour avec succès !" });
  } catch (err) {
    console.error("Erreur mise à jour :", err);
    res.status(500).json({ message: "Erreur serveur." });
  }
});

module.exports = router;
