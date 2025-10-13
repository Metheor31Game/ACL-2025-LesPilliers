import { Router } from "express";
import bcrypt from "bcrypt";
import { getUsers, saveUsers } from "../utils/users.js";

const router = Router();

// 🔹 Connexion
router.post("/login", async (req, res) => {
  const { email, password } = req.body;
  const users = getUsers();

  const user = users.find((u) => u.email === email);
  if (!user) return res.status(401).json({ message: "Utilisateur inconnu" });

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) return res.status(401).json({ message: "Mot de passe incorrect" });

  req.session.user = { id: user.id, email: user.email };
  res.json({ message: "Connecté avec succès", user: req.session.user });
});

// 🔹 Déconnexion
router.post("/logout", (req, res) => {
  req.session.destroy(() => {
    res.json({ message: "Déconnexion réussie" });
  });
});

export default router;

