// Feature: phase2-evolution, Property 2: Indicateurs adaptés au type de culture
// **Validates: Requirements 2.7**
//
// Pour tout type_culture valide, la fonction de sélection d'indicateurs doit retourner
// un sous-ensemble non vide des indicateurs disponibles. Pour les types non-viticulture,
// ce sous-ensemble doit être un sous-ensemble strict de l'ensemble complet des indicateurs.

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import {
  getIndicateursForCulture,
  ALL_INDICATEURS,
} from '@/lib/indicateurs-culture';

// ---------------------------------------------------------------------------
// Generators
// ---------------------------------------------------------------------------

/** All valid type_culture codes */
const validTypeCultureArb = fc.constantFrom(
  'viticulture',
  'maraichage',
  'arboriculture',
  'grandes_cultures',
);

/** Non-viticulture type_culture codes (strict subset expected) */
const nonViticultureArb = fc.constantFrom(
  'maraichage',
  'arboriculture',
  'grandes_cultures',
);

// ---------------------------------------------------------------------------
// Property 2: Indicateurs adaptés au type de culture
// ---------------------------------------------------------------------------

describe('Property 2: Indicateurs adaptés au type de culture', () => {
  it('for any valid type_culture, the result is non-empty', () => {
    fc.assert(
      fc.property(validTypeCultureArb, (typeCulture) => {
        const result = getIndicateursForCulture(typeCulture);
        expect(result.length).toBeGreaterThan(0);
      }),
      { numRuns: 100 },
    );
  });

  it('for any valid type_culture, every returned indicator is in ALL_INDICATEURS', () => {
    fc.assert(
      fc.property(validTypeCultureArb, (typeCulture) => {
        const result = getIndicateursForCulture(typeCulture);
        const allSet = new Set(ALL_INDICATEURS);
        for (const indicateur of result) {
          expect(allSet.has(indicateur)).toBe(true);
        }
      }),
      { numRuns: 100 },
    );
  });

  it('for non-viticulture types, the result is a strict subset (fewer elements than ALL_INDICATEURS)', () => {
    fc.assert(
      fc.property(nonViticultureArb, (typeCulture) => {
        const result = getIndicateursForCulture(typeCulture);
        expect(result.length).toBeLessThan(ALL_INDICATEURS.length);
      }),
      { numRuns: 100 },
    );
  });
});
