/**
 * Calcul du coefficient de corrélation de Pearson.
 * Utilisé pour visualiser les corrélations rendement vs vigueur, sol, traitements.
 * Exigence 8.6
 */

/**
 * Calcule le coefficient de corrélation de Pearson entre deux séries numériques.
 *
 * @param xs - Première série de valeurs
 * @param ys - Deuxième série de valeurs
 * @returns Le coefficient entre -1 et 1, ou null si le calcul est impossible
 *          (longueurs différentes, < 2 éléments, ou écart-type nul)
 */
export function calcCorrelation(xs: number[], ys: number[]): number | null {
  if (xs.length !== ys.length || xs.length < 2) return null;

  const n = xs.length;
  const meanX = xs.reduce((s, v) => s + v, 0) / n;
  const meanY = ys.reduce((s, v) => s + v, 0) / n;

  let sumXY = 0;
  let sumX2 = 0;
  let sumY2 = 0;

  for (let i = 0; i < n; i++) {
    const dx = xs[i] - meanX;
    const dy = ys[i] - meanY;
    sumXY += dx * dy;
    sumX2 += dx * dx;
    sumY2 += dy * dy;
  }

  if (sumX2 === 0 || sumY2 === 0) return null;

  const r = sumXY / Math.sqrt(sumX2 * sumY2);

  // Clamp to [-1, 1] to guard against floating-point drift
  return Math.max(-1, Math.min(1, r));
}
