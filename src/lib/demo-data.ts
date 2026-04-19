// ============================================================
// MyLevain Agro — Données de démonstration v2
// Adapté structure terrain Wilfried — Avril 2026
// ============================================================

import type { Observation, Traitement, AnalyseSol, Modalite, MaladieObservation } from './types';

// ---- Vignobles & Parcelles ----

export const DEMO_VIGNOBLES = [
  { id: 'demo-v1', nom: 'Château Piotte', localisation: 'Saint-Émilion', appellation: 'Saint-Émilion Grand Cru', type_sol: 'Argilo-calcaire', type_site: 'chateau' },
  { id: 'demo-v2', nom: 'Domaine Pape Clément', localisation: 'Pessac-Léognan', appellation: 'Grand Cru Classé de Graves', type_sol: 'Graves profondes', type_site: 'domaine' },
  { id: 'demo-v3', nom: 'Ferme des Tomates Bio', localisation: 'Lot-et-Garonne', appellation: 'Maraîchage biologique', type_sol: 'Limoneux', type_site: 'ferme' },
  { id: 'demo-v4', nom: 'Verger du Périgord', localisation: 'Dordogne', appellation: 'Arboriculture fruitière', type_sol: 'Argilo-limoneux', type_site: 'exploitation' },
];

export const DEMO_PARCELLES = [
  { id: 'demo-p1', vignoble_id: 'demo-v1', nom: 'Parcelle Merlot — Coteau Sud', cepage: 'Merlot', nb_rangs: 7 },
  { id: 'demo-p2', vignoble_id: 'demo-v1', nom: 'Parcelle Cabernet — Plateau', cepage: 'Cabernet Sauvignon', nb_rangs: 7 },
  { id: 'demo-p3', vignoble_id: 'demo-v2', nom: 'Parcelle Principale', cepage: 'Merlot / Cabernet', nb_rangs: 7 },
  { id: 'demo-p4', vignoble_id: 'demo-v3', nom: 'Serre Tomates Roma', cepage: 'Roma / Cœur de Bœuf', nb_rangs: 4 },
  { id: 'demo-p5', vignoble_id: 'demo-v3', nom: 'Plein champ Tomates Cerises', cepage: 'Cerise rouge', nb_rangs: 6 },
  { id: 'demo-p6', vignoble_id: 'demo-v4', nom: 'Verger Pommiers Gala', cepage: 'Gala / Golden', nb_rangs: 5 },
  { id: 'demo-p7', vignoble_id: 'demo-v4', nom: 'Noisetiers — Parcelle Nord', cepage: 'Noisetier commun', nb_rangs: 3 },
];

// ---- Observations v2 (sans météo, sans traitement, sans scores calculés) ----

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

const STADES_PAR_MOIS = ['15', '23', '33'];

