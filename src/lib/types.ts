// ============================================================
// MyLevain Agro Intelligence — Types TypeScript v2
// Refonte terrain Wilfried — Avril 2026
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

// ---- Types terrain v2 ----
export type TypeMaladie = "mildiou" | "oidium" | "botrytis" | "black_rot";
export type ZoneMaladie = "feuille" | "grappe";
export type StadeTraitement = "A" | "B" | "C" | "D" | "E" | "F";
export type ZoneTraiteeType = "rang" | "surface";
export type TypeApplication = "pulve_dos" | "tracteur" | "panneaux_recuperateurs";

// ---- Culture & BBCH dynamique ----

export interface Culture {
  id: string;
  code: string;
  nom: string;
  actif: boolean;
}

export interface BbchStade {
  id: string;
  culture_id: string;
  code: string;
  label: string;
  description: string | null;
  ordre: number;
  actif: boolean;
}

// ---- Placette (unité expérimentale d'observation) ----

export interface Placette {
  id: string;
  parcelle_id: string;
  modalite_id: string | null; // code modalité (M0, M1, M2…)
  nom: string;
  nb_ceps: number;
  description_position: string | null;
  pieds_marques: string | null;
  actif: boolean;
  created_at: string;
}

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

// ---- Observation v2 (terrain Wilfried) ----

export interface Observation {
  id: string;
  parcelle_id: string;
  modalite: Modalite;
  date: string;
  heure: string;
  mois: string;

  // Nouveaux champs v2
  stade_bbch: string | null;
  repetition: number | null; // placette 1, 2, 3…
  placette_id: string | null; // lien vers table placettes
  rang: number;

  // État plante (0-5) — supprimé: epaisseur_feuilles
  vigueur: Note05 | null;
  croissance: Note05 | null;
  homogeneite: Note05 | null;
  couleur_feuilles: Note05 | null;
  turgescence: Note05 | null;

  // Symptômes négatifs (0-5) + nouveaux ravageurs
  brulures: Note05 | null;
  necroses: Note05 | null;
  deformations: Note05 | null;
  escargots: boolean | null;
  acariens: boolean | null;

  // Maladies v2 — stockées dans table séparée maladies_observations
  // (plus de mildiou_presence, mildiou_intensite, localisation_mildiou, progression, pression_mildiou)

  // Grappes
  nb_grappes_par_cep: number | null;
  taille_grappes: Note05 | null;
  homogeneite_grappes: Note05 | null;

  // Rendement (10 ceps marqués)
  nombre_grappes: number | null;
  poids_moyen_grappe: number | null;
  poids_100_baies: number | null;
  rendement_estime: number | null;
  rendement_reel: number | null;

  // Indicateurs biologiques terrain
  vie_biologique_visible: number | null;
  presence_vers_de_terre: number | null;
  structure_sol: number | null;
  odeur_sol: number | null;

  // Qualité raisin
  brix: number | null;
  ph_raisin: number | null;

  // Notes
  commentaires: string | null;
  created_at: string;
}

// ---- Maladie observation v2 (structure Wilfried — 20 feuilles) ----

export interface MaladieObservation {
  id: string;
  observation_id: string;
  type: TypeMaladie;
  zone: ZoneMaladie;
  nb_feuilles_atteintes: number; // sur 20
  frequence_pct: number; // auto-calculé
  surface_atteinte_pct: number; // intensité saisie
  intensite_pct: number; // auto-calculé
}

// ---- Traitement v2 (terrain Wilfried) ----

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

  // Champs enrichis
  type_traitement: 'cuivre' | 'soufre' | 'levain' | 'biocontrole' | 'phytosanitaire' | 'fertilisation' | 'autre' | null;
  matiere_active: string | null;
  concentration: number | null;
  unite: string | null;
  objectif: string | null;
  campagne: string | null;

  // Nouveaux champs v2 terrain
  stade: StadeTraitement | null;
  zone_traitee_type: ZoneTraiteeType | null;
  zone_traitee_rang: string | null; // "R1", "R2"…
  zone_traitee_surface_m2: number | null;
  type_application: TypeApplication | null;
  prelevement_sol: boolean | null;
  couvert: string | null;
  volume_bouillie_l: number | null;
  ph_eau: number | null;
  ph_bouillie: number | null;
  origine_eau: string | null;

  // Multi-rangs v3
  mode: 'rang' | 'surface' | null;
  nb_rangs: number | null;
  surface_ha: number | null;
  modalite_globale: string | null;
  heure: string | null;

  // GPS auto
  latitude: number | null;
  longitude: number | null;
}

// ---- Traitement rang (détail par rang) ----

export interface TraitementRang {
  id: string;
  traitement_id: string;
  rang: string; // "R1", "R2"…
  modalite_id: string; // code modalité
  dose: string | null;
  commentaire: string | null;
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

