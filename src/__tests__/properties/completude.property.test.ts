// Feature: phase2-evolution, Property 10: Évaluation de complétude
// Feature: phase2-evolution, Property 11: L'export est toujours autorisé
// **Validates: Requirements 5.2, 5.4, 5.6, 5.7**
//
// Property 10: Pour tout ensemble de données filtré, evaluerCompletude doit retourner
// un objet contenant : status ∈ {complete, partial, incomplete}, can_export (booléen),
// missing_required (liste), missing_recommended (liste), message (chaîne non vide).
// Le status doit être 'incomplete' si les données minimales sont absentes, 'partial'
// si présentes mais pas complètes, 'complete' si tout est présent.
//
// Property 11: Pour tout résultat de complétude, can_export doit toujours être true.

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { evaluerCompletude, type CompletudeInput } from '@/lib/completude';

// ---------------------------------------------------------------------------
// Generator: random CompletudeInput
// ---------------------------------------------------------------------------

const completudeInputArb: fc.Arbitrary<CompletudeInput> = fc.record({
  has_site: fc.boolean(),
  has_zone: fc.boolean(),
  has_observations: fc.boolean(),
  has_modalite: fc.boolean(),
  indicateurs_remplis: fc.integer({ min: 0, max: 20 }),
  has_traitements: fc.boolean(),
  has_scores: fc.boolean(),
  has_analyses_sol: fc.boolean(),
});

// ---------------------------------------------------------------------------
// Property 10: Évaluation de complétude
// ---------------------------------------------------------------------------

describe('Property 10: Évaluation de complétude', () => {
  it('status is always one of complete, partial, incomplete', () => {
    fc.assert(
      fc.property(completudeInputArb, (input) => {
        const result = evaluerCompletude(input);
        expect(['complete', 'partial', 'incomplete']).toContain(result.status);
      }),
      { numRuns: 100 },
    );
  });

  it('can_export is always a boolean', () => {
    fc.assert(
      fc.property(completudeInputArb, (input) => {
        const result = evaluerCompletude(input);
        expect(typeof result.can_export).toBe('boolean');
      }),
      { numRuns: 100 },
    );
  });

  it('missing_required is always an array', () => {
    fc.assert(
      fc.property(completudeInputArb, (input) => {
        const result = evaluerCompletude(input);
        expect(Array.isArray(result.missing_required)).toBe(true);
      }),
      { numRuns: 100 },
    );
  });

  it('missing_recommended is always an array', () => {
    fc.assert(
      fc.property(completudeInputArb, (input) => {
        const result = evaluerCompletude(input);
        expect(Array.isArray(result.missing_recommended)).toBe(true);
      }),
      { numRuns: 100 },
    );
  });

  it('message is always a non-empty string', () => {
    fc.assert(
      fc.property(completudeInputArb, (input) => {
        const result = evaluerCompletude(input);
        expect(typeof result.message).toBe('string');
        expect(result.message.length).toBeGreaterThan(0);
      }),
      { numRuns: 100 },
    );
  });

  it('status is "incomplete" when minimum data (site + zone + observations) is absent', () => {
    // Generate inputs where at least one of the three required fields is false
    const incompleteInputArb = completudeInputArb.filter(
      (input) => !input.has_site || !input.has_zone || !input.has_observations,
    );

    fc.assert(
      fc.property(incompleteInputArb, (input) => {
        const result = evaluerCompletude(input);
        expect(result.status).toBe('incomplete');
      }),
      { numRuns: 100 },
    );
  });

  it('status is "complete" when all data is present (site + zone + obs + traitements + scores + analyses_sol)', () => {
    const completeInputArb = completudeInputArb.filter(
      (input) =>
        input.has_site &&
        input.has_zone &&
        input.has_observations &&
        input.has_traitements &&
        input.has_scores &&
        input.has_analyses_sol,
    );

    fc.assert(
      fc.property(completeInputArb, (input) => {
        const result = evaluerCompletude(input);
        expect(result.status).toBe('complete');
      }),
      { numRuns: 100 },
    );
  });

  it('status is "partial" when minimum is present but not all complete data', () => {
    const partialInputArb = completudeInputArb.filter(
      (input) =>
        input.has_site &&
        input.has_zone &&
        input.has_observations &&
        !(input.has_traitements && input.has_scores && input.has_analyses_sol),
    );

    fc.assert(
      fc.property(partialInputArb, (input) => {
        const result = evaluerCompletude(input);
        expect(result.status).toBe('partial');
      }),
      { numRuns: 100 },
    );
  });

  it('missing_required is empty when minimum data is present', () => {
    const hasMinimumArb = completudeInputArb.filter(
      (input) => input.has_site && input.has_zone && input.has_observations,
    );

    fc.assert(
      fc.property(hasMinimumArb, (input) => {
        const result = evaluerCompletude(input);
        expect(result.missing_required).toEqual([]);
      }),
      { numRuns: 100 },
    );
  });

  it('missing_required is non-empty when minimum data is absent', () => {
    const missingMinimumArb = completudeInputArb.filter(
      (input) => !input.has_site || !input.has_zone || !input.has_observations,
    );

    fc.assert(
      fc.property(missingMinimumArb, (input) => {
        const result = evaluerCompletude(input);
        expect(result.missing_required.length).toBeGreaterThan(0);
      }),
      { numRuns: 100 },
    );
  });
});

// ---------------------------------------------------------------------------
// Property 11: L'export est toujours autorisé
// ---------------------------------------------------------------------------

describe("Property 11: L'export est toujours autorisé", () => {
  it('can_export is always true regardless of status', () => {
    fc.assert(
      fc.property(completudeInputArb, (input) => {
        const result = evaluerCompletude(input);
        expect(result.can_export).toBe(true);
      }),
      { numRuns: 100 },
    );
  });
});
