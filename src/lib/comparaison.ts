// ============================================================
// MyLevain Agro — Comparaison N vs N-1 (Phase 2)
// Pure logic for computing year-over-year evolution percentages
// ============================================================

/**
 * Calculates the percentage evolution between two values (N vs N-1).
 * Returns null if valeurN1 is 0 (division by zero).
 *
 * Formula: ((valeurN - valeurN1) / valeurN1) * 100
 *
 * @param valeurN  - Current campaign value
 * @param valeurN1 - Previous campaign value
 * @returns Percentage evolution or null if N-1 is 0
 */
export function calcPourcentageEvolution(
  valeurN: number,
  valeurN1: number,
): number | null {
  if (valeurN1 === 0) return null;
  return ((valeurN - valeurN1) / valeurN1) * 100;
}
