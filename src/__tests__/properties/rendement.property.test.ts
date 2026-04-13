// Feature: phase2-evolution, Property 17: Comparaison rendement par modalité
// **Validates: Requirements 8.4**
//
// Property 17: Pour tout ensemble d'observations avec données de rendement et
// plusieurs modalités, le regroupement par modalité doit produire des moyennes
// correctes : la moyenne de rendement_estime par modalité doit être égale à la
// somme des rendement_estime de cette modalité divisée par le nombre
// d'observations de cette modalité.

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { grouperRendementParModalite } from '@/lib/rendement';
import type { Observation, Modalite } from '@/lib/types';

// ---------------------------------------------------------------------------
// Generators
// ---------------------------------------------------------------------------

const modaliteArb = fc.constantFrom<Modalite>(
  'Témoin',
  'Levain 1/4',
  'Levain 1/2',
  'Levain 1/4 + Cuivre',
  'Levain 1/2 + Cuivre',
);

/** Rendement value: positive finite number or null */
const rendementArb = fc.option(
  fc.double({ min: 0, max: 50000, noNaN: true, noDefaultInfinity: true }),
  { nil: null },
);

/** Minimal Observation with rendement fields and a modalite */
function makeObs(
  modalite: Modalite,
  rendement_estime: number | null,
  rendement_reel: number | null,
): Observation {
  return {
    id: 'gen',
    parcelle_id: 'p1',
    rang: 1,
    modalite,
    date: '2025-06-01',
    heure: '10:00',
    mois: 'juin',
    meteo: null,
    temperature: null,
    humidite: null,
    vent: null,
    pluie_recente: null,
    derniere_pluie: null,
    humidite_sol: null,
    volume_applique_l: null,
    ph_surnageant: null,
    surnageant_l: null,
    eau_l: null,
    cuivre: null,
    date_surnageant: null,
    date_cuivre: null,
    vigueur: null,
    croissance: null,
    homogeneite: null,
    couleur_feuilles: null,
    epaisseur_feuilles: null,
    turgescence: null,
    brulures: null,
    necroses: null,
    deformations: null,
    mildiou_presence: null,
    mildiou_intensite: null,
    localisation_mildiou: null,
    progression: null,
    pression_mildiou: null,
    nb_grappes_par_cep: null,
    taille_grappes: null,
    homogeneite_grappes: null,
    nombre_grappes: null,
    poids_moyen_grappe: null,
    rendement_estime,
    rendement_reel,
    score_plante: null,
    score_sanitaire: null,
    commentaires: null,
    created_at: '2025-06-01T00:00:00Z',
  } as Observation;
}

/** Generate a single observation with random modalite and rendement values */
const observationArb: fc.Arbitrary<Observation> = fc
  .tuple(modaliteArb, rendementArb, rendementArb)
  .map(([m, re, rr]) => makeObs(m, re, rr));

/** Non-empty array of observations */
const observationsArb = fc.array(observationArb, { minLength: 1, maxLength: 40 });

// ---------------------------------------------------------------------------
// Property 17: Comparaison rendement par modalité
// ---------------------------------------------------------------------------

describe('Property 17: Comparaison rendement par modalité', () => {
  it('moyenne_estime per modalité equals sum / count of non-null rendement_estime values', () => {
    fc.assert(
      fc.property(observationsArb, (observations) => {
        const result = grouperRendementParModalite(observations);

        // Build expected groups manually
        const groups = new Map<string, { estimes: number[]; count: number }>();
        for (const obs of observations) {
          if (!groups.has(obs.modalite)) {
            groups.set(obs.modalite, { estimes: [], count: 0 });
          }
          const g = groups.get(obs.modalite)!;
          g.count++;
          if (obs.rendement_estime != null) {
            g.estimes.push(obs.rendement_estime);
          }
        }

        // Verify each group in the result
        for (const r of result) {
          const expected = groups.get(r.modalite);
          expect(expected).toBeDefined();
          expect(r.count).toBe(expected!.count);

          if (expected!.estimes.length === 0) {
            expect(r.moyenne_estime).toBeNull();
          } else {
            const sum = expected!.estimes.reduce((a, b) => a + b, 0);
            const avg = sum / expected!.estimes.length;
            expect(r.moyenne_estime).toBeCloseTo(avg, 8);
          }
        }

        // All modalités from the input must appear in the result
        expect(result.length).toBe(groups.size);
      }),
      { numRuns: 100 },
    );
  });

  it('moyenne_reel per modalité equals sum / count of non-null rendement_reel values', () => {
    fc.assert(
      fc.property(observationsArb, (observations) => {
        const result = grouperRendementParModalite(observations);

        const groups = new Map<string, number[]>();
        for (const obs of observations) {
          if (!groups.has(obs.modalite)) {
            groups.set(obs.modalite, []);
          }
          if (obs.rendement_reel != null) {
            groups.get(obs.modalite)!.push(obs.rendement_reel);
          }
        }

        for (const r of result) {
          const reels = groups.get(r.modalite) ?? [];
          if (reels.length === 0) {
            expect(r.moyenne_reel).toBeNull();
          } else {
            const sum = reels.reduce((a, b) => a + b, 0);
            const avg = sum / reels.length;
            expect(r.moyenne_reel).toBeCloseTo(avg, 8);
          }
        }
      }),
      { numRuns: 100 },
    );
  });

  it('result is sorted alphabetically by modalité', () => {
    fc.assert(
      fc.property(observationsArb, (observations) => {
        const result = grouperRendementParModalite(observations);
        const modalites = result.map((r) => r.modalite);
        const sorted = [...modalites].sort((a, b) => a.localeCompare(b));
        expect(modalites).toEqual(sorted);
      }),
      { numRuns: 100 },
    );
  });

  it('empty input produces empty output', () => {
    expect(grouperRendementParModalite([])).toEqual([]);
  });
});
