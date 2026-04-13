// ============================================================
// Données locales du guide de notation (fallback si Supabase indisponible)
// Correspond au seed de la migration 008
// ============================================================

import type { GuideNotation } from './types';

export const GUIDE_NOTATION_LOCAL: GuideNotation[] = [
  {
    id: 'local-1', code_indicateur: 'mildiou_frequence', nom_indicateur: 'Fréquence mildiou',
    description: 'Pourcentage de feuilles présentant des symptômes de mildiou',
    pourquoi_mesurer: 'Évaluer la propagation de la maladie dans la parcelle',
    methode_mesure: 'Examiner 20 feuilles aléatoires sur le rang. Compter celles présentant des taches huileuses (face supérieure) ou du feutrage blanc (face inférieure). Calculer : (nb feuilles atteintes / 20) × 100',
    points_attention: 'Observer les deux faces de chaque feuille. Privilégier les feuilles du milieu du cep. Ne pas confondre avec des carences.',
    echelle_type: 'pourcentage',
    seuils_json: { "0": "Aucune feuille atteinte", "25": "Faible — 1 à 5 feuilles", "50": "Modéré — 6 à 10 feuilles", "75": "Fort — 11 à 15 feuilles", "100": "Très fort — plus de 15 feuilles" },
    exemple: 'Si 4 feuilles sur 20 présentent des taches → 20%', unite: '%', actif: true, ordre_affichage: 1,
  },
  {
    id: 'local-2', code_indicateur: 'mildiou_intensite', nom_indicateur: 'Intensité mildiou',
    description: 'Sévérité des symptômes de mildiou sur les feuilles atteintes',
    pourquoi_mesurer: 'Évaluer la gravité de l\'infection sur les organes touchés',
    methode_mesure: 'Sur les feuilles atteintes, évaluer la surface foliaire couverte par les symptômes. Attribuer une note de 0 à 5.',
    points_attention: 'Distinguer les taches récentes (huileuses) des anciennes (nécrosées). Vérifier aussi les grappes.',
    echelle_type: 'numerique_0_5',
    seuils_json: { "0": "Aucun symptôme", "1": "Traces — <5% surface", "2": "Léger — 5-15% surface", "3": "Modéré — 15-30% surface", "4": "Sévère — 30-50% surface", "5": "Très sévère — >50% surface" },
    exemple: 'Taches couvrant environ 20% de la feuille → note 3', unite: null, actif: true, ordre_affichage: 2,
  },
  {
    id: 'local-3', code_indicateur: 'vigueur', nom_indicateur: 'Vigueur de la vigne',
    description: 'Évaluation globale de la vigueur végétative du cep',
    pourquoi_mesurer: 'Suivre le développement de la plante et détecter les stress',
    methode_mesure: 'Observer la longueur des entre-nœuds, le diamètre des rameaux, la taille des feuilles et la couleur générale. Attribuer une note de 0 à 5.',
    points_attention: 'Comparer avec les ceps voisins. Tenir compte du stade phénologique. Une vigueur excessive peut favoriser les maladies.',
    echelle_type: 'numerique_0_5',
    seuils_json: { "0": "Très faible — cep chétif", "1": "Faible — croissance réduite", "2": "Moyenne-faible", "3": "Moyenne — développement normal", "4": "Bonne — croissance vigoureuse", "5": "Très forte — croissance excessive" },
    exemple: 'Rameaux de longueur normale, feuilles de taille moyenne, couleur vert foncé → note 4', unite: null, actif: true, ordre_affichage: 5,
  },
  {
    id: 'local-4', code_indicateur: 'humidite_sol', nom_indicateur: 'Humidité du sol',
    description: 'Évaluation tactile et visuelle de l\'humidité du sol',
    pourquoi_mesurer: 'Contextualiser les observations et anticiper les risques fongiques',
    methode_mesure: 'Prendre une poignée de terre à 10 cm de profondeur. Presser dans la main et observer.',
    points_attention: 'L\'humidité varie selon la profondeur et la position dans la parcelle. Faire le test à mi-rang.',
    echelle_type: 'categoriel',
    seuils_json: { "Sec": "La terre s'effrite, ne forme pas de boule", "Humide": "La terre forme une boule qui se tient, sans eau visible", "Gorgé": "L'eau suinte quand on presse, sol brillant" },
    exemple: 'La terre forme une boule compacte mais pas d\'eau visible → Humide', unite: null, actif: true, ordre_affichage: 6,
  },
  {
    id: 'local-5', code_indicateur: 'vie_biologique_visible', nom_indicateur: 'Vie biologique visible',
    description: 'Présence d\'organismes vivants visibles dans et sur le sol',
    pourquoi_mesurer: 'Évaluer l\'activité biologique du sol comme indicateur de santé',
    methode_mesure: 'Sur une surface de 30×30 cm, retourner la terre sur 10 cm. Compter les vers de terre, observer les champignons, insectes, racines actives.',
    points_attention: 'Faire l\'observation tôt le matin ou après une pluie. Les vers sont plus visibles en sol humide.',
    echelle_type: 'numerique_0_5',
    seuils_json: { "0": "Aucune vie visible", "1": "Très peu — 1-2 organismes", "2": "Peu — quelques vers ou insectes", "3": "Modéré — vers + insectes + racines", "4": "Riche — abondance de vie", "5": "Très riche — sol grouillant de vie" },
    exemple: '5 vers de terre, quelques insectes, mycélium visible → note 3', unite: null, actif: true, ordre_affichage: 7,
  },
];

/** Lookup a guide notation fiche by code_indicateur from local data */
export function getLocalGuideNotation(code: string): GuideNotation | null {
  return GUIDE_NOTATION_LOCAL.find((g) => g.code_indicateur === code) ?? null;
}
