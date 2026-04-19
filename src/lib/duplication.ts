import type { Observation, ObservationFormData } from "@/lib/types";

/**
 * Duplique une observation existante comme modèle pour une nouvelle saisie v2.
 * - Met à jour la date au jour courant
 * - Met à jour l'heure à l'heure courante
 * - Copie tous les champs (parcelle, rang, modalité, indicateurs plante, grappes, rendement, commentaires)
 * - Supprime id, created_at
 */
export function dupliquerObservation(source: Observation): ObservationFormData {
  const now = new Date();
  const date = now.toISOString().split("T")[0];
  const heure = now.toTimeString().slice(0, 5);
  const mois = now.toLocaleString("fr-FR", { month: "long" });

  const {
    id: _id,
    created_at: _createdAt,
    ...rest
  } = source;

  return {
    ...rest,
    date,
    heure,
    mois,
  };
}
