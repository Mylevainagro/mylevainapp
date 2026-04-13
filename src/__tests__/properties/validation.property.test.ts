// Feature: phase2-evolution, Property 22: Validation du formulaire d'observation
// **Validates: Requirements 11.1, 11.2**
//
// Pour toute donnée d'observation, la fonction validateObservation doit :
// (a) retourner une erreur pour chaque champ obligatoire manquant (parcelle, rang, date),
// (b) retourner une erreur pour chaque valeur numérique hors plage
//     (notes 0-5, pression_mildiou 0-3, mildiou_intensite 0-100, température -10 à 50, humidité 0-100),
// (c) retourner un tableau vide si toutes les valeurs sont valides et dans les plages.

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { validateObservation } from '@/lib/validation';
import type { Observation } from '@/lib/types';

// ---------------------------------------------------------------------------
// Generators
// ---------------------------------------------------------------------------

/** Fields validated with range [0, 5] */
const NOTE_05_FIELDS = [
  'vigueur', 'croissance', 'homogeneite', 'couleur_feuilles',
  'epaisseur_feuilles', 'turgescence', 'brulures', 'necroses',
  'deformations', 'mildiou_presence', 'taille_grappes', 'homogeneite_grappes',
] as const;

/** All range-validated fields with their [min, max] */
const RANGE_FIELDS: Record<string, [number, number]> = {
  vigueur: [0, 5],
  croissance: [0, 5],
  homogeneite: [0, 5],
  couleur_feuilles: [0, 5],
  epaisseur_feuilles: [0, 5],
  turgescence: [0, 5],
  brulures: [0, 5],
  necroses: [0, 5],
  deformations: [0, 5],
  mildiou_presence: [0, 5],
  taille_grappes: [0, 5],
  homogeneite_grappes: [0, 5],
  pression_mildiou: [0, 3],
  mildiou_intensite: [0, 100],
  temperature: [-10, 50],
  humidite: [0, 100],
};

const RANGE_FIELD_NAMES = Object.keys(RANGE_FIELDS);

/** Generate a valid parcelle_id (non-empty, non-blank string) */
const validParcelleId = fc.string({ minLength: 1, maxLength: 20 }).filter((s) => s.trim().length > 0);

/** Generate a valid date string (YYYY-MM-DD) */
const validDate = fc
  .tuple(
    fc.integer({ min: 2020, max: 2030 }),
    fc.integer({ min: 1, max: 12 }),
    fc.integer({ min: 1, max: 28 }),
  )
  .map(([y, m, d]) => `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`);

/** Generate a valid rang (non-null integer) */
const validRang = fc.integer({ min: 1, max: 20 });

/** Generate a value within a given range (inclusive) */
function inRange(min: number, max: number): fc.Arbitrary<number> {
  return fc.double({ min, max, noNaN: true, noDefaultInfinity: true });
}

/** Generate a value strictly outside a given range */
function outOfRange(min: number, max: number): fc.Arbitrary<number> {
  return fc.oneof(
    fc.double({ min: min - 1000, max: min - 0.001, noNaN: true, noDefaultInfinity: true }),
    fc.double({ min: max + 0.001, max: max + 1000, noNaN: true, noDefaultInfinity: true }),
  );
}

/** Build a fully valid Partial<Observation> with all required fields + optional in-range numerics */
const validObservation: fc.Arbitrary<Partial<Observation>> = fc
  .tuple(
    validParcelleId,
    validRang,
    validDate,
    // For each range field, optionally include a valid value
    fc.record(
      Object.fromEntries(
        RANGE_FIELD_NAMES.map((f) => [
          f,
          fc.option(inRange(RANGE_FIELDS[f][0], RANGE_FIELDS[f][1]), { nil: undefined }),
        ]),
      ) as Record<string, fc.Arbitrary<number | undefined>>,
    ),
  )
  .map(([parcelle_id, rang, date, numerics]) => {
    const obs: Partial<Observation> = { parcelle_id, rang, date };
    for (const [key, val] of Object.entries(numerics)) {
      if (val !== undefined) {
        (obs as Record<string, unknown>)[key] = val;
      }
    }
    return obs;
  });

// ---------------------------------------------------------------------------
// Property tests
// ---------------------------------------------------------------------------

describe('Property 22: Validation du formulaire d\'observation', () => {
  // (c) Valid observations → empty error array
  it('should return an empty error array for any fully valid observation', () => {
    fc.assert(
      fc.property(validObservation, (obs) => {
        const errors = validateObservation(obs);
        expect(errors).toEqual([]);
      }),
      { numRuns: 100 },
    );
  });

  // (a) Missing required fields → one required error per missing field
  it('should return a required error for each missing required field', () => {
    // Generate a subset of required fields to omit (at least one)
    const requiredFields = ['parcelle_id', 'rang', 'date'] as const;

    fc.assert(
      fc.property(
        validParcelleId,
        validRang,
        validDate,
        fc.subarray([...requiredFields], { minLength: 1 }),
        (parcelle_id, rang, date, fieldsToOmit) => {
          const base: Partial<Observation> = { parcelle_id, rang, date };

          // Remove selected required fields
          for (const field of fieldsToOmit) {
            delete (base as Record<string, unknown>)[field];
          }

          const errors = validateObservation(base);
          const requiredErrors = errors.filter((e) => e.type === 'required');

          // Each omitted field must produce exactly one required error
          for (const field of fieldsToOmit) {
            expect(requiredErrors.some((e) => e.champ === field)).toBe(true);
          }

          // No required error for fields that are present
          for (const field of requiredFields) {
            if (!fieldsToOmit.includes(field)) {
              expect(requiredErrors.some((e) => e.champ === field)).toBe(false);
            }
          }
        },
      ),
      { numRuns: 100 },
    );
  });

  // (b) Out-of-range numeric values → one range error per out-of-range field
  it('should return a range error for each numeric value outside its allowed range', () => {
    fc.assert(
      fc.property(
        validParcelleId,
        validRang,
        validDate,
        // Pick at least 1 field to set out of range
        fc.subarray(RANGE_FIELD_NAMES, { minLength: 1 }),
        (parcelle_id, rang, date, fieldsOutOfRange) => {
          const obs: Partial<Observation> = { parcelle_id, rang, date };

          // For each selected field, generate an out-of-range value deterministically
          for (const field of fieldsOutOfRange) {
            const [min, max] = RANGE_FIELDS[field];
            // Use a value clearly below min
            (obs as Record<string, unknown>)[field] = min - 1;
          }

          const errors = validateObservation(obs);
          const rangeErrors = errors.filter((e) => e.type === 'range');

          // Each out-of-range field must produce a range error
          for (const field of fieldsOutOfRange) {
            expect(rangeErrors.some((e) => e.champ === field)).toBe(true);
          }

          // No required errors (all required fields are present)
          expect(errors.filter((e) => e.type === 'required')).toHaveLength(0);
        },
      ),
      { numRuns: 100 },
    );
  });

  // (b) complementary: values above max also produce range errors
  it('should return a range error for values above the maximum of each field', () => {
    fc.assert(
      fc.property(
        validParcelleId,
        validRang,
        validDate,
        fc.constantFrom(...RANGE_FIELD_NAMES),
        (parcelle_id, rang, date, field) => {
          const [, max] = RANGE_FIELDS[field];
          const obs: Partial<Observation> = { parcelle_id, rang, date };
          (obs as Record<string, unknown>)[field] = max + 1;

          const errors = validateObservation(obs);
          expect(errors.some((e) => e.champ === field && e.type === 'range')).toBe(true);
        },
      ),
      { numRuns: 100 },
    );
  });
});
