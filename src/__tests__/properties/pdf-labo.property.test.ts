// Feature: phase2-evolution, Property 12: Champs non détectés du parseur PDF labo
// **Validates: Requirements 6.4**
//
// Pour tout résultat de parsing PDF labo, chaque champ avec confiance = 'non_detecte'
// doit avoir une valeur nulle (null).

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { parseLaboText } from '@/lib/pdf-labo-parser';

// ---------------------------------------------------------------------------
// Generators
// ---------------------------------------------------------------------------

/** Generate random text strings */
const randomText = fc.string({ minLength: 0, maxLength: 500 });

/** Generate a random file name */
const randomFileName = fc
  .tuple(
    fc.string({ minLength: 1, maxLength: 30 }),
    fc.constantFrom('.pdf', '.PDF', '.txt'),
  )
  .map(([name, ext]) => name + ext);

// ---------------------------------------------------------------------------
// Property test
// ---------------------------------------------------------------------------

describe('Property 12: Champs non détectés du parseur PDF labo', () => {
  it('pour tout résultat de parsing, chaque champ avec confiance "non_detecte" doit avoir valeur === null', () => {
    fc.assert(
      fc.property(randomText, randomFileName, (text, fileName) => {
        const result = parseLaboText(text, fileName);

        for (const v of result.valeurs) {
          if (v.confiance === 'non_detecte') {
            expect(v.valeur).toBeNull();
          }
        }
      }),
      { numRuns: 100 },
    );
  });
});
