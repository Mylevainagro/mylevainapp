import type { Observation, ObservationFormData } from "@/lib/types";

/**
 * Duplique une observation existante comme modèle pour une nouvelle saisie.
 * - Génère un nouvel id (via crypto.randomUUID)
 * - Met à jour la date au jour courant (YYYY-MM-DD)
 * - Met à jour l'heure à l'heure courante (HH:MM)
 * - Met à jour le mois selon la nouvelle date
 * - Copie tous les autres champs
 * - Supprime id, created_at, score_plante, score_sanitaire (recalculés à la soumission)
 *
 * Exigences : 12.1, 12.2, 12.3, 12.4
 */
export function dupliquerObservation(source: Observation): ObservationFormData {
  const now = new Date();
  const date = now.toISOString().split("T")[0];
  const heure = now.toTimeString().slice(0, 5);
  const mois = now.toLocaleString("fr-FR", { month: "long" });

  // Destructure to remove fields that should not be copied
  const {
    id: _id,
    created_at: _createdAt,
    score_plante: _scorePlante,
    score_sanitaire: _scoreSanitaire,
    ...rest
  } = source;

  return {
    ...rest,
    date,
    heure,
    mois,
  };
}
