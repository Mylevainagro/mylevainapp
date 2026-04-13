// ============================================================
// MyLevain Agro — Données de démonstration réalistes
// Pour présentation investisseurs
// ============================================================

import type { Observation, Traitement, AnalyseSol, Modalite } from './types';

// ---- Vignobles & Parcelles ----

export const DEMO_VIGNOBLES = [
  { id: 'demo-v1', nom: 'Château Piotte', localisation: 'Saint-Émilion', appellation: 'Saint-Émilion Grand Cru', type_sol: 'Argilo-calcaire' },
  { id: 'demo-v2', nom: 'Domaine Pape Clément', localisation: 'Pessac-Léognan', appellation: 'Grand Cru Classé de Graves', type_sol: 'Graves profondes' },
];

export const DEMO_PARCELLES = [
  { id: 'demo-p1', vignoble_id: 'demo-v1', nom: 'Parcelle Merlot — Coteau Sud', cepage: 'Merlot', nb_rangs: 7 },
  { id: 'demo-p2', vignoble_id: 'demo-v1', nom: 'Parcelle Cabernet — Plateau', cepage: 'Cabernet Sauvignon', nb_rangs: 7 },
  { id: 'demo-p3', vignoble_id: 'demo-v2', nom: 'Parcelle Principale', cepage: 'Merlot / Cabernet', nb_rangs: 7 },
];

// ---- Observations (campagne 2026, 3 passages mensuels × 7 rangs) ----

const MOIS_PASSAGES = [
  { mois: 'mai', date: '2026-05-15' },
  { mois: 'juin', date: '2026-06-18' },
  { mois: 'juillet', date: '2026-07-16' },
];

const MODALITES_RANGS: { rang: number; modalite: Modalite }[] = [
  { rang: 1, modalite: 'Témoin' },
  { rang: 2, modalite: 'Levain 1/4' },
  { rang: 3, modalite: 'Levain 1/2' },
  { rang: 4, modalite: 'Témoin' },
  { rang: 5, modalite: 'Levain 1/4 + Cuivre' },
  { rang: 6, modalite: 'Levain 1/2 + Cuivre' },
  { rang: 7, modalite: 'Témoin' },
];

function genObservations(): Observation[] {
  const obs: Observation[] = [];
  let idx = 0;

  for (const passage of MOIS_PASSAGES) {
    for (const mr of MODALITES_RANGS) {
      idx++;
      const isLevain = mr.modalite.includes('Levain');
      const isCuivre = mr.modalite.includes('Cuivre');
      const monthIdx = MOIS_PASSAGES.indexOf(passage);

      // Levain rangs show better scores over time
      const vigueurBase = isLevain ? 3.5 : 3;
      const vigueur = Math.min(5, Math.round((vigueurBase + monthIdx * (isLevain ? 0.5 : 0.2)) * 10) / 10) as 0|1|2|3|4|5;

      const mildiouBase = isLevain ? (isCuivre ? 0.5 : 1) : 2;
      const mildiouPresence = Math.min(5, Math.round(mildiouBase + monthIdx * (isLevain ? 0.2 : 0.8))) as 0|1|2|3|4|5;

      const scorePlante = Math.round((vigueur * 0.6 + (5 - mildiouPresence) * 0.4) * 10) / 10;
      const scoreSanitaire = Math.round((5 - mildiouPresence * 0.8) * 10) / 10;

      obs.push({
        id: `demo-obs-${idx}`,
        parcelle_id: 'demo-p1',
        rang: mr.rang,
        modalite: mr.modalite,
        date: passage.date,
        heure: '09:30',
        mois: passage.mois,
        meteo: monthIdx === 2 ? 'Ensoleillé' : 'Nuageux',
        temperature: 18 + monthIdx * 4,
        humidite: 70 - monthIdx * 8,
        vent: 'Faible',
        pluie_recente: monthIdx === 0,
        derniere_pluie: monthIdx === 0 ? '2026-05-13' : null,
        humidite_sol: monthIdx === 0 ? 'Humide' : 'Sec',
        volume_applique_l: isLevain ? 4 : null,
        ph_surnageant: isLevain ? 4.2 : null,
        surnageant_l: isLevain ? (mr.modalite.includes('1/4') ? 1 : 2) : null,
        eau_l: isLevain ? (mr.modalite.includes('1/4') ? 3 : 2) : null,
        cuivre: isCuivre,
        date_surnageant: isLevain ? passage.date : null,
        date_cuivre: isCuivre ? passage.date : null,
        vigueur,
        croissance: Math.min(5, vigueur) as 0|1|2|3|4|5,
        homogeneite: (isLevain ? 4 : 3) as 0|1|2|3|4|5,
        couleur_feuilles: (isLevain ? 4 : 3) as 0|1|2|3|4|5,
        epaisseur_feuilles: (isLevain ? 4 : 3) as 0|1|2|3|4|5,
        turgescence: (isLevain ? 4 : 3) as 0|1|2|3|4|5,
        brulures: 0,
        necroses: (isLevain ? 0 : 1) as 0|1|2|3|4|5,
        deformations: 0,
        mildiou_presence: mildiouPresence,
        mildiou_intensite: mildiouPresence * 12,
        localisation_mildiou: mildiouPresence > 1 ? 'Feuilles' : null,
        progression: monthIdx > 0 ? (isLevain ? 'En baisse' : 'En hausse') : 'Stable',
        pression_mildiou: Math.min(3, Math.round(mildiouPresence * 0.6)) as 0|1|2|3,
        nb_grappes_par_cep: 10 + (isLevain ? 3 : 0),
        taille_grappes: (isLevain ? 4 : 3) as 0|1|2|3|4|5,
        homogeneite_grappes: (isLevain ? 4 : 3) as 0|1|2|3|4|5,
        nombre_grappes: 10 + (isLevain ? 3 : 0),
        poids_moyen_grappe: 140 + (isLevain ? 25 : 0),
        rendement_estime: isLevain ? (isCuivre ? 9500 : 8800) : 7200,
        rendement_reel: monthIdx === 2 ? (isLevain ? (isCuivre ? 9800 : 9100) : 7000) : null,
        score_plante: scorePlante,
        score_sanitaire: scoreSanitaire,
        commentaires: isLevain
          ? `Rang ${mr.rang} — Bonne vigueur, feuillage dense et sain.`
          : `Rang ${mr.rang} — Développement normal, quelques taches mildiou.`,
        created_at: `${passage.date}T10:00:00Z`,
      });
    }
  }
  return obs;
}

