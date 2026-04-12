import { AnalyseSol, Observation, Recommandation } from "./types";

// ============================================================
// SCORES OBSERVATION (terrain)
// ============================================================

/**
 * Score plante (0-5) = moyenne des notes positives
 */
export function calcScorePlante(obs: Partial<Observation>): number | null {
  const raw = [
    obs.vigueur, obs.croissance, obs.homogeneite,
    obs.couleur_feuilles, obs.epaisseur_feuilles, obs.turgescence,
  ];
  const vals = raw.filter((v) => v !== null && v !== undefined) as number[];
  if (vals.length === 0) return null;
  return round(vals.reduce((a, b) => a + b, 0) / vals.length);
}

/**
 * Score sanitaire (0-5) — 5 = parfait, 0 = très mauvais
 */
export function calcScoreSanitaire(obs: Partial<Observation>): number | null {
  const symptomes = filterNums([obs.brulures, obs.necroses, obs.deformations]);
  const maladie = filterNums([obs.mildiou_presence, obs.pression_mildiou]);
  if (symptomes.length === 0 && maladie.length === 0) return null;

  const avgSymptomes = symptomes.length > 0 ? avg(symptomes) : 0;
  const avgMaladie = maladie.length > 0 ? avg(maladie) * (5 / 3) : 0;
  return round(clamp(5 - (avgSymptomes + avgMaladie) / 2));
}

/**
 * Score mildiou (0-5) — 0 = aucun, 5 = très fort
 */
export function calcScoreMildiou(obs: Partial<Observation>): number | null {
  const vals = filterNums([obs.mildiou_presence, obs.pression_mildiou]);
  if (vals.length === 0 && obs.mildiou_intensite == null) return null;

  const presenceScore = vals.length > 0 ? avg(vals) : 0;
  // Intensité (%) normalisée sur 5
  const intensiteScore = obs.mildiou_intensite != null ? (obs.mildiou_intensite / 100) * 5 : 0;
  const count = (vals.length > 0 ? 1 : 0) + (obs.mildiou_intensite != null ? 1 : 0);
  return round(clamp((presenceScore + intensiteScore) / Math.max(count, 1)));
}

/**
 * Score vigueur (0-5) — synthèse état plante sans symptômes
 */
export function calcScoreVigueur(obs: Partial<Observation>): number | null {
  const vals = filterNums([obs.vigueur, obs.croissance, obs.turgescence]);
  if (vals.length === 0) return null;
  return round(avg(vals));
}

// ============================================================
// SCORES SOL (analyses labo)
// ============================================================

/**
 * Score santé du sol (0-5) — basé sur biomasse, respiration, MO
 * 5 = sol très vivant, 0 = sol mort
 */
export function calcScoreSanteSol(analyse: Partial<AnalyseSol>): number | null {
  // Normalisation indicative (à affiner avec données réelles)
  const scores: number[] = [];

  if (analyse.biomasse_microbienne != null) {
    // Biomasse microbienne : 200-600 mg C/kg = bon (on normalise sur 5)
    scores.push(clamp((analyse.biomasse_microbienne / 600) * 5));
  }
  if (analyse.respiration_sol != null) {
    // Respiration : 20-80 mg CO2/kg/j = bon
    scores.push(clamp((analyse.respiration_sol / 80) * 5));
  }
  if (analyse.matiere_organique_pct != null) {
    // MO : 2-5% = bon pour vigne
    scores.push(clamp((analyse.matiere_organique_pct / 5) * 5));
  }
  if (analyse.ph != null) {
    // pH optimal vigne : 6.0-7.5 → score max au centre
    const phOpt = 6.75;
    const phScore = Math.max(0, 5 - Math.abs(analyse.ph - phOpt) * 2);
    scores.push(clamp(phScore));
  }

  if (scores.length === 0) return null;
  return round(avg(scores));
}

/**
 * Score contamination métaux (0-5) — 0 = propre, 5 = très contaminé
 * Basé sur les seuils réglementaires français (arrêté du 8 janvier 1998)
 */
export function calcScoreContaminationMetaux(analyse: Partial<AnalyseSol>): number | null {
  const scores: number[] = [];

  // Seuils réglementaires sols agricoles (mg/kg)
  // On utilise le biodisponible en priorité, sinon le total
  const metaux: { val: number | null | undefined; seuil: number }[] = [
    { val: analyse.cuivre_biodisponible ?? analyse.cuivre_total, seuil: 100 },
    { val: analyse.cadmium_biodisponible ?? analyse.cadmium_total, seuil: 2 },
    { val: analyse.plomb_biodisponible ?? analyse.plomb_total, seuil: 100 },
    { val: analyse.arsenic_biodisponible ?? analyse.arsenic_total, seuil: 25 },
    { val: analyse.manganese_biodisponible ?? analyse.manganese_total, seuil: 500 },
  ];

  for (const m of metaux) {
    if (m.val != null) {
      // Ratio par rapport au seuil, normalisé sur 5
      scores.push(clamp((m.val / m.seuil) * 5));
    }
  }

  if (scores.length === 0) return null;
  return round(avg(scores));
}