  // Champs complémentaires
  calcium: number | null;
  magnesium: number | null;
  cec: number | null;
  type_analyse: string | null;
  analyse_microbiote: Record<string, unknown> | null;

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

// Pour le formulaire de saisie (v2 — sans météo, sans traitement, sans scores)
export type ObservationFormData = Omit<Observation, "id" | "created_at">;

// ============================================================
// Phase 2 — Interfaces existantes
// ============================================================

export interface GuideNotation {
  id: string;
  code_indicateur: string;
  nom_indicateur: string;
  description: string;
  pourquoi_mesurer: string;
  methode_mesure: string;
  points_attention: string;
  echelle_type: 'numerique_0_5' | 'numerique_0_3' | 'pourcentage' | 'categoriel';
  seuils_json: Record<string, string>;
  exemple: string;
  unite: string | null;
  actif: boolean;
  ordre_affichage: number;
}

export interface TypeCulture {
  id: string;
  code: string;
  nom: string;
  description: string | null;
  actif: boolean;
}

export interface Espece {
  id: string;
  type_culture_id: string;
  code: string;
  nom: string;
  description: string | null;
  actif: boolean;
}

export interface Variete {
  id: string;
  espece_id: string;
  code: string;
  nom: string;
  description: string | null;
  actif: boolean;
}

export interface Site {
  id: string;
  nom: string;
  type_site: string;
  localisation: string | null;
  appellation: string | null;
  description: string | null;
  actif: boolean;
}

export interface ZoneCulture {
  id: string;
  site_id: string;
  type_culture_id: string;
  espece_id: string | null;
  variete_id: string | null;
  nom: string;
  code: string | null;
  surface_ha: number | null;
  nb_lignes_ou_rangs: number | null;
  type_sol: string | null;
  irrigation: boolean | null;
  mode_conduite: string | null;
  latitude: number | null;
  longitude: number | null;
  notes: string | null;
  actif: boolean;
}

export interface ExportFilters {
  site_id?: string;
  zone_culture_id?: string;
  campagne?: string;
  date_debut?: string;
  date_fin?: string;
  modalite?: string;
}

export type ExportFormat = 'csv' | 'excel' | 'json';

export interface CompletudeResult {
  status: 'complete' | 'partial' | 'incomplete';
  can_export: boolean;
  missing_required: string[];
  missing_recommended: string[];
  message: string;
}

export interface RapportConfig {
  site_id: string;
  zone_culture_id?: string;
  campagne: string;
  date_debut?: string;
  date_fin?: string;
}

export interface ParsedLaboValue {
  champ: string;
  valeur: number | null;
  confiance: 'haute' | 'moyenne' | 'basse' | 'non_detecte';
  valeur_brute?: string;
}

export interface ParsedLaboResult {
  valeurs: ParsedLaboValue[];
  texte_brut: string;
  fichier_nom: string;
}

export interface MeteoActuelle {
  temperature: number;
  humidite: number;
  precipitations: number;
  vent_kmh: number;
  description: string;
}

export interface PrevisionJour {
  date: string;
  temp_min: number;
  temp_max: number;
  precipitations: number;
  description: string;
}

export interface MeteoData {
  actuelle: MeteoActuelle;
  previsions: PrevisionJour[];
}

export interface PendingSync {
  id: string;
  type: 'observation' | 'traitement';
  data: Record<string, unknown>;
  created_at: string;
  status: 'pending' | 'syncing' | 'error';
}

export interface ResumeCampagne {
  id: string;
  zone_culture_id: string;
  campagne: string;
  nb_passages_cuivre: number;
  nb_passages_total: number;
  pression_mildiou_estimee: number | null;
  pression_oidium_estimee: number | null;
  incidents_sanitaires: string | null;
  commentaire_general: string | null;
}

export interface TimelineEvent {
  id: string;
  type: 'observation' | 'traitement' | 'analyse_sol';
  date: string;
  titre: string;
  resume: string;
  icone: string;
  couleur: string;
}

export interface ValidationError {
  champ: string;
  message: string;
  type: 'required' | 'range' | 'format';
}

export interface Notification {
  id: string;
  user_id: string | null;
  type: string;
  message: string;
  niveau: 'info' | 'warning' | 'error' | 'success';
  lu: boolean;
  created_at: string;
}

export interface UserParcelle {
  id: string;
  user_id: string;
  parcelle_id: string;
  created_at: string;
}

export interface IndicePerformance {
  id: string;
  zone_culture_id: string;
  campagne: string;
  reduction_cuivre: number | null;
  amelioration_sol: number | null;
  rendement_score: number | null;
  sante_plante: number | null;
  indice_global: number | null;
  created_at: string;
}

export interface Protocole {
  id: string;
  code: string;
  label: string;
  type: 'sequentiel' | 'meme_temps' | 'simple';
  description: string | null;
  actif: boolean;
  ordre: number;
}

export interface Produit {
  id: string;
  code: string;
  label: string;
  type: 'levain' | 'phyto' | 'autre';
  origine: string | null;
  description: string | null;
  actif: boolean;
  ordre: number;
}