// ---- Traitements ----

function genTraitements(): Traitement[] {
  const traitements: Traitement[] = [];
  let idx = 0;

  const dates = ['2026-04-20', '2026-05-10', '2026-05-28', '2026-06-12', '2026-06-30', '2026-07-15'];

  for (const date of dates) {
    for (const mr of MODALITES_RANGS) {
      if (mr.modalite === 'Témoin') continue;
      idx++;
      const isCuivre = mr.modalite.includes('Cuivre');
      traitements.push({
        id: `demo-trait-${idx}`,
        parcelle_id: 'demo-p1',
        rang: mr.rang,
        modalite: mr.modalite,
        date,
        produit: isCuivre ? 'Surnageant + Cuivre' : 'Surnageant de levain',
        dose: mr.modalite.includes('1/4') ? '1L/3L eau' : '2L/2L eau',
        methode_application: 'Pulvérisation',
        temperature: 20,
        humidite: 65,
        conditions_meteo: 'Nuageux',
        operateur: 'Mathieu D.',
        notes: null,
        created_at: `${date}T08:00:00Z`,
        type_traitement: isCuivre ? 'cuivre' : 'levain',
        matiere_active: isCuivre ? 'Hydroxyde de cuivre + levain' : 'Surnageant de levain',
        concentration: isCuivre ? 3.5 : null,
        unite: isCuivre ? 'g/L' : null,
        objectif: 'Prévention mildiou + stimulation',
        campagne: '2026',
      });
    }
  }
  return traitements;
}

// ---- Analyses sol ----

function genAnalyses(): AnalyseSol[] {
  return [
    {
      id: 'demo-analyse-t0',
      parcelle_id: 'demo-p1',
      date_prelevement: '2026-03-15',
      phase: 'T0',
      ph: 6.8,
      matiere_organique_pct: 3.2,
      rapport_c_n: 11.5,
      azote_total: 1.8,
      phosphore: 45,
      potassium: 180,
      biomasse_microbienne: 380,
      respiration_sol: 22,
      bacteries_totales: null,
      champignons_totaux: null,
      cuivre_total: 42,
      cuivre_biodisponible: 8.5,
      cadmium_total: 0.18,
      cadmium_biodisponible: null,
      plomb_total: 15,
      plomb_biodisponible: null,
      arsenic_total: 4.2,
      arsenic_biodisponible: null,
      manganese_total: 280,
      manganese_biodisponible: null,
      score_sante_sol: 3.5,
      score_contamination_metaux: 2.1,
      fichier_pdf_url: null,
      created_at: '2026-03-15T10:00:00Z',
    },
    {
      id: 'demo-analyse-tf',
      parcelle_id: 'demo-p1',
      date_prelevement: '2026-09-20',
      phase: 'Tfinal',
      ph: 6.9,
      matiere_organique_pct: 3.8,
      rapport_c_n: 10.8,
      azote_total: 2.1,
      phosphore: 52,
      potassium: 195,
      biomasse_microbienne: 520,
      respiration_sol: 28,
      bacteries_totales: null,
      champignons_totaux: null,
      cuivre_total: 38,
      cuivre_biodisponible: 7.2,
      cadmium_total: 0.16,
      cadmium_biodisponible: null,
      plomb_total: 14,
      plomb_biodisponible: null,
      arsenic_total: 3.9,
      arsenic_biodisponible: null,
      manganese_total: 265,
      manganese_biodisponible: null,
      score_sante_sol: 4.2,
      score_contamination_metaux: 1.8,
      fichier_pdf_url: null,
      created_at: '2026-09-20T10:00:00Z',
    },
  ];
}

// ---- Statistiques résumées pour la home ----

export const DEMO_STATS = {
  nb_observations: 21,
  nb_traitements: 24,
  nb_analyses: 2,
  score_global: 4.1,
  score_plante: 4.3,
  score_sanitaire: 3.8,
  score_sol: 3.9,
  rendement_moyen_levain: 9150,
  rendement_moyen_temoin: 7200,
  evolution_rendement: '+27%',
  derniere_observation: '16 juillet 2026',
  dernier_traitement: '15 juillet 2026',
};

// ---- Export all ----

export const DEMO_OBSERVATIONS = genObservations();
export const DEMO_TRAITEMENTS = genTraitements();
export const DEMO_ANALYSES = genAnalyses();
