// src/utils/generateRecurrences.js

/**
 * Génère les occurrences FUTURES d'un RDV permanent
 * selon sa récurrence (daily, weekly, monthly, yearly).
 * 
 * RÈGLE MÉTIER :
 * - AUCUNE occurrence n'est générée AVANT la date d'origine (original).
 * - Les occurrences commencent EXACTEMENT à original.
 * - Et se répètent dans le futur selon la récurrence.
 */

function generateRecurrences(rdvs, monday, sunday) {
  const generated = [];

  for (const rdv of rdvs) {
    // On récupère la vraie date de départ du RDV
    const original =
      rdv.startTime
        ? new Date(rdv.startTime)
        : rdv.date
        ? new Date(rdv.date)
        : null;

    if (!original || isNaN(original.getTime())) continue;

    // Si la semaine entière est AVANT la date de départ → rien à générer
    if (sunday < original) continue;

    /* UTILITAIRE : ajoute une occurrence si elle respecte les règles */
    const pushIfValid = (clone) => {
        if (
            clone >= monday &&   // dans la semaine affichée
            clone <= sunday &&
            clone >= original    // JAMAIS avant la date d'origine
        ) {

            //  Vérifier si clone est une EXCEPTION
            if (rdv.exceptions && rdv.exceptions.some(ex => {
            const exDate = new Date(ex);
            return exDate.getTime() === clone.getTime();
            })) {
            return; // On ignore cette occurrence
            }

            generated.push({
            ...rdv.toObject(),
            date: clone,
            startTime: clone,
            _id: rdv._id,
            });
        }
        };

    /* === DAILY === */
    if (rdv.recurrence === "daily") {
      for (let i = 0; i < 7; i++) {
        const clone = new Date(monday);
        clone.setDate(monday.getDate() + i);
        clone.setHours(original.getHours(), original.getMinutes(), 0, 0);

        pushIfValid(clone);
      }
    }

    /* === WEEKLY === */
    else if (rdv.recurrence === "weekly") {
      // 0 = lundi
      const originalDow = (original.getDay() + 6) % 7;

      const clone = new Date(monday);
      clone.setDate(monday.getDate() + originalDow);
      clone.setHours(original.getHours(), original.getMinutes(), 0, 0);

      pushIfValid(clone);
    }

    /* === MONTHLY === */
    else if (rdv.recurrence === "monthly") {
      const clone = new Date(monday);
      clone.setMonth(monday.getMonth());
      clone.setFullYear(monday.getFullYear());
      clone.setDate(original.getDate());
      clone.setHours(original.getHours(), original.getMinutes(), 0, 0);

      pushIfValid(clone);
    }

    /* === YEARLY === */
    else if (rdv.recurrence === "yearly") {
      const clone = new Date(
        monday.getFullYear(),
        original.getMonth(),
        original.getDate(),
        original.getHours(),
        original.getMinutes(),
        0,
        0
      );

      pushIfValid(clone);
    }
  }

  return generated;
}

module.exports = generateRecurrences;
