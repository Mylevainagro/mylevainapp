// Feature: phase2-evolution, Property 8: Assemblage des données du rapport PDF
// Feature: phase2-evolution, Property 9: Génération de conclusion synthétique
// **Validates: Requirements 4.1, 4.2, 4.4, 4.5**
//
// Property 8: Pour toute configuration de rapport valide (site_id, campagne),
// les données assemblées pour le PDF doivent contenir : le nom du site, la parcelle,
// le cépage/culture, la période couverte, tous les types de scores (global, sol,
// plante, maladie, biostimulant), et les tableaux récapitulatifs (observations,
// traitements, analyses sol).
//
// Property 9: Pour tout ensemble valide de scores et données de campagne, la
// fonction de génération de conclusion doit retourner une chaîne non vide contenant
// des références aux scores principaux.

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import {
  assemblerDonneesRapport,
  genererConclusionSynthetique,
  type RapportData,
} from '@/lib/rapport-pdf';
import type { RapportConfig } from '@/lib/types';

// ---------------------------------------------------------------------------
// Generators
// ---------------------------------------------------------------------------

/** Non-empty safe string (no problematic chars) */
const safeStringArb = fc
  .string({ minLength: 1, maxLength: 30 })
  .map((s) => s.replace(/[\n\r\t]/g, ' ').trim())
  .filter((s) => s.length > 0);

/** Date string YYYY-MM-DD */
const dateArb = fc
  .tuple(
    fc.integer({ min: 2020, max: 2030 }),
    fc.integer({ min: 1, max: 12 }),
    fc.integer({ min: 1, max: 28 }),
  )
  .map(
    ([y, m, d]) =>
      `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`,
  );

/** Campagne string (year) */
const campagneArb = fc.integer({ min: 2020, max: 2030 }).map(String);

/** UUID-like site_id */
const siteIdArb = fc.uuid();

/** Nullable score 0-5 */
const nullableScoreArb = fc.option(
  fc.float({ min: 0, max: 5, noNaN: true, noDefaultInfinity: true }),
  { nil: null },
);

/** Nullable percentage 0-100 */
const nullablePctArb = fc.option(
  fc.float({ min: 0, max: 100, noNaN: true, noDefaultInfinity: true }),
  { nil: null },
);

/** Modalite */
const modaliteArb = fc.constantFrom(
  'Témoin',
  'Levain 1/4',
  'Levain 1/2',
  'Levain 1/4 + Cuivre',
  'Levain 1/2 + Cuivre',
);

/** Rang number */
const rangArb = fc.integer({ min: 1, max: 7 });

/** RapportConfig generator */
const rapportConfigArb: fc.Arbitrary<RapportConfig> = fc.record({
  site_id: siteIdArb,
  campagne: campagneArb,
  date_debut: fc.option(dateArb, { nil: undefined }),
  date_fin: fc.option(dateArb, { nil: undefined }),
});

/** Observation input generator */
const observationInputArb = fc.record({
  date: dateArb,
  rang: rangArb,
  modalite: modaliteArb,
  vigueur: nullableScoreArb,
  mildiou_presence: nullableScoreArb,
  score_plante: nullableScoreArb,
  score_sanitaire: nullableScoreArb,
});

/** Traitement input generator */
const traitementInputArb = fc.record({
  date: dateArb,
  produit: safeStringArb,
  type_traitement: fc.option(
    fc.constantFrom('cuivre', 'soufre', 'levain', 'biocontrole', 'autre'),
    { nil: null },
  ),
  dose: fc.option(safeStringArb, { nil: null }),
  rang: rangArb,
  modalite: modaliteArb,
});

/** Analyse sol input generator */
const analyseSolInputArb = fc.record({
  date_prelevement: dateArb,
  phase: fc.constantFrom('T0', 'Tfinal'),
  ph: fc.option(
    fc.float({ min: 3, max: 10, noNaN: true, noDefaultInfinity: true }),
    { nil: null },
  ),
  matiere_organique_pct: fc.option(
    fc.float({ min: 0, max: 20, noNaN: true, noDefaultInfinity: true }),
    { nil: null },
  ),
  score_sante_sol: nullableScoreArb,
  score_contamination_metaux: nullableScoreArb,
});

/** Site input generator */
const siteInputArb = fc.record({ nom: safeStringArb });

/** Zone input generator */
const zoneInputArb = fc.record({
  nom: safeStringArb,
  cepage: fc.option(safeStringArb, { nil: null }),
});

/** Full assembler input generator */
const assemblerInputArb = fc.record({
  observations: fc.array(observationInputArb, { minLength: 0, maxLength: 15 }),
  traitements: fc.array(traitementInputArb, { minLength: 0, maxLength: 10 }),
  analyses_sol: fc.array(analyseSolInputArb, { minLength: 0, maxLength: 5 }),
  site: siteInputArb,
  zone: zoneInputArb,
});

/** Scores generator for Property 9 */
const scoresArb: fc.Arbitrary<RapportData['scores']> = fc.record({
  global: nullableScoreArb,
  sol: nullableScoreArb,
  plante: nullableScoreArb,
  maladie: nullableScoreArb,
  biostimulant: nullableScoreArb,
});

