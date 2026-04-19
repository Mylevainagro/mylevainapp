// ============================================================
// MyLevain Agro — Données de démonstration v3
// Château Témoin — données complètes pour vérification outil
// ============================================================

import type { Observation, Traitement, AnalyseSol, Modalite, MaladieObservation } from './types';

// ---- Sites (structure unifiée) ----

export const DEMO_VIGNOBLES = [
  {
    id: 'demo-ct', nom: 'Château Témoin',
    localisation: 'Saint-Émilion, Gironde',
    appellation: 'Saint-Émilion Grand Cru',
    type_sol: 'Argilo-calcaire',
    type_site: 'chateau',
    type_exploitation: 'vignoble',
    adresse: '12 chemin des Vignes, 33330 Saint-Émilion',
    latitude: 44.8942, longitude: -0.1547,
  },
];

// ---- Parcelles ----

export const DEMO_PARCELLES = [
  { id: 'demo-ct-p1', vignoble_id: 'demo-ct', nom: 'Merlot — Coteau Sud', cepage: 'Merlot', nb_rangs: 7, surface: 1.2, type_culture: 'vigne', variete: 'Merlot', sol: 'argilo_calcaire' },
  { id: 'demo-ct-p2', vignoble_id: 'demo-ct', nom: 'Cabernet — Plateau Est', cepage: 'Cabernet Sauvignon', nb_rangs: 7, surface: 0.8, type_culture: 'vigne', variete: 'Cabernet Sauvignon', sol: 'grave' },
];

// ---- Placettes ----

export const DEMO_PLACETTES = [
  { id: 'demo-pl-1', parcelle_id: 'demo-ct-p1', modalite_id: 'M0', nom: 'Placette 1 — Témoin', nb_ceps: 10, description_position: 'Début rang 1', pieds_marques: 'Pieds 1 à 10' },
  { id: 'demo-pl-2', parcelle_id: 'demo-ct-p1', modalite_id: 'M1', nom: 'Placette 2 — Levain 1/4', nb_ceps: 10, description_position: 'Milieu rang 2', pieds_marques: 'Pieds 15 à 24' },
  { id: 'demo-pl-3', parcelle_id: 'demo-ct-p1', modalite_id: 'M2', nom: 'Placette 3 — Levain 1/2', nb_ceps: 10, description_position: 'Fin rang 3', pieds_marques: 'Pieds 30 à 39' },
  { id: 'demo-pl-4', parcelle_id: 'demo-ct-p1', modalite_id: 'M4', nom: 'Placette 4 — Levain+Cuivre', nb_ceps: 10, description_position: 'Milieu rang 5', pieds_marques: 'Pieds 20 à 29' },
];

// ---- Observations ----

const PASSAGES = [
  { mois: 'avril', date: '2026-04-22', bbch: '09' },
  { mois: 'mai', date: '2026-05-15', bbch: '15' },
  { mois: 'juin', date: '2026-06-18', bbch: '23' },
  { mois: 'juillet', date: '2026-07-16', bbch: '33' },
];

const RANGS_MODALITES: { rang: number; modalite: Modalite; code: string }[] = [
  { rang: 1, modalite: 'Témoin', code: 'M0' },
  { rang: 2, modalite: 'Levain 1/4', code: 'M1' },
  { rang: 3, modalite: 'Levain 1/2', code: 'M2' },
  { rang: 4, modalite: 'Témoin', code: 'M0' },
  { rang: 5, modalite: 'Levain 1/4 + Cuivre', code: 'M4' },
  { rang: 6, modalite: 'Levain 1/2 + Cuivre', code: 'M5' },
  { rang: 7, modalite: 'Témoin', code: 'M0' },
];

