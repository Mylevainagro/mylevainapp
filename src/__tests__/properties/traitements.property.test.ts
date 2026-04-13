// Feature: phase2-evolution, Property 13: Dernier traitement est le plus récent
// Feature: phase2-evolution, Property 14: Correction de la vue nb_passages
// Feature: phase2-evolution, Property 15: Filtrage des traitements
// **Validates: Requirements 7.2, 7.3, 7.5**
//
// Property 13: Pour toute zone de culture ayant au moins un traitement, la fonction
// "dernier traitement" doit retourner le traitement avec la date la plus récente.
// Le nombre de jours depuis ce traitement doit être ≥ 0.
//
// Property 14: Pour toute zone de culture et campagne, le nombre total de passages
// retourné doit être égal au nombre d'enregistrements traitements pour cette zone et
// campagne. Le nombre de passages cuivre doit être ≤ au nombre total de passages.
//
// Property 15: Pour tout ensemble de traitements et tout filtre (campagne, type_traitement),
// les résultats filtrés doivent tous correspondre aux critères du filtre. Le nombre de
// résultats filtrés doit être ≤ au nombre total de traitements.

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import {
  getDernierTraitement,
  countPassages,
  filterTraitements,
} from '@/lib/traitements';
import type { Traitement, Modalite } from '@/lib/types';

// ---------------------------------------------------------------------------
// Generators
// ---------------------------------------------------------------------------

const typeTraitementArb = fc.constantFrom<Traitement['type_traitement']>(
  'cuivre', 'soufre', 'levain', 'biocontrole', 'phytosanitaire', 'fertilisation', 'autre', null,
);

const modaliteArb = fc.constantFrom<Modalite>(
  'Témoin', 'Levain 1/4', 'Levain 1/2', 'Levain 1/4 + Cuivre', 'Levain 1/2 + Cuivre',
);

const campagneArb = fc.constantFrom('2023', '2024', '2025', '2026');

/** Generate a valid ISO date string (YYYY-MM-DD) in the past or today */
const dateArb = fc
  .tuple(
    fc.integer({ min: 2020, max: 2025 }),
    fc.integer({ min: 1, max: 12 }),
    fc.integer({ min: 1, max: 28 }),
  )
  .map(([y, m, d]) => `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`);

/** Generate a minimal valid Traitement object */
const traitementArb: fc.Arbitrary<Traitement> = fc.record({
  id: fc.uuid(),
  parcelle_id: fc.uuid(),
  rang: fc.integer({ min: 1, max: 7 }),
  modalite: modaliteArb,
  date: dateArb,
  produit: fc.constantFrom('Levain', 'Cuivre', 'Soufre', 'Bouillie bordelaise'),
  dose: fc.option(fc.string({ minLength: 1, maxLength: 10 }), { nil: null }),
  methode_application: fc.option(fc.constantFrom('pulvérisation', 'aspersion'), { nil: null }),
  temperature: fc.option(fc.double({ min: -10, max: 50, noNaN: true, noDefaultInfinity: true }), { nil: null }),
  humidite: fc.option(fc.double({ min: 0, max: 100, noNaN: true, noDefaultInfinity: true }), { nil: null }),
  conditions_meteo: fc.option(fc.string({ minLength: 1, maxLength: 20 }), { nil: null }),
  operateur: fc.option(fc.string({ minLength: 1, maxLength: 20 }), { nil: null }),
  notes: fc.option(fc.string({ minLength: 0, maxLength: 30 }), { nil: null }),
  created_at: fc.constant(new Date().toISOString()),
  // Phase 2 enriched fields
  type_traitement: typeTraitementArb,
  matiere_active: fc.option(fc.string({ minLength: 1, maxLength: 20 }), { nil: null }),
  concentration: fc.option(fc.double({ min: 0, max: 100, noNaN: true, noDefaultInfinity: true }), { nil: null }),
  unite: fc.option(fc.constantFrom('g/L', 'mL/L', 'kg/ha'), { nil: null }),
  objectif: fc.option(fc.string({ minLength: 1, maxLength: 30 }), { nil: null }),
  campagne: fc.option(campagneArb, { nil: null }),
});

/** Generate a non-empty array of traitements */
const nonEmptyTraitementsArb = fc.array(traitementArb, { minLength: 1, maxLength: 30 });

/** Generate an array of traitements (possibly empty) */
const traitementsArb = fc.array(traitementArb, { minLength: 0, maxLength: 30 });

// ---------------------------------------------------------------------------
// Property 13: Dernier traitement est le plus récent
// ---------------------------------------------------------------------------