// ---------------------------------------------------------------------------
// Property 8: Assemblage des données du rapport PDF
// ---------------------------------------------------------------------------

describe('Property 8: Assemblage des données du rapport PDF', () => {
  it('assembled data must contain site name, parcelle, cepage, period, all score types, and summary tables', () => {
    fc.assert(
      fc.property(rapportConfigArb, assemblerInputArb, (config, data) => {
        const result = assemblerDonneesRapport(config, data);

        // Header must contain site name
        expect(result.header.site_nom).toBe(data.site.nom);

        // Header must contain parcelle name
        expect(result.header.parcelle_nom).toBe(data.zone.nom);

        // Header must contain cepage (or default)
        if (data.zone.cepage != null) {
          expect(result.header.cepage).toBe(data.zone.cepage);
        } else {
          expect(result.header.cepage).toBe('Non spécifié');
        }

        // Header must contain period
        expect(result.header.periode.length).toBeGreaterThan(0);
        if (config.date_debut && config.date_fin) {
          expect(result.header.periode).toContain(config.date_debut);
          expect(result.header.periode).toContain(config.date_fin);
        } else {
          expect(result.header.periode).toContain(config.campagne);
        }

        // All score types must be present (even if null)
        expect(result.scores).toHaveProperty('global');
        expect(result.scores).toHaveProperty('sol');
        expect(result.scores).toHaveProperty('plante');
        expect(result.scores).toHaveProperty('maladie');
        expect(result.scores).toHaveProperty('biostimulant');

        // Summary tables must match input lengths
        expect(result.observations).toHaveLength(data.observations.length);
        expect(result.traitements).toHaveLength(data.traitements.length);
        expect(result.analyses_sol).toHaveLength(data.analyses_sol.length);
      }),
      { numRuns: 100 },
    );
  });

  it('observation records in output must preserve input data', () => {
    fc.assert(
      fc.property(rapportConfigArb, assemblerInputArb, (config, data) => {
        const result = assemblerDonneesRapport(config, data);

        for (let i = 0; i < data.observations.length; i++) {
          const src = data.observations[i];
          const out = result.observations[i];
          expect(out.date).toBe(src.date);
          expect(out.rang).toBe(src.rang);
          expect(out.modalite).toBe(src.modalite);
          expect(out.vigueur).toBe(src.vigueur);
          expect(out.mildiou_presence).toBe(src.mildiou_presence);
          expect(out.score_plante).toBe(src.score_plante);
          expect(out.score_sanitaire).toBe(src.score_sanitaire);
        }
      }),
      { numRuns: 100 },
    );
  });

  it('conclusion must always be a non-empty string', () => {
    fc.assert(
      fc.property(rapportConfigArb, assemblerInputArb, (config, data) => {
        const result = assemblerDonneesRapport(config, data);
        expect(typeof result.conclusion).toBe('string');
        expect(result.conclusion.length).toBeGreaterThan(0);
      }),
      { numRuns: 100 },
    );
  });
});

// ---------------------------------------------------------------------------
// Property 9: Génération de conclusion synthétique
// ---------------------------------------------------------------------------

describe('Property 9: Génération de conclusion synthétique', () => {
  it('must return a non-empty string for any valid scores', () => {
    fc.assert(
      fc.property(scoresArb, (scores) => {
        const conclusion = genererConclusionSynthetique(scores);
        expect(typeof conclusion).toBe('string');
        expect(conclusion.length).toBeGreaterThan(0);
      }),
      { numRuns: 100 },
    );
  });

  it('must reference each non-null score value in the conclusion text', () => {
    fc.assert(
      fc.property(scoresArb, (scores) => {
        const conclusion = genererConclusionSynthetique(scores);

        // Each non-null score should appear as a number in the conclusion
        if (scores.global != null) {
          expect(conclusion).toContain(String(scores.global));
        }
        if (scores.plante != null) {
          expect(conclusion).toContain(String(scores.plante));
        }
        if (scores.sol != null) {
          expect(conclusion).toContain(String(scores.sol));
        }
        if (scores.maladie != null) {
          expect(conclusion).toContain(String(scores.maladie));
        }
        if (scores.biostimulant != null) {
          expect(conclusion).toContain(String(scores.biostimulant));
        }
      }),
      { numRuns: 100 },
    );
  });

  it('must contain "données insuffisantes" when global score is null', () => {
    fc.assert(
      fc.property(scoresArb, (scores) => {
        const allNullScores = {
          ...scores,
          global: null,
          plante: null,
          sol: null,
          maladie: null,
          biostimulant: null,
        };
        const conclusion = genererConclusionSynthetique(allNullScores);
        expect(conclusion).toContain('données insuffisantes');
      }),
      { numRuns: 100 },
    );
  });

  it('must always start with "Synthèse de la campagne"', () => {
    fc.assert(
      fc.property(scoresArb, (scores) => {
        const conclusion = genererConclusionSynthetique(scores);
        expect(conclusion.startsWith('Synthèse de la campagne')).toBe(true);
      }),
      { numRuns: 100 },
    );
  });
});
