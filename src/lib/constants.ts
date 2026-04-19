import { ModaliteRef } from "./types";

// Référentiel des 7 rangs — données du protocole essai-terrain.xlsx
export const MODALITES_REF: ModaliteRef[] = [
  { rang: 1, modalite: "Témoin", description: "Aucun traitement", surnageant_l: 0, eau_l: 0, volume_l: 0 },
  { rang: 2, modalite: "Levain 1/4", description: "Dilution 1/4", surnageant_l: 1, eau_l: 3, volume_l: 4 },
  { rang: 3, modalite: "Levain 1/2", description: "Dilution 1/2", surnageant_l: 2, eau_l: 2, volume_l: 4 },
  { rang: 4, modalite: "Levain 1/4", description: "Répétition dilution 1/4", surnageant_l: 1, eau_l: 3, volume_l: 4 },
  { rang: 5, modalite: "Levain 1/2", description: "Répétition dilution 1/2", surnageant_l: 2, eau_l: 2, volume_l: 4 },
  { rang: 6, modalite: "Levain 1/4 + Cuivre", description: "Synergie 1/4 + cuivre", surnageant_l: 1, eau_l: 3, volume_l: 4 },
  { rang: 7, modalite: "Levain 1/2 + Cuivre", description: "Synergie 1/2 + cuivre", surnageant_l: 2, eau_l: 2, volume_l: 4 },
];

export const VIGNOBLES = ["Piotte", "Pape Clément"] as const;

export const MOIS_CAMPAGNE = [
  "mars", "avril", "mai", "juin", "juillet",
  "août", "septembre", "octobre", "novembre", "décembre",
] as const;

// Météo (utilisé dans traitements, plus dans observations)
export const METEO_OPTIONS = ["Ensoleillé", "Nuageux", "Couvert", "Pluie", "Orage"] as const;
export const VENT_OPTIONS = ["Nul", "Faible", "Modéré", "Fort"] as const;
export const HUMIDITE_SOL_OPTIONS = ["Sec", "Humide", "Gorgé"] as const;
export const LOCALISATION_OPTIONS = ["Feuilles", "Grappes", "Tiges", "Multiple"] as const;
export const PROGRESSION_OPTIONS = ["Stable", "En hausse", "En baisse"] as const;

// ---- Constantes terrain v2 (Wilfried) ----

// Stades traitement (pas BBCH)
export const STADES_TRAITEMENT = ["A", "B", "C", "D", "E", "F"] as const;

// Stades BBCH vigne (pour observations) avec aide visuelle
export const STADES_BBCH = [
  { code: "00", label: "Repos hivernal", description: "Bourgeon d'hiver" },
  { code: "05", label: "Bourgeon dans le coton", description: "Début gonflement" },
  { code: "09", label: "Débourrement", description: "Pointe verte visible" },
  { code: "12", label: "2-3 feuilles étalées", description: "Premières feuilles" },
  { code: "15", label: "5-6 feuilles étalées", description: "Inflorescence visible" },
  { code: "17", label: "Grappes séparées", description: "Boutons floraux séparés" },
  { code: "23", label: "Floraison", description: "30% capuchons tombés" },
  { code: "27", label: "Nouaison", description: "Baies en formation" },
  { code: "31", label: "Petit pois", description: "Baies taille petit pois" },
  { code: "33", label: "Fermeture grappe", description: "Baies se touchent" },
  { code: "35", label: "Véraison", description: "Début changement couleur" },
  { code: "38", label: "Maturité", description: "Baies mûres" },
  { code: "41", label: "Surmaturation", description: "Concentration sucres" },
  { code: "43", label: "Chute des feuilles", description: "Début sénescence" },
] as const;

// Types de maladies (structure Wilfried — mesure sur 20 feuilles)
export const TYPES_MALADIE = [
  { code: "mildiou", label: "Mildiou" },
  { code: "oidium", label: "Oïdium" },
  { code: "botrytis", label: "Botrytis" },
  { code: "black_rot", label: "Black Rot" },
] as const;

// Zones de maladie
export const ZONES_MALADIE = [
  { code: "feuille", label: "Feuille" },
  { code: "grappe", label: "Grappe" },
] as const;

// Types d'application (traitement)
export const TYPES_APPLICATION = [
  { code: "pulve_dos", label: "Pulvé à dos" },
  { code: "tracteur", label: "Tracteur" },
  { code: "panneaux_recuperateurs", label: "Panneaux récupérateurs" },
] as const;

// Nombre de feuilles pour le calcul de fréquence maladies
export const NB_FEUILLES_ECHANTILLON = 20;
