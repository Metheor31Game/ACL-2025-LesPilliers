import express from "express";
import session from "express-session";
import authRouter from "./src/api/auth.js";

const app = express();
app.use(express.json());

app.use(
  session({
    secret: "votreSecretSécurisé",
    resave: false,
    saveUninitialized: false,
  })
);

// Routes d'authentification
app.use("/api/auth", authRouter);

app.listen(3000, () => console.log("Server running on http://localhost:3000"));