function genObservations(): Observation[] {
  const obs: Observation[] = [];
  let idx = 0;

  for (const passage of MOIS_PASSAGES) {
    for (const mr of MODALITES_RANGS) {
      idx++;
      const isLevain = mr.modalite.includes('Levain');
      const isCuivre = mr.modalite.includes('Cuivre');
      const monthIdx = MOIS_PASSAGES.indexOf(passage);

      const vigueurBase = isLevain ? 3.5 : 3;
      const vigueur = Math.min(5, Math.round((vigueurBase + monthIdx * (isLevain ? 0.5 : 0.2)) * 10) / 10) as 0|1|2|3|4|5;

      obs.push({
        id: `demo-obs-${idx}`,
        parcelle_id: 'demo-p1',
        rang: mr.rang,
        modalite: mr.modalite,
        date: passage.date,
        heure: '09:30',
        mois: passage.mois,
        stade_bbch: STADES_PAR_MOIS[monthIdx],
        repetition: 1,
        placette_id: null,
        vigueur,
        croissance: Math.min(5, vigueur) as 0|1|2|3|4|5,
        homogeneite: (isLevain ? 4 : 3) as 0|1|2|3|4|5,
        couleur_feuilles: (isLevain ? 4 : 3) as 0|1|2|3|4|5,
        turgescence: (isLevain ? 4 : 3) as 0|1|2|3|4|5,
        brulures: 0,
        necroses: (isLevain ? 0 : 1) as 0|1|2|3|4|5,
        deformations: 0,
        escargots: monthIdx === 0 ? true : false,
        acariens: false,
        nb_grappes_par_cep: 10 + (isLevain ? 3 : 0),
        taille_grappes: (isLevain ? 4 : 3) as 0|1|2|3|4|5,
        homogeneite_grappes: (isLevain ? 4 : 3) as 0|1|2|3|4|5,
        nombre_grappes: 10 + (isLevain ? 3 : 0),
        poids_moyen_grappe: 140 + (isLevain ? 25 : 0),
        poids_100_baies: monthIdx === 2 ? (isLevain ? 185 : 165) : null,
        rendement_estime: isLevain ? (isCuivre ? 9500 : 8800) : 7200,
        rendement_reel: monthIdx === 2 ? (isLevain ? (isCuivre ? 9800 : 9100) : 7000) : null,
        vie_biologique_visible: isLevain ? 4 : 2,
        presence_vers_de_terre: isLevain ? 3 : 1,
        structure_sol: isLevain ? 4 : 3,
        odeur_sol: isLevain ? 3 : 2,
        brix: monthIdx === 2 ? (isLevain ? 22.5 : 20.1) : null,
        ph_raisin: monthIdx === 2 ? 3.4 : null,
        commentaires: isLevain
          ? `Rang ${mr.rang} — Bonne vigueur, feuillage dense et sain.`
          : `Rang ${mr.rang} — Développement normal.`,
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
        methode_application: 'pulve_dos',
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
        stade: 'B',
        zone_traitee_type: 'rang',
        zone_traitee_rang: `R${mr.rang}`,
        zone_traitee_surface_m2: null,
        type_application: 'pulve_dos',
        prelevement_sol: false,
        couvert: 'Nuageux',
        volume_bouillie_l: 4,
        ph_eau: 7.2,
        ph_bouillie: 5.8,
        origine_eau: 'Forage',
        mode: 'rang',
        nb_rangs: 7,
        surface_ha: null,
        modalite_globale: null,
        heure: '08:00',
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
      ph: 6.8, matiere_organique_pct: 3.2, rapport_c_n: 11.5, azote_total: 1.8,
      phosphore: 45, potassium: 180, biomasse_microbienne: 380, respiration_sol: 22,
      bacteries_totales: null, champignons_totaux: null,
      cuivre_total: 42, cuivre_biodisponible: 8.5,
      cadmium_total: 0.18, cadmium_biodisponible: null,
      plomb_total: 15, plomb_biodisponible: null,
      arsenic_total: 4.2, arsenic_biodisponible: null,
      manganese_total: 280, manganese_biodisponible: null,
      score_sante_sol: 3.5, score_contamination_metaux: 2.1,
      calcium: 2800, magnesium: 180, cec: 12.5,
      type_analyse: 'labo', analyse_microbiote: null,
      fichier_pdf_url: null, created_at: '2026-03-15T10:00:00Z',
    },
    {
      id: 'demo-analyse-tf',
      parcelle_id: 'demo-p1',
      date_prelevement: '2026-09-20',
      phase: 'Tfinal',
      ph: 6.9, matiere_organique_pct: 3.8, rapport_c_n: 10.8, azote_total: 2.1,
      phosphore: 52, potassium: 195, biomasse_microbienne: 520, respiration_sol: 28,
      bacteries_totales: null, champignons_totaux: null,
      cuivre_total: 38, cuivre_biodisponible: 7.2,
      cadmium_total: 0.16, cadmium_biodisponible: null,
      plomb_total: 14, plomb_biodisponible: null,
      arsenic_total: 3.9, arsenic_biodisponible: null,
      manganese_total: 265, manganese_biodisponible: null,
      score_sante_sol: 4.2, score_contamination_metaux: 1.8,
      calcium: 3100, magnesium: 210, cec: 14.2,
      type_analyse: 'labo', analyse_microbiote: null,
      fichier_pdf_url: null, created_at: '2026-09-20T10:00:00Z',
    },
  ];
}

// ---- Maladies observations v2 (structure Wilfried — 20 feuilles) ----

function genMaladies(): MaladieObservation[] {
  const maladies: MaladieObservation[] = [];
  let idx = 0;

  for (const passage of MOIS_PASSAGES) {
    for (const mr of MODALITES_RANGS) {
      const obsId = `demo-obs-${MOIS_PASSAGES.indexOf(passage) * MODALITES_RANGS.length + MODALITES_RANGS.indexOf(mr) + 1}`;
      const isLevain = mr.modalite.includes('Levain');
      const isCuivre = mr.modalite.includes('Cuivre');
      const monthIdx = MOIS_PASSAGES.indexOf(passage);

      // Mildiou — plus présent sur témoins, moins sur levain+cuivre
      const mildiouFeuilles = isLevain ? (isCuivre ? 1 + monthIdx : 2 + monthIdx) : 4 + monthIdx * 2;
      const mildiouSurface = isLevain ? (isCuivre ? 5 : 10) : 20 + monthIdx * 5;
      idx++;
      maladies.push({
        id: `demo-mal-${idx}`,
        observation_id: obsId,
        type: 'mildiou',
        zone: 'feuille',
        nb_feuilles_atteintes: Math.min(20, mildiouFeuilles),
        frequence_pct: Math.round(Math.min(20, mildiouFeuilles) / 20 * 100 * 10) / 10,
        surface_atteinte_pct: mildiouSurface,
        intensite_pct: Math.round(Math.min(20, mildiouFeuilles) / 20 * mildiouSurface / 100 * 100 * 10) / 10,
      });

      // Oïdium — apparaît en juin/juillet sur témoins
      if (monthIdx >= 1 && !isLevain) {
        idx++;
        const oidiumFeuilles = 2 + monthIdx;
        maladies.push({
          id: `demo-mal-${idx}`,
          observation_id: obsId,
          type: 'oidium',
          zone: 'feuille',
          nb_feuilles_atteintes: oidiumFeuilles,
          frequence_pct: Math.round(oidiumFeuilles / 20 * 100 * 10) / 10,
          surface_atteinte_pct: 8,
          intensite_pct: Math.round(oidiumFeuilles / 20 * 8 / 100 * 100 * 10) / 10,
        });
      }

      // Botrytis — apparaît en juillet sur grappes témoins
      if (monthIdx === 2 && !isLevain) {
        idx++;
        maladies.push({
          id: `demo-mal-${idx}`,
          observation_id: obsId,
          type: 'botrytis',
          zone: 'grappe',
          nb_feuilles_atteintes: 3,
          frequence_pct: 15,
          surface_atteinte_pct: 12,
          intensite_pct: 1.8,
        });
      }
    }
  }
  return maladies;
}

export const DEMO_STATS = {
  nb_observations: 21,
  nb_traitements: 24,
  nb_analyses: 2,
  nb_sites: 4,
  nb_cultures: 3,
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

export const DEMO_OBSERVATIONS = genObservations();
export const DEMO_TRAITEMENTS = genTraitements();
export const DEMO_ANALYSES = genAnalyses();
export const DEMO_MALADIES = genMaladies();