function genObservations(): Observation[] {
  const obs: Observation[] = [];
  let idx = 0;

  for (const passage of PASSAGES) {
    for (const mr of RANGS_MODALITES) {
      idx++;
      const isLevain = mr.modalite.includes('Levain');
      const isCuivre = mr.modalite.includes('Cuivre');
      const mi = PASSAGES.indexOf(passage);

      const v = Math.min(5, Math.round((isLevain ? 3.5 : 2.8) + mi * (isLevain ? 0.5 : 0.2))) as 0|1|2|3|4|5;
      const c = Math.min(5, Math.round((isLevain ? 3 : 2.5) + mi * 0.4)) as 0|1|2|3|4|5;

      // Placette mapping
      const placetteMap: Record<string, string> = { M0: 'demo-pl-1', M1: 'demo-pl-2', M2: 'demo-pl-3', M4: 'demo-pl-4', M5: 'demo-pl-4' };

      obs.push({
        id: `demo-obs-${idx}`,
        parcelle_id: 'demo-ct-p1',
        rang: mr.rang,
        modalite: mr.modalite,
        date: passage.date,
        heure: mi < 2 ? '08:30' : '09:15',
        mois: passage.mois,
        stade_bbch: passage.bbch,
        repetition: 1,
        placette_id: placetteMap[mr.code] ?? null,
        // État plante
        vigueur: v,
        croissance: c,
        homogeneite: (isLevain ? 4 : 3) as 0|1|2|3|4|5,
        couleur_feuilles: (isLevain ? Math.min(5, 3 + mi) : Math.min(5, 2 + mi)) as 0|1|2|3|4|5,
        turgescence: (isLevain ? 4 : Math.max(2, 3 - mi)) as 0|1|2|3|4|5,
        // Symptômes
        brulures: (isCuivre && mi >= 2 ? 1 : 0) as 0|1|2|3|4|5,
        necroses: (isLevain ? 0 : Math.min(3, mi)) as 0|1|2|3|4|5,
        deformations: 0,
        escargots: mi === 0,
        acariens: mi >= 2 && !isLevain,
        // Grappes
        nb_grappes_par_cep: 8 + (isLevain ? 4 : 0) + mi,
        taille_grappes: (isLevain ? Math.min(5, 3 + mi) : Math.min(5, 2 + mi)) as 0|1|2|3|4|5,
        homogeneite_grappes: (isLevain ? 4 : 3) as 0|1|2|3|4|5,
        // Rendement (10 ceps)
        nombre_grappes: (8 + (isLevain ? 4 : 0) + mi) * 10,
        poids_moyen_grappe: 120 + (isLevain ? 30 : 0) + mi * 10,
        poids_100_baies: mi >= 2 ? (isLevain ? 180 + mi * 5 : 155 + mi * 3) : null,
        rendement_estime: isLevain ? (isCuivre ? 9200 + mi * 200 : 8500 + mi * 200) : 6800 + mi * 150,
        rendement_reel: mi === 3 ? (isLevain ? (isCuivre ? 9800 : 9100) : 6900) : null,
        // Bio sol
        vie_biologique_visible: isLevain ? 4 : 2,
        presence_vers_de_terre: isLevain ? 3 : 1,
        structure_sol: isLevain ? 4 : 3,
        odeur_sol: isLevain ? 3 : 2,
        // Qualité raisin
        brix: mi === 3 ? (isLevain ? 23.2 : 19.8) : null,
        ph_raisin: mi === 3 ? (isLevain ? 3.35 : 3.52) : null,
        commentaires: [
          isLevain ? 'Bonne vigueur générale' : 'Développement moyen',
          mi === 0 ? ', présence escargots en bordure' : '',
          mi >= 2 && !isLevain ? ', acariens détectés face inférieure' : '',
          isCuivre && mi >= 2 ? ', légères brûlures cuivre sur jeunes feuilles' : '',
          mi === 3 ? `, BBCH ${passage.bbch} — fermeture grappe` : '',
        ].join(''),
        created_at: `${passage.date}T10:00:00Z`,
      });
    }
  }
  return obs;
}

// ---- Traitements (multi-rangs) ----

