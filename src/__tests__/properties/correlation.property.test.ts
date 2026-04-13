// Feature: phase2-evolution, Property 18: Bornes du coefficient de corrélation
// **Validates: Requirements 8.6**
//
// Property 18: Pour toutes deux séries numériques de longueur ≥ 2, le
// coefficient de corrélation calculé doit être compris entre -1 et 1 inclus.

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { calcCorrelation } from '@/lib/correlation';

// ---------------------------------------------------------------------------
// Generators
// ---------------------------------------------------------------------------

/** Finite number (no NaN, no Infinity) */
const finiteNumberArb = fc.double({
  min: -1e6,
  max: 1e6,
  noNaN: true,
  noDefaultInfinity: true,
});

/**
 * Generate two arrays of equal length ≥ 2 filled with finite numbers.
 * Length is kept reasonable (2–50) to avoid slow runs.
 */
const pairedSeriesArb = fc
  .integer({ min: 2, max: 50 })
  .chain((len) =>
    fc.tuple(
      fc.array(finiteNumberArb, { minLength: len, maxLength: len }),
      fc.array(finiteNumberArb, { minLength: len, maxLength: len }),
    ),
  );

// ---------------------------------------------------------------------------
// Property 18: Bornes du coefficient de corrélation
// ---------------------------------------------------------------------------

describe('Property 18: Bornes du coefficient de corrélation', () => {
  it('calcCorrelation returns a value in [-1, 1] for any two finite series of equal length ≥ 2', () => {
    fc.assert(
      fc.property(pairedSeriesArb, ([xs, ys]) => {
        const r = calcCorrelation(xs, ys);

        // calcCorrelation may return null (e.g. constant series → std dev = 0).
        // When it returns a number, it must be within [-1, 1].
        if (r !== null) {
          expect(r).toBeGreaterThanOrEqual(-1);
          expect(r).toBeLessThanOrEqual(1);
        }
      }),
      { numRuns: 100 },
    );
  });
});
