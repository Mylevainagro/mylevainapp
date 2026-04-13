// ============================================================
// MyLevain Agro — Comparaison rendement par modalité (Phase 2)
// Pure logic for grouping observations by modalite and computing averages
// ============================================================

import { Observation } from "./types";

export interface RendementParModalite {
  modalite: string;
  moyenne_estime: number | null;
  moyenne_reel: number | null;
  count: number;
}

/**
 * Groups observations by modalite and computes average rendement_estime
 * and rendement_reel for each group, ignoring null values.
 *
 * Returns an array sorted alphabetically by modalite.
 */
export function grouperRendementParModalite(
  observations: Observation[],
): RendementParModalite[] {
  const groups = new Map<
    string,
    { estimes: number[]; reels: number[]; count: number }
  >();

  for (const obs of observations) {
    const key = obs.modalite;
    if (!groups.has(key)) {
      groups.set(key, { estimes: [], reels: [], count: 0 });
    }
    const g = groups.get(key)!;
    g.count++;
    if (obs.rendement_estime != null) g.estimes.push(obs.rendement_estime);
    if (obs.rendement_reel != null) g.reels.push(obs.rendement_reel);
  }

  const result: RendementParModalite[] = [];
  for (const [modalite, g] of groups) {
    result.push({
      modalite,
      moyenne_estime:
        g.estimes.length > 0
          ? g.estimes.reduce((a, b) => a + b, 0) / g.estimes.length
          : null,
      moyenne_reel:
        g.reels.length > 0
          ? g.reels.reduce((a, b) => a + b, 0) / g.reels.length
          : null,
      count: g.count,
    });
  }

  return result.sort((a, b) => a.modalite.localeCompare(b.modalite));
}
