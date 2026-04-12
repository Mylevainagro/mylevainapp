// ============================================================
// MyLevain Agro Intelligence — Types TypeScript
// Basé sur les Excel essai-terrain.xlsx & MyLevain_Agro_MVP.xlsx
// ============================================================

export type Modalite =
  | "Témoin"
  | "Levain 1/4"
  | "Levain 1/2"
  | "Levain 1/4 + Cuivre"
  | "Levain 1/2 + Cuivre";

export type MeteoType = "Ensoleillé" | "Nuageux" | "Couvert" | "Pluie" | "Orage";
export type VentType = "Nul" | "Faible" | "Modéré" | "Fort";
export type HumiditeSol = "Sec" | "Humide" | "Gorgé";
export type Localisation = "Feuilles" | "Grappes" | "Tiges" | "Multiple";
export type Progression = "Stable" | "En hausse" | "En baisse";
export type CouleurFeuillage = "Vert foncé" | "Vert clair" | "Jaunissant" | "Chlorose";

// Note 0-5 pour les évaluations visuelles
export type Note05 = 0 | 1 | 2 | 3 | 4 | 5;
// Note 0-3 pour la pression mildiou
export type Note03 = 0 | 1 | 2 | 3;

// ---- Entités principales ----

export interface Vignoble {
  id: string;
  nom: string;
  localisation: string;
  appellation: string | null;
  type_sol: string | null;
  created_at: string;
}

export interface Parcelle {
  id: string;
  vignoble_id: string;
  nom: string;
  cepage: string | null;
  nb_rangs: number;
  created_at: string;
}

export interface Observation {
  id: string;
  parcelle_id: string;
  rang: number;
  modalite: Modalite;
  date: string;
  heure: string;
  mois: string;

  // Météo
  meteo: MeteoType | null;
  temperature: number | null;
  humidite: number | null;
  vent: VentType | null;
  pluie_recente: boolean | null;
  derniere_pluie: string | null;
  humidite_sol: HumiditeSol | null;

  // Traitement appliqué
  volume_applique_l: number | null;
  ph_surnageant: number | null;
  surnageant_l: number | null;
  eau_l: number | null;
  cuivre: boolean | null;
  date_surnageant: string | null;
  date_cuivre: string | null;

  // État plante (0-5)
  vigueur: Note05 | null;
  croissance: Note05 | null;
  homogeneite: Note05 | null;
  couleur_feuilles: Note05 | null;
  epaisseur_feuilles: Note05 | null;
  turgescence: Note05 | null;

  // Symptômes négatifs (0-5)
  brulures: Note05 | null;
  necroses: Note05 | null;
  deformations: Note05 | null;

  // Maladies
  mildiou_presence: Note05 | null;
  mildiou_intensite: number | null; // pourcentage
  localisation_mildiou: Localisation | null;
  progression: Progression | null;
  pression_mildiou: Note03 | null;

  // Grappes
  nb_grappes_par_cep: number | null;
  taille_grappes: Note05 | null;
  homogeneite_grappes: Note05 | null;

  // Scores calculés
  score_plante: number | null;
  score_sanitaire: number | null;

  // Notes
  commentaires: string | null;
  created_at: string;
}

export interface Traitement {
  id: string;
  parcelle_id: string;
  rang: number;
  modalite: Modalite;
  date: string;
  produit: string;
  dose: string | null;
  methode_application: string | null;
  temperature: number | null;
  humidite: number | null;
  conditions_meteo: string | null;
  operateur: string | null;
  notes: string | null;
  created_at: string;
}

export interface AnalyseSol {
  id: string;
  parcelle_id: string;
  date_prelevement: string;
  phase: "T0" | "Tfinal";

  // Pack minimal sol
  ph: number | null;
  matiere_organique_pct: number | null;
  rapport_c_n: number | null;
  azote_total: number | null;
  phosphore: number | null;
  potassium: number | null;
  biomasse_microbienne: number | null;
  respiration_sol: number | null;
  bacteries_totales: number | null;
  champignons_totaux: number | null;

  // Métaux lourds — total + biodisponible
  cuivre_total: number | null;
  cuivre_biodisponible: number | null;
  cadmium_total: number | null;
  cadmium_biodisponible: number | null;
  plomb_total: number | null;
  plomb_biodisponible: number | null;
  arsenic_total: number | null;
  arsenic_biodisponible: number | null;
  manganese_total: number | null;
  manganese_biodisponible: number | null;

  // Scores calculés
  score_sante_sol: number | null;
  score_contamination_metaux: number | null;

  fichier_pdf_url: string | null;
  created_at: string;
}

// Types pour le système décisionnel
export type RecoType = "preventif" | "curatif" | "observation";
export type NiveauRisque = "faible" | "moyen" | "eleve";
export type RecoAction = "traiter" | "attendre" | "surveiller";
export type RecoProduit = "levain" | "cuivre" | "levain + cuivre" | "autre";
export type RecoSource = "regle_metier" | "ia" | "operateur";
export type RecoStatut = "en_attente" | "appliquee" | "ignoree";

export interface Recommandation {
  id: string;
  parcelle_id: string;
  rang: number | null;
  date: string;
  type: RecoType;
  niveau_risque: NiveauRisque;
  maladie_cible: string | null;
  action: RecoAction;
  produit: RecoProduit | null;
  dose: string | null;
  frequence: string | null;
  explication: string | null;
  score_confiance: number | null;
  source: RecoSource;
  statut: RecoStatut;
  date_application: string | null;
  retour_terrain: string | null;
  created_at: string;
}

export interface Photo {
  id: string;
  observation_id: string;
  type: "feuille" | "grappe" | "sol" | "rang" | "autre";
  url: string;
  legende: string | null;
  created_at: string;
}

// Référentiel statique rang → modalité
export interface ModaliteRef {
  rang: number;
  modalite: Modalite;
  description: string;
  surnageant_l: number;
  eau_l: number;
  volume_l: number;
}

// Pour le formulaire de saisie
export type ObservationFormData = Omit<Observation, "id" | "created_at" | "score_plante" | "score_sanitaire">;
