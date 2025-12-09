// Utilities for agenda UI (moved from agenda.js)

window.colors = [
  "#3b82f6",
  "#10b981",
  "#f59e0b",
  "#ef4444",
  "#8b5cf6",
  "#06b6d4",
  "#84cc16",
];

window.showNotif = function (text, type = "info", ms = 2200) {
  const container = document.getElementById("notif");
  if (!container) return console.log(text);

  const notif = document.createElement("div");
  notif.className = `
    px-4 py-2 rounded shadow text-white text-sm 
    transition-opacity duration-300
  `;

  // Couleur selon le type
  if (type === "ok") notif.style.background = "#ec4899";
  else if (type === "err" || type === "error") notif.style.background = "#facc15";
  else notif.style.background = "#3b82f6";

  notif.textContent = text;
  notif.style.opacity = "0";

  // Ajout dans le container (le tien, #notif)
  container.appendChild(notif);

  // Fade-in
  requestAnimationFrame(() => {
    notif.style.opacity = "1";
  });

  // Auto fade-out + remove
  setTimeout(() => {
    notif.style.opacity = "0";
    setTimeout(() => notif.remove(), 300);
  }, ms);
};


window.getMonday = function (d) {
  d = new Date(d);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  return new Date(d.setDate(diff));
};

window.formatDayHeader = function (d) {
  return d.toLocaleDateString("fr-FR", {
    weekday: "short",
    day: "numeric",
    month: "short",
  });
};

window.timeStr = function (d) {
  return new Date(d).toLocaleTimeString("fr-FR", {
    hour: "2-digit",
    minute: "2-digit",
  });
};
