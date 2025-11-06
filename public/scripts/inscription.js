// inscription.js
// Extrait depuis public/inscription.html. Chargé à la fin du <body>,
// donc DOM ready.

const registerForm = document.getElementById("registerForm");
if (registerForm) {
  registerForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const username = document.getElementById("username").value;
    const password = document.getElementById("password").value;

    try {
      const res = await fetch("/api/auth/register", {
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
      window.location.href = "connexion.html";
    } catch (err) {
      alert("Erreur réseau lors de l'inscription");
    }
  });
}
