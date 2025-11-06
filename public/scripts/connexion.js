// connexion.js

// Redirection si déjà connecté
fetch("/api/agenda", { credentials: "include" })
  .then((res) => {
    if (res.status === 200) {
      alert("Vous êtes déjà connecté");
      window.location.href = "agenda.html";
      return null;
    }
    return res.json().catch(() => null);
  })
  .catch(() => null);

// Gestion du formulaire de connexion
const form = document.getElementById("loginForm");
if (form) {
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const username = document.getElementById("username").value;
    const password = document.getElementById("password").value;

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ username, password }),
      });

      if (!res.ok) {
        const text = await res.text();
        alert("Erreur : " + text);
        return;
      }

      const data = await res.json();
      alert(data.message);
      window.location.href = "agenda.html";
    } catch (err) {
      alert("Erreur réseau lors de la connexion");
    }
  });
}