function genTraitements(): Traitement[] {
  const traitements: Traitement[] = [];
  let idx = 0;
  const dates = ['2026-04-10', '2026-04-28', '2026-05-12', '2026-05-28', '2026-06-10', '2026-06-25', '2026-07-08', '2026-07-22'];
  const stades: Array<'A'|'B'|'C'|'D'> = ['A', 'A', 'B', 'B', 'C', 'C', 'D', 'D'];
  const operateurs = ['Wilfried B.', 'Mathieu D.', 'Wilfried B.', 'Mathieu D.', 'Wilfried B.', 'Mathieu D.', 'Wilfried B.', 'Mathieu D.'];

  for (let d = 0; d < dates.length; d++) {
    for (const mr of RANGS_MODALITES) {
      if (mr.modalite === 'Témoin') continue;
      idx++;
      const isCuivre = mr.modalite.includes('Cuivre');
      const temp = 14 + d * 2 + Math.round(Math.random() * 3);
      traitements.push({
        id: `demo-trait-${idx}`,
        parcelle_id: 'demo-ct-p1',
        rang: mr.rang,
        modalite: mr.modalite,
        date: dates[d],
        produit: isCuivre ? 'Surnageant + Cuivre' : 'Surnageant de levain',
        dose: mr.modalite.includes('1/4') ? '1L/3L eau' : '2L/2L eau',
        methode_application: 'pulve_dos',
        temperature: temp,
        humidite: 75 - d * 3,
        conditions_meteo: d % 3 === 0 ? 'Nuageux' : d % 3 === 1 ? 'Ensoleillé' : 'Couvert',
        operateur: operateurs[d],
        notes: d === 0 ? 'Premier passage saison, sol encore humide' : d === dates.length - 1 ? 'Dernier passage avant vendanges' : null,
        created_at: `${dates[d]}T07:30:00Z`,
        type_traitement: isCuivre ? 'cuivre' : 'levain',
        matiere_active: isCuivre ? 'Hydroxyde de cuivre + surnageant levain' : 'Surnageant de levain naturel',
        concentration: isCuivre ? 3.5 : null,
        unite: isCuivre ? 'g/L' : null,
        objectif: d < 3 ? 'Prévention mildiou' : 'Prévention mildiou + stimulation vigueur',
        campagne: '2026',
        stade: stades[d],
        zone_traitee_type: 'rang',
        zone_traitee_rang: `R${mr.rang}`,
        zone_traitee_surface_m2: null,
        type_application: 'pulve_dos',
        prelevement_sol: d === 0 || d === dates.length - 1,
        couvert: d % 3 === 0 ? 'Nuageux' : d % 3 === 1 ? 'Ensoleillé' : 'Couvert',
        volume_bouillie_l: 4,
        ph_eau: 7.1 + Math.round(Math.random() * 3) / 10,
        ph_bouillie: 5.6 + Math.round(Math.random() * 4) / 10,
        origine_eau: 'Forage',
        mode: 'rang',
        nb_rangs: 7,
        surface_ha: null,
        modalite_globale: null,
        heure: d % 2 === 0 ? '07:30' : '08:00',
        latitude: 44.8942,
        longitude: -0.1547,
      });
    }
  }
  return traitements;
}

// ---- Analyses sol ----

function genAnalyses(): AnalyseSol[] {
  return [
    {
      id: 'demo-ct-analyse-t0', parcelle_id: 'demo-ct-p1', date_prelevement: '2026-03-10', phase: 'T0',
      ph: 7.1, matiere_organique_pct: 2.8, rapport_c_n: 12.1, azote_total: 1.6,
      phosphore: 38, potassium: 165, biomasse_microbienne: 340, respiration_sol: 18,
      bacteries_totales: 850000, champignons_totaux: 42000,
      cuivre_total: 48, cuivre_biodisponible: 9.8,
      cadmium_total: 0.21, cadmium_biodisponible: 0.04,
      plomb_total: 18, plomb_biodisponible: 2.1,
      arsenic_total: 5.1, arsenic_biodisponible: 0.8,
      manganese_total: 310, manganese_biodisponible: 45,
      score_sante_sol: 3.2, score_contamination_metaux: 2.4,
      calcium: 2600, magnesium: 160, cec: 11.8,
      type_analyse: 'labo complet', analyse_microbiote: null,
      fichier_pdf_url: null, created_at: '2026-03-10T10:00:00Z',
    },
    {
      id: 'demo-ct-analyse-t6', parcelle_id: 'demo-ct-p1', date_prelevement: '2026-07-20', phase: 'Tfinal',
      ph: 6.9, matiere_organique_pct: 3.4, rapport_c_n: 11.2, azote_total: 2.0,
      phosphore: 48, potassium: 188, biomasse_microbienne: 480, respiration_sol: 26,
      bacteries_totales: 1200000, champignons_totaux: 68000,
      cuivre_total: 44, cuivre_biodisponible: 8.2,
      cadmium_total: 0.19, cadmium_biodisponible: 0.03,
      plomb_total: 16, plomb_biodisponible: 1.8,
      arsenic_total: 4.8, arsenic_biodisponible: 0.7,
      manganese_total: 295, manganese_biodisponible: 40,
      score_sante_sol: 4.1, score_contamination_metaux: 2.1,
      calcium: 2900, magnesium: 195, cec: 13.5,
      type_analyse: 'labo complet', analyse_microbiote: null,
      fichier_pdf_url: null, created_at: '2026-07-20T10:00:00Z',
    },
  ];
}

// ---- Maladies observations ----

