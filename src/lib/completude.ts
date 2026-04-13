// ============================================================
// MyLevain Agro — Validation de complétude (Exigences 5.1–5.7)
// Fonction pure évaluant la complétude des données avant export/rapport
// ============================================================

import type { CompletudeResult } from '@/lib/types';

/**
 * Input pour l'évaluation de complétude.
 * Chaque booléen indique la présence d'un type de données.
 */
export interface CompletudeInput {
  has_site: boolean;
  has_zone: boolean;
  has_observations: boolean;
  has_modalite: boolean;
  indicateurs_remplis: number;
  has_traitements: boolean;
  has_scores: boolean;
  has_analyses_sol: boolean;
}

/**
 * Évalue la complétude des données selon 3 niveaux :
 * - incomplete : données minimales absentes (site + zone + observations)
 * - partial : minimum présent mais pas complet
 * - complete : toutes les données présentes
 *
 * can_export est TOUJOURS true (Exigence 5.7).
 */
export function evaluerCompletude(input: CompletudeInput): CompletudeResult {
  const missing_required: string[] = [];
  const missing_recommended: string[] = [];

  // --- Données minimales requises (site + zone + observations) ---
  if (!input.has_site) missing_required.push('Site');
  if (!input.has_zone) missing_required.push('Zone de culture');
  if (!input.has_observations) missing_required.push('Observations');

  // --- Données recommandées pour un rapport complet ---
  if (!input.has_modalite) missing_recommended.push('Modalité');
  if (input.indicateurs_remplis < 3) missing_recommended.push('Indicateurs clés (min. 3)');
  if (!input.has_traitements) missing_recommended.push('Traitements');
  if (!input.has_scores) missing_recommended.push('Scores calculés');
  if (!input.has_analyses_sol) missing_recommended.push('Analyses de sol');

  // --- Détermination du statut ---
  const hasMinimum = input.has_site && input.has_zone && input.has_observations;
  const isComplete =
    hasMinimum &&
    input.has_traitements &&
    input.has_scores &&
    input.has_analyses_sol;

  let status: CompletudeResult['status'];
  let message: string;

  if (!hasMinimum) {
    status = 'incomplete';
    message = `Rapport incomplet — éléments requis manquants : ${missing_required.join(', ')}.`;
  } else if (isComplete) {
    status = 'complete';
    message = 'Rapport complet — toutes les données sont présentes.';
  } else {
    status = 'partial';
    message = `Rapport partiel — éléments recommandés manquants : ${missing_recommended.join(', ')}.`;
  }

  return {
    status,
    can_export: true,
    missing_required,
    missing_recommended,
    message,
  };
}