describe('Property 13: Dernier traitement est le plus récent', () => {
  it('should return the treatment with the latest date for any non-empty array', () => {
    fc.assert(
      fc.property(nonEmptyTraitementsArb, (traitements) => {
        const dernier = getDernierTraitement(traitements);

        expect(dernier).not.toBeNull();

        // The returned treatment must have the maximum date
        const maxDate = traitements.reduce(
          (max, t) => (t.date > max ? t.date : max),
          traitements[0].date,
        );
        expect(dernier!.date).toBe(maxDate);
      }),
      { numRuns: 100 },
    );
  });

  it('should return null for an empty array', () => {
    expect(getDernierTraitement([])).toBeNull();
  });

  it('days since the last treatment should be >= 0', () => {
    fc.assert(
      fc.property(nonEmptyTraitementsArb, (traitements) => {
        const dernier = getDernierTraitement(traitements);
        expect(dernier).not.toBeNull();

        const jourDepuis = Math.floor(
          (Date.now() - new Date(dernier!.date).getTime()) / (1000 * 60 * 60 * 24),
        );
        expect(jourDepuis).toBeGreaterThanOrEqual(0);
      }),
      { numRuns: 100 },
    );
  });

  it('the returned treatment must exist in the original array', () => {
    fc.assert(
      fc.property(nonEmptyTraitementsArb, (traitements) => {
        const dernier = getDernierTraitement(traitements);
        expect(dernier).not.toBeNull();
        expect(traitements).toContain(dernier);
      }),
      { numRuns: 100 },
    );
  });
});

// ---------------------------------------------------------------------------
// Property 14: Correction de la vue nb_passages
// ---------------------------------------------------------------------------

describe('Property 14: Correction de la vue nb_passages', () => {
  it('nb_total should equal the count of treatments for the given campagne', () => {
    fc.assert(
      fc.property(traitementsArb, campagneArb, (traitements, campagne) => {
        const result = countPassages(traitements, campagne);

        const expectedTotal = traitements.filter((t) => t.campagne === campagne).length;
        expect(result.nb_total).toBe(expectedTotal);
      }),
      { numRuns: 100 },
    );
  });

  it('nb_cuivre should be <= nb_total', () => {
    fc.assert(
      fc.property(traitementsArb, campagneArb, (traitements, campagne) => {
        const result = countPassages(traitements, campagne);
        expect(result.nb_cuivre).toBeLessThanOrEqual(result.nb_total);
      }),
      { numRuns: 100 },
    );
  });

  it('nb_cuivre should equal the count of cuivre treatments for the given campagne', () => {
    fc.assert(
      fc.property(traitementsArb, campagneArb, (traitements, campagne) => {
        const result = countPassages(traitements, campagne);

        const expectedCuivre = traitements.filter(
          (t) => t.campagne === campagne && t.type_traitement === 'cuivre',
        ).length;
        expect(result.nb_cuivre).toBe(expectedCuivre);
      }),
      { numRuns: 100 },
    );
  });
});

// ---------------------------------------------------------------------------
// Property 15: Filtrage des traitements
// ---------------------------------------------------------------------------

describe('Property 15: Filtrage des traitements', () => {
  it('all filtered results should match the campagne filter', () => {
    fc.assert(
      fc.property(traitementsArb, campagneArb, (traitements, campagne) => {
        const filtered = filterTraitements(traitements, { campagne });

        for (const t of filtered) {
          expect(t.campagne).toBe(campagne);
        }
      }),
      { numRuns: 100 },
    );
  });

  it('all filtered results should match the type_traitement filter', () => {
    fc.assert(
      fc.property(
        traitementsArb,
        fc.constantFrom('cuivre', 'soufre', 'levain', 'biocontrole', 'phytosanitaire', 'fertilisation', 'autre'),
        (traitements, typeTraitement) => {
          const filtered = filterTraitements(traitements, { type_traitement: typeTraitement });

          for (const t of filtered) {
            expect(t.type_traitement).toBe(typeTraitement);
          }
        },
      ),
      { numRuns: 100 },
    );
  });

  it('all filtered results should match both campagne and type_traitement filters', () => {
    fc.assert(
      fc.property(
        traitementsArb,
        campagneArb,
        fc.constantFrom('cuivre', 'soufre', 'levain', 'biocontrole', 'phytosanitaire', 'fertilisation', 'autre'),
        (traitements, campagne, typeTraitement) => {
          const filtered = filterTraitements(traitements, {
            campagne,
            type_traitement: typeTraitement,
          });

          for (const t of filtered) {
            expect(t.campagne).toBe(campagne);
            expect(t.type_traitement).toBe(typeTraitement);
          }
        },
      ),
      { numRuns: 100 },
    );
  });

  it('filtered count should be <= total count', () => {
    fc.assert(
      fc.property(
        traitementsArb,
        fc.record({
          campagne: fc.option(campagneArb, { nil: undefined }),
          type_traitement: fc.option(
            fc.constantFrom('cuivre', 'soufre', 'levain', 'biocontrole', 'phytosanitaire', 'fertilisation', 'autre'),
            { nil: undefined },
          ),
        }),
        (traitements, filters) => {
          const filtered = filterTraitements(traitements, filters);
          expect(filtered.length).toBeLessThanOrEqual(traitements.length);
        },
      ),
      { numRuns: 100 },
    );
  });

  it('with no filters, all treatments should be returned', () => {
    fc.assert(
      fc.property(traitementsArb, (traitements) => {
        const filtered = filterTraitements(traitements, {});
        expect(filtered.length).toBe(traitements.length);
      }),
      { numRuns: 100 },
    );
  });
});