function genMaladies(): MaladieObservation[] {
  const maladies: MaladieObservation[] = [];
  let idx = 0;

  for (const passage of PASSAGES) {
    for (const mr of RANGS_MODALITES) {
      const mi = PASSAGES.indexOf(passage);
      const obsIdx = mi * RANGS_MODALITES.length + RANGS_MODALITES.indexOf(mr) + 1;
      const obsId = `demo-obs-${obsIdx}`;
      const isLevain = mr.modalite.includes('Levain');
      const isCuivre = mr.modalite.includes('Cuivre');

      // Mildiou feuille — tous les rangs, plus fort sur témoins
      const milF = isLevain ? (isCuivre ? Math.max(0, mi - 1) : Math.min(4, mi)) : Math.min(12, 2 + mi * 3);
      const milS = isLevain ? (isCuivre ? 3 + mi : 6 + mi * 2) : 15 + mi * 8;
      if (milF > 0) {
        idx++;
        maladies.push({
          id: `demo-mal-${idx}`, observation_id: obsId, type: 'mildiou', zone: 'feuille',
          nb_feuilles_atteintes: Math.min(20, milF),
          frequence_pct: Math.round(Math.min(20, milF) / 20 * 1000) / 10,
          surface_atteinte_pct: Math.min(100, milS),
          intensite_pct: Math.round(Math.min(20, milF) / 20 * Math.min(100, milS) / 100 * 1000) / 10,
        });
      }

      // Mildiou grappe — à partir de juin sur témoins
      if (mi >= 2 && !isLevain) {
        idx++;
        const gF = 1 + mi;
        maladies.push({
          id: `demo-mal-${idx}`, observation_id: obsId, type: 'mildiou', zone: 'grappe',
          nb_feuilles_atteintes: gF, frequence_pct: Math.round(gF / 20 * 1000) / 10,
          surface_atteinte_pct: 10 + mi * 5, intensite_pct: Math.round(gF / 20 * (10 + mi * 5) / 100 * 1000) / 10,
        });
      }

      // Oïdium — juin/juillet, surtout témoins
      if (mi >= 2 && !isLevain) {
        idx++;
        const oF = 1 + (mi - 1);
        maladies.push({
          id: `demo-mal-${idx}`, observation_id: obsId, type: 'oidium', zone: 'feuille',
          nb_feuilles_atteintes: oF, frequence_pct: Math.round(oF / 20 * 1000) / 10,
          surface_atteinte_pct: 5 + mi * 2, intensite_pct: Math.round(oF / 20 * (5 + mi * 2) / 100 * 1000) / 10,
        });
      }

      // Botrytis — juillet sur grappes témoins
      if (mi === 3 && !isLevain) {
        idx++;
        maladies.push({
          id: `demo-mal-${idx}`, observation_id: obsId, type: 'botrytis', zone: 'grappe',
          nb_feuilles_atteintes: 2, frequence_pct: 10, surface_atteinte_pct: 8, intensite_pct: 0.8,
        });
      }

      // Black rot — rare, juillet, 1 témoin
      if (mi === 3 && mr.rang === 7) {
        idx++;
        maladies.push({
          id: `demo-mal-${idx}`, observation_id: obsId, type: 'black_rot', zone: 'feuille',
          nb_feuilles_atteintes: 1, frequence_pct: 5, surface_atteinte_pct: 3, intensite_pct: 0.15,
        });
      }
    }
  }
  return maladies;
}

// ---- Traitement rangs (détail multi-rangs) ----

export interface DemoTraitementRang {
  id: string;
  traitement_id: string;
  rang: string;
  modalite_id: string;
  dose: string | null;
  commentaire: string | null;
}

function genTraitementRangs(): DemoTraitementRang[] {
  const rangs: DemoTraitementRang[] = [];
  let idx = 0;
  const traitements = genTraitements();
  // Group by date (1 fiche = 1 date)
  const dates = [...new Set(traitements.map(t => t.date))];
  for (const date of dates) {
    const ficheId = `demo-fiche-${dates.indexOf(date) + 1}`;
    for (const mr of RANGS_MODALITES) {
      idx++;
      rangs.push({
        id: `demo-tr-${idx}`,
        traitement_id: ficheId,
        rang: `R${mr.rang}`,
        modalite_id: mr.code,
        dose: mr.modalite === 'Témoin' ? null : (mr.modalite.includes('1/4') ? '1L/3L' : '2L/2L'),
        commentaire: mr.modalite === 'Témoin' ? 'Témoin — pas de traitement' : null,
      });
    }
  }
  return rangs;
}

// ---- Stats ----

export const DEMO_STATS = {
  nb_observations: 28, // 4 passages × 7 rangs
  nb_traitements: 32, // 8 dates × 4 rangs traités
  nb_analyses: 2,
  nb_sites: 1,
  nb_parcelles: 2,
  nb_placettes: 4,
  derniere_observation: '16 juillet 2026',
  dernier_traitement: '22 juillet 2026',
};

// ---- Exports ----

export const DEMO_OBSERVATIONS = genObservations();
export const DEMO_TRAITEMENTS = genTraitements();
export const DEMO_ANALYSES = genAnalyses();
export const DEMO_MALADIES = genMaladies();
export const DEMO_TRAITEMENT_RANGS = genTraitementRangs();
