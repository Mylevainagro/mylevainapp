// ============================================================
// MyLevain Agro — Sélection d'indicateurs par type de culture
// Exigence 2.7 : Adapter dynamiquement les indicateurs affichés
// dans le formulaire d'observation selon le type de culture.
// ============================================================

/**
 * Ensemble complet de tous les noms de champs indicateurs
 * disponibles dans l'interface Observation.
 * Exclut les champs de métadonnées (id, parcelle_id, date, etc.)
 * et les champs de traitement appliqué.
 */
export const ALL_INDICATEURS: readonly string[] = [
  // Météo
  'meteo',
  'temperature',
  'humidite',
  'vent',
  'pluie_recente',
  'derniere_pluie',
  'humidite_sol',

  // État plante (0-5)
  'vigueur',
  'croissance',
  'homogeneite',
  'couleur_feuilles',
  'epaisseur_feuilles',
  'turgescence',

  // Symptômes négatifs (0-5)
  'brulures',
  'necroses',
  'deformations',

  // Maladies
  'mildiou_presence',
  'mildiou_intensite',
  'localisation_mildiou',
  'progression',
  'pression_mildiou',

  // Grappes
  'nb_grappes_par_cep',
  'taille_grappes',
  'homogeneite_grappes',

  // Rendement
  'nombre_grappes',
  'poids_moyen_grappe',
  'rendement_estime',
  'rendement_reel',

  // Biologie du sol
  'vie_biologique_visible',
] as const;

/**
 * Indicateurs par type de culture.
 *
 * - viticulture : tous les indicateurs (cas historique)
 * - maraichage : vigueur, météo/sol, biologie — pas de mildiou/oïdium/grappes
 * - arboriculture : vigueur, sol, biologie, rendement — pas de mildiou/oïdium
 * - grandes_cultures : ensemble minimal (vigueur, sol, biologie)
 */
const INDICATEURS_PAR_CULTURE: Record<string, readonly string[]> = {
  viticulture: ALL_INDICATEURS,

  maraichage: [
    // Météo
    'meteo',
    'temperature',
    'humidite',
    'vent',
    'pluie_recente',
    'derniere_pluie',
    'humidite_sol',

    // État plante
    'vigueur',
    'croissance',
    'homogeneite',
    'couleur_feuilles',
    'epaisseur_feuilles',
    'turgescence',

    // Symptômes négatifs
    'brulures',
    'necroses',
    'deformations',

    // Biologie du sol
    'vie_biologique_visible',
  ],

  arboriculture: [
    // Météo
    'meteo',
    'temperature',
    'humidite',
    'vent',
    'pluie_recente',
    'derniere_pluie',
    'humidite_sol',

    // État plante
    'vigueur',
    'croissance',
    'homogeneite',
    'couleur_feuilles',
    'epaisseur_feuilles',
    'turgescence',

    // Symptômes négatifs
    'brulures',
    'necroses',
    'deformations',

    // Rendement
    'nombre_grappes',
    'poids_moyen_grappe',
    'rendement_estime',
    'rendement_reel',

    // Biologie du sol
    'vie_biologique_visible',
  ],

  grandes_cultures: [
    // Météo
    'meteo',
    'temperature',
    'humidite',
    'vent',
    'pluie_recente',
    'derniere_pluie',
    'humidite_sol',

    // État plante (minimal)
    'vigueur',

    // Biologie du sol
    'vie_biologique_visible',
  ],
};

/**
 * Retourne la liste des noms de champs indicateurs pertinents
 * pour un type de culture donné.
 *
 * Si le code type_culture est inconnu, retourne l'ensemble complet
 * des indicateurs (comportement par défaut sûr).
 */
export function getIndicateursForCulture(typeCultureCode: string): string[] {
  const indicateurs = INDICATEURS_PAR_CULTURE[typeCultureCode];
  if (!indicateurs) {
    return [...ALL_INDICATEURS];
  }
  return [...indicateurs];
}
