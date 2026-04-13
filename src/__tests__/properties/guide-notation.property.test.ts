// Feature: phase2-evolution, Property 1: Mapping guide de notation
// **Validates: Requirements 1.1, 1.4, 1.5**
//
// Pour tout code_indicateur, la fonction de mapping doit retourner la fiche
// guide_notation correspondante si elle existe dans la base (avec actif = true),
// et retourner null sinon. L'icône d'aide doit être visible si et seulement si
// une fiche existe pour ce code.

import { describe, it, expect } from "vitest";
import * as fc from "fast-check";
import {
  getCodeIndicateur,
  INDICATEUR_MAPPING,
} from "@/lib/guide-notation";

const MAPPED_FIELDS = Object.keys(INDICATEUR_MAPPING);
const MAPPED_VALUES = Object.values(INDICATEUR_MAPPING);

describe("Property 1: Mapping guide de notation", () => {
  // Property 1a: For any known mapped field, getCodeIndicateur returns a non-null string
  it("should return a non-null string for every known mapped field", () => {
    fc.assert(
      fc.property(
        fc.constantFrom(...MAPPED_FIELDS),
        (fieldName) => {
          const result = getCodeIndicateur(fieldName);
          expect(result).not.toBeNull();
          expect(typeof result).toBe("string");
          expect(result!.length).toBeGreaterThan(0);
        }
      ),
      { numRuns: 100 }
    );
  });

  // Property 1b: All values in INDICATEUR_MAPPING are non-empty strings
  it("should have only non-empty string values in INDICATEUR_MAPPING", () => {
    fc.assert(
      fc.property(
        fc.constantFrom(...MAPPED_VALUES),
        (codeIndicateur) => {
          expect(typeof codeIndicateur).toBe("string");
          expect(codeIndicateur.length).toBeGreaterThan(0);
        }
      ),
      { numRuns: 100 }
    );
  });

  // Property 1c: For any arbitrary string NOT in the mapping, getCodeIndicateur returns null
  it("should return null for any arbitrary string not in the mapping", () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 1 }).filter(
          (s) => !MAPPED_FIELDS.includes(s)
        ),
        (unknownField) => {
          const result = getCodeIndicateur(unknownField);
          expect(result).toBeNull();
        }
      ),
      { numRuns: 100 }
    );
  });

  // Property 1d: The help icon visibility is determined by mapping existence —
  // a field has a help icon if and only if getCodeIndicateur returns non-null
  it("should make help icon visible iff a mapping exists for the field", () => {
    fc.assert(
      fc.property(
        fc.oneof(
          fc.constantFrom(...MAPPED_FIELDS),
          fc.string({ minLength: 1 }).filter(
            (s) => !MAPPED_FIELDS.includes(s)
          )
        ),
        (fieldName) => {
          const code = getCodeIndicateur(fieldName);
          const helpIconVisible = code !== null;
          const isInMapping = fieldName in INDICATEUR_MAPPING;
          expect(helpIconVisible).toBe(isInMapping);
        }
      ),
      { numRuns: 100 }
    );
  });
});
