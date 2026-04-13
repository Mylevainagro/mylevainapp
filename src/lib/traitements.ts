// ============================================================
// MyLevain Agro — Fonctions utilitaires traitements (Phase 2)
// Pure logic functions for treatment data processing
// ============================================================

import type { Traitement } from './types';

/**
 * Returns the treatment with the most recent date, or null if the array is empty.
 * Corresponds to the SQL view `derniers_traitements`.
 */
export function getDernierTraitement(traitements: Traitement[]): Traitement | null {
  if (traitements.length === 0) return null;

  return traitements.reduce((latest, current) =>
    current.date > latest.date ? current : latest
  );
}

/**
 * Counts total and cuivre passages for a given campagne.
 * Corresponds to the SQL view `nb_passages`.
 */
export function countPassages(
  traitements: Traitement[],
  campagne: string,
): { nb_total: number; nb_cuivre: number } {
  const filtered = traitements.filter((t) => t.campagne === campagne);
  const nb_total = filtered.length;
  const nb_cuivre = filtered.filter((t) => t.type_traitement === 'cuivre').length;
  return { nb_total, nb_cuivre };
}

/**
 * Filters treatments by campagne and/or type_traitement.
 */
export function filterTraitements(
  traitements: Traitement[],
  filters: { campagne?: string; type_traitement?: string },
): Traitement[] {
  return traitements.filter((t) => {
    if (filters.campagne !== undefined && t.campagne !== filters.campagne) return false;
    if (filters.type_traitement !== undefined && t.type_traitement !== filters.type_traitement) return false;
    return true;
  });
}
