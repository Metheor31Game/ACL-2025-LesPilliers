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

// Password visibility toggles
(function initPwToggles() {
  const eyeSvg = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8S1 12 1 12z"></path><circle cx="12" cy="12" r="3"></circle></svg>`;
  const eyeOffSvg = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M17.94 17.94A10.94 10.94 0 0 1 12 20c-7 0-11-8-11-8a21.66 21.66 0 0 1 5.06-6.09"></path><path d="M1 1l22 22"></path></svg>`;

  document.querySelectorAll(".pw-toggle").forEach((btn) => {
    const targetId = btn.dataset.target;
    const input = document.getElementById(targetId);
    if (!input) return;
    if (!btn.innerHTML.trim()) btn.innerHTML = eyeSvg;
    btn.addEventListener("click", () => {
      const isPwd = input.type === "password";
      input.type = isPwd ? "text" : "password";
      btn.innerHTML = isPwd ? eyeOffSvg : eyeSvg;
      btn.setAttribute(
        "aria-label",
        isPwd ? "Masquer le mot de passe" : "Afficher le mot de passe"
      );
    });
  });
})();