// ============================================================
// MOTEUR DE RECOMMANDATIONS (règles métier)
// ============================================================

interface RecoInput {
  observation: Partial<Observation>;
  dernierTraitement?: { date: string; produit: string } | null;
  meteo?: { pluie_prevue: boolean; temperature: number } | null;
}

/**
 * Génère des recommandations basées sur les règles métier
 * Retourne un tableau de recommandations partielles (sans id, created_at)
 */
export function genererRecommandations(input: RecoInput): Partial<Recommandation>[] {
  const { observation: obs, dernierTraitement, meteo } = input;
  const recos: Partial<Recommandation>[] = [];
  const today = new Date().toISOString().split("T")[0];

  const scoreMildiou = calcScoreMildiou(obs);
  const scoreVigueur = calcScoreVigueur(obs);

  // Règle 1 : Pression mildiou élevée
  if (scoreMildiou != null && scoreMildiou >= 3) {
    recos.push({
      date: today,
      type: "curatif",
      niveau_risque: scoreMildiou >= 4 ? "eleve" : "moyen",
      maladie_cible: "mildiou",
      action: "traiter",
      produit: "levain + cuivre",
      frequence: "tous les 7 jours",
      explication: `Score mildiou élevé (${scoreMildiou}/5). Traitement curatif recommandé.`,
      score_confiance: 75,
      source: "regle_metier",
    });
  }

  // Règle 2 : Pression mildiou modérée + pluie récente
  if (scoreMildiou != null && scoreMildiou >= 1.5 && scoreMildiou < 3 && obs.pluie_recente) {
    recos.push({
      date: today,
      type: "preventif",
      niveau_risque: "moyen",
      maladie_cible: "mildiou",
      action: "traiter",
      produit: "levain",
      frequence: "tous les 10 jours",
      explication: `Mildiou modéré (${scoreMildiou}/5) + pluie récente. Traitement préventif levain recommandé.`,
      score_confiance: 65,
      source: "regle_metier",
    });
  }

  // Règle 3 : Tout va bien, surveiller
  if (scoreMildiou != null && scoreMildiou < 1.5) {
    recos.push({
      date: today,
      type: "observation",
      niveau_risque: "faible",
      maladie_cible: "mildiou",
      action: "surveiller",
      explication: `Pression mildiou faible (${scoreMildiou}/5). Continuer la surveillance.`,
      score_confiance: 80,
      source: "regle_metier",
    });
  }

  // Règle 4 : Vigueur faible → booster levain
  if (scoreVigueur != null && scoreVigueur < 2.5) {
    recos.push({
      date: today,
      type: "curatif",
      niveau_risque: "moyen",
      maladie_cible: undefined,
      action: "traiter",
      produit: "levain",
      dose: "dilution 1/2",
      frequence: "tous les 7 jours",
      explication: `Vigueur faible (${scoreVigueur}/5). Application levain dose forte recommandée.`,
      score_confiance: 60,
      source: "regle_metier",
    });
  }

  // Règle 5 : Brûlures/nécroses détectées → réduire cuivre
  const symptomes = filterNums([obs.brulures, obs.necroses]);
  if (symptomes.length > 0 && avg(symptomes) >= 2) {
    recos.push({
      date: today,
      type: "observation",
      niveau_risque: "moyen",
      action: "surveiller",
      explication: `Symptômes de phytotoxicité détectés (brûlures/nécroses). Vérifier dose cuivre et envisager remplacement par levain seul.`,
      score_confiance: 70,
      source: "regle_metier",
    });
  }

  return recos;
}

// ============================================================
// UTILITAIRES
// ============================================================

function filterNums(arr: (number | null | undefined)[]): number[] {
  return arr.filter((v) => v !== null && v !== undefined) as number[];
}

function avg(vals: number[]): number {
  return vals.reduce((a, b) => a + b, 0) / vals.length;
}

function clamp(v: number, min = 0, max = 5): number {
  return Math.max(min, Math.min(max, v));
}

function round(v: number, decimals = 1): number {
  const f = Math.pow(10, decimals);
  return Math.round(v * f) / f;
}
