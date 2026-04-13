// ============================================================
// Timeline — Fusion, tri et filtrage des événements parcelle
// Exigences : 15.1, 15.2, 15.3, 15.4, 15.5
// ============================================================

import type { Observation, Traitement, AnalyseSol, TimelineEvent } from "./types";

/** Configuration icône + couleur par type d'événement */
export const EVENT_TYPE_CONFIG: Record<TimelineEvent["type"], { icone: string; couleur: string }> = {
  observation: { icone: "📋", couleur: "green" },
  traitement: { icone: "💧", couleur: "brown" },
  analyse_sol: { icone: "🧪", couleur: "blue" },
};

/**
 * Fusionne observations, traitements et analyses sol en une timeline triée par date décroissante.
 */
export function buildTimeline(
  observations: Partial<Observation>[],
  traitements: Partial<Traitement>[],
  analyses: Partial<AnalyseSol>[]
): TimelineEvent[] {
  const events: TimelineEvent[] = [];

  for (const obs of observations) {
    const cfg = EVENT_TYPE_CONFIG.observation;
    events.push({
      id: obs.id ?? "",
      type: "observation",
      date: obs.date ?? "",
      titre: `Observation rang ${obs.rang ?? "?"}`,
      resume: obs.modalite ? `${obs.modalite} — ${obs.commentaires ?? ""}`.trim() : obs.commentaires ?? "",
      icone: cfg.icone,
      couleur: cfg.couleur,
    });
  }

  for (const t of traitements) {
    const cfg = EVENT_TYPE_CONFIG.traitement;
    events.push({
      id: t.id ?? "",
      type: "traitement",
      date: t.date ?? "",
      titre: `Traitement — ${t.produit ?? t.type_traitement ?? "?"}`,
      resume: [t.dose, t.objectif].filter(Boolean).join(" · "),
      icone: cfg.icone,
      couleur: cfg.couleur,
    });
  }

  for (const a of analyses) {
    const cfg = EVENT_TYPE_CONFIG.analyse_sol;
    events.push({
      id: a.id ?? "",
      type: "analyse_sol",
      date: a.date_prelevement ?? "",
      titre: `Analyse sol — ${a.phase ?? "?"}`,
      resume: a.ph != null ? `pH ${a.ph}` : "",
      icone: cfg.icone,
      couleur: cfg.couleur,
    });
  }

  // Sort descending by date
  events.sort((a, b) => (b.date > a.date ? 1 : b.date < a.date ? -1 : 0));

  return events;
}

/**
 * Filtre une timeline par type d'événement et/ou période.
 */
export function filterTimeline(
  events: TimelineEvent[],
  filters: { type?: string; date_debut?: string; date_fin?: string }
): TimelineEvent[] {
  return events.filter((e) => {
    if (filters.type && e.type !== filters.type) return false;
    if (filters.date_debut && e.date < filters.date_debut) return false;
    if (filters.date_fin && e.date > filters.date_fin) return false;
    return true;
  });
}
