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
  const n = document.getElementById("notif");
  if (!n) return console.log(text);
  n.textContent = text;
  n.className = ""; // reset
  n.classList.add(
    "fixed",
    "top-4",
    "left-1/2",
    "-translate-x-1/2",
    "px-4",
    "py-2",
    "rounded",
    "shadow",
    "text-white",
    "text-sm"
  );
  if (type === "ok") n.style.background = "#10b981";
  else if (type === "err" || type === "error") n.style.background = "#ef4444";
  else n.style.background = "#3b82f6";
  n.classList.remove("hidden");
  setTimeout(() => n.classList.add("hidden"), ms);
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
