// Feature: phase2-evolution, Property 16: Calcul du pourcentage d'évolution N vs N-1
// **Validates: Requirements 7.6, 8.3**
//
// Property 16: Pour toutes valeurs numériques N et N-1 (avec N-1 ≠ 0), le pourcentage
// d'évolution calculé doit être égal à ((N - N1) / N1) * 100. Si N-1 = 0, le résultat
// doit être null.

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { calcPourcentageEvolution } from '@/lib/comparaison';

// ---------------------------------------------------------------------------
// Generators
// ---------------------------------------------------------------------------

/** Finite non-zero double (avoids NaN, Infinity, and 0) */
const nonZeroFiniteArb = fc.double({
  min: -1e9,
  max: 1e9,
  noNaN: true,
  noDefaultInfinity: true,
}).filter((v) => v !== 0);

/** Finite double (avoids NaN and Infinity) */
const finiteArb = fc.double({
  min: -1e9,
  max: 1e9,
  noNaN: true,
  noDefaultInfinity: true,
});

// ---------------------------------------------------------------------------
// Property 16: Calcul du pourcentage d'évolution N vs N-1
// ---------------------------------------------------------------------------

describe('Property 16: Calcul du pourcentage d\'évolution N vs N-1', () => {
  it('should equal ((N - N1) / N1) * 100 when N-1 ≠ 0', () => {
    fc.assert(
      fc.property(finiteArb, nonZeroFiniteArb, (valeurN, valeurN1) => {
        const result = calcPourcentageEvolution(valeurN, valeurN1);

        expect(result).not.toBeNull();

        const expected = ((valeurN - valeurN1) / valeurN1) * 100;
        expect(result).toBeCloseTo(expected, 8);
      }),
      { numRuns: 100 },
    );
  });

  it('should return null when N-1 = 0', () => {
    fc.assert(
      fc.property(finiteArb, (valeurN) => {
        const result = calcPourcentageEvolution(valeurN, 0);
        expect(result).toBeNull();
      }),
      { numRuns: 100 },
    );
  });

  it('should return 0 when N equals N-1 (no evolution)', () => {
    fc.assert(
      fc.property(nonZeroFiniteArb, (valeur) => {
        const result = calcPourcentageEvolution(valeur, valeur);
        expect(result).not.toBeNull();
        expect(result!).toBeCloseTo(0, 8);
      }),
      { numRuns: 100 },
    );
  });

  it('should return a positive percentage when N > N-1 > 0', () => {
    fc.assert(
      fc.property(
        fc.double({ min: 0.01, max: 1e9, noNaN: true, noDefaultInfinity: true }),
        fc.double({ min: 0.01, max: 1e9, noNaN: true, noDefaultInfinity: true }),
        (base, increment) => {
          const valeurN1 = base;
          const valeurN = base + increment;
          const result = calcPourcentageEvolution(valeurN, valeurN1);

          expect(result).not.toBeNull();
          expect(result!).toBeGreaterThanOrEqual(0);
        },
      ),
      { numRuns: 100 },
    );
  });

  it('should return -100 when N = 0 and N-1 ≠ 0', () => {
    fc.assert(
      fc.property(nonZeroFiniteArb, (valeurN1) => {
        const result = calcPourcentageEvolution(0, valeurN1);
        expect(result).not.toBeNull();
        expect(result).toBeCloseTo(-100, 8);
      }),
      { numRuns: 100 },
    );
  });
});
