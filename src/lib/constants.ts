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

export const METEO_OPTIONS = ["Ensoleillé", "Nuageux", "Couvert", "Pluie", "Orage"] as const;
export const VENT_OPTIONS = ["Nul", "Faible", "Modéré", "Fort"] as const;
export const HUMIDITE_SOL_OPTIONS = ["Sec", "Humide", "Gorgé"] as const;
export const LOCALISATION_OPTIONS = ["Feuilles", "Grappes", "Tiges", "Multiple"] as const;
export const PROGRESSION_OPTIONS = ["Stable", "En hausse", "En baisse"] as const;
