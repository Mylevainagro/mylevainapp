// Feature: phase2-evolution, Property 24: Pré-remplissage du lot (batch)
// Feature: phase2-evolution, Property 25: Soumission par lot avec erreurs partielles
// **Validates: Requirements 13.2, 13.3, 13.5**
//
// Property 24: Pour tout lot de saisie avec des champs communs (date, heure, parcelle_id, météo),
// les 7 observations générées doivent toutes partager ces champs communs. De plus, chaque
// observation doit avoir le rang et la modalité correspondant au référentiel des modalités.
//
// Property 25: Pour tout lot de N rangs dont M rangs sont valides (0 ≤ M ≤ N), la soumission
// doit créer exactement M observations. Les rangs invalides doivent être signalés sans empêcher
// l'insertion des rangs valides.

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { prepareBatchRecords, validateBatch } from '@/lib/batch';
import type { BatchRangInput, SharedFields } from '@/lib/batch';
import { MODALITES_REF } from '@/lib/constants';
import type { Note05, Note03, MeteoType, VentType, HumiditeSol } from '@/lib/types';

// ---------------------------------------------------------------------------
// Generators
// ---------------------------------------------------------------------------

const validParcelleId = fc
  .string({ minLength: 1, maxLength: 30 })
  .filter((s) => s.trim().length > 0);

const validDate = fc
  .tuple(
    fc.integer({ min: 2020, max: 2030 }),
    fc.integer({ min: 1, max: 12 }),
    fc.integer({ min: 1, max: 28 }),
  )
  .map(([y, m, d]) => `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`);

const heureArb = fc
  .tuple(fc.integer({ min: 0, max: 23 }), fc.integer({ min: 0, max: 59 }))
  .map(([h, m]) => `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`);

const moisArb = fc.constantFrom(
  'mars', 'avril', 'mai', 'juin', 'juillet',
  'août', 'septembre', 'octobre', 'novembre', 'décembre',
);

const meteoArb: fc.Arbitrary<MeteoType | null> = fc.option(
  fc.constantFrom<MeteoType>('Ensoleillé', 'Nuageux', 'Couvert', 'Pluie', 'Orage'),
  { nil: null },
);

const ventArb: fc.Arbitrary<VentType | null> = fc.option(
  fc.constantFrom<VentType>('Nul', 'Faible', 'Modéré', 'Fort'),
  { nil: null },
);

const humiditeSolArb: fc.Arbitrary<HumiditeSol | null> = fc.option(
  fc.constantFrom<HumiditeSol>('Sec', 'Humide', 'Gorgé'),
  { nil: null },
);

const temperatureArb = fc.option(
  fc.double({ min: -10, max: 50, noNaN: true, noDefaultInfinity: true }),
  { nil: null },
);

const humiditeArb = fc.option(
  fc.double({ min: 0, max: 100, noNaN: true, noDefaultInfinity: true }),
  { nil: null },
);

const note05Arb: fc.Arbitrary<Note05 | null> = fc.option(
  fc.constantFrom<Note05>(0, 1, 2, 3, 4, 5),
  { nil: null },
);

const note03Arb: fc.Arbitrary<Note03 | null> = fc.option(
  fc.constantFrom<Note03>(0, 1, 2, 3),
  { nil: null },
);

const mildiouIntensiteArb = fc.option(
  fc.double({ min: 0, max: 100, noNaN: true, noDefaultInfinity: true }),
  { nil: null },
);

/** Generate valid SharedFields */
const sharedFieldsArb: fc.Arbitrary<SharedFields> = fc.record({
  parcelle_id: validParcelleId,
  date: validDate,
  heure: heureArb,
  mois: moisArb,
  meteo: meteoArb as fc.Arbitrary<string | null>,
  temperature: temperatureArb,
  humidite: humiditeArb,
  vent: ventArb as fc.Arbitrary<string | null>,
  humidite_sol: humiditeSolArb as fc.Arbitrary<string | null>,
});

/** Generate a valid BatchRangInput for a given rang number, using the referential modalite */
function validRangArb(rang: number): fc.Arbitrary<BatchRangInput> {
  const ref = MODALITES_REF.find((m) => m.rang === rang);
  const modalite = ref ? ref.modalite : 'Témoin';
  return fc.record({
    rang: fc.constant(rang),
    modalite: fc.constant(modalite),
    vigueur: note05Arb,
    mildiou_presence: note05Arb,
    mildiou_intensite: mildiouIntensiteArb,
    pression_mildiou: note03Arb,
    commentaires: fc.option(fc.string({ minLength: 0, maxLength: 50 }), { nil: null }),
  });
}

/** Generate all 7 valid rangs following the referential */
const allSevenRangsArb: fc.Arbitrary<BatchRangInput[]> = fc.tuple(
  validRangArb(1),
  validRangArb(2),
  validRangArb(3),
  validRangArb(4),
  validRangArb(5),
  validRangArb(6),
  validRangArb(7),
).map((rangs) => rangs);

/** Generate a BatchRangInput that is intentionally invalid (out-of-range values) */
function invalidRangArb(rang: number): fc.Arbitrary<BatchRangInput> {
  // Use out-of-range values for numeric fields to trigger validation errors
  return fc.record({
    rang: fc.constant(rang),
    modalite: fc.constant('Témoin'),
    vigueur: fc.constant(10 as unknown as Note05), // out of range [0,5]
    mildiou_presence: note05Arb,
    mildiou_intensite: mildiouIntensiteArb,
    pression_mildiou: note03Arb,
    commentaires: fc.constant(null),
  });
}

// ---------------------------------------------------------------------------
// Property 24: Pré-remplissage du lot (batch)
// ---------------------------------------------------------------------------

describe('Property 24: Pré-remplissage du lot (batch)', () => {
  it('all 7 records should share the same common fields (parcelle_id, date, heure, meteo, temperature, humidite)', () => {
    fc.assert(
      fc.property(sharedFieldsArb, allSevenRangsArb, (shared, rangs) => {
        const records = prepareBatchRecords(rangs, shared);

        // All 7 rangs are valid, so we expect 7 records
        expect(records).toHaveLength(7);

        for (const record of records) {
          expect(record.parcelle_id).toBe(shared.parcelle_id);
          expect(record.date).toBe(shared.date);
          expect(record.heure).toBe(shared.heure);
          expect(record.meteo).toBe(shared.meteo);
          expect(record.temperature).toBe(shared.temperature);
          expect(record.humidite).toBe(shared.humidite);
        }
      }),
      { numRuns: 100 },
    );
  });

  it('each record should have the rang and modalite matching the referential', () => {
    fc.assert(
      fc.property(sharedFieldsArb, allSevenRangsArb, (shared, rangs) => {
        const records = prepareBatchRecords(rangs, shared);

        expect(records).toHaveLength(7);

        for (const record of records) {
          const ref = MODALITES_REF.find((m) => m.rang === record.rang);
          expect(ref).toBeDefined();
          expect(record.modalite).toBe(ref!.modalite);
        }
      }),
      { numRuns: 100 },
    );
  });

  it('shared fields should be identical across all records for any random shared input', () => {
    fc.assert(
      fc.property(sharedFieldsArb, allSevenRangsArb, (shared, rangs) => {
        const records = prepareBatchRecords(rangs, shared);

        if (records.length < 2) return; // skip if not enough records

        const first = records[0];
        for (let i = 1; i < records.length; i++) {
          expect(records[i].parcelle_id).toBe(first.parcelle_id);
          expect(records[i].date).toBe(first.date);
          expect(records[i].heure).toBe(first.heure);
          expect(records[i].meteo).toBe(first.meteo);
          expect(records[i].temperature).toBe(first.temperature);
          expect(records[i].humidite).toBe(first.humidite);
        }
      }),
      { numRuns: 100 },
    );
  });
});

// ---------------------------------------------------------------------------
// Property 25: Soumission par lot avec erreurs partielles
// ---------------------------------------------------------------------------

describe('Property 25: Soumission par lot avec erreurs partielles', () => {
  it('submitted count should equal the number of valid rangs, errors count should equal the number of invalid rangs', () => {
    // Generate a mix of valid and invalid rangs
    fc.assert(
      fc.property(
        sharedFieldsArb,
        // For each of the 7 rangs, randomly decide if it's valid or invalid
        fc.tuple(
          fc.boolean(), fc.boolean(), fc.boolean(), fc.boolean(),
          fc.boolean(), fc.boolean(), fc.boolean(),
        ),
        (shared, validFlags) => {
          const rangs: BatchRangInput[] = validFlags.map((isValid, i) => {
            const rangNum = i + 1;
            if (isValid) {
              const ref = MODALITES_REF.find((m) => m.rang === rangNum);
              return {
                rang: rangNum,
                modalite: ref ? ref.modalite : 'Témoin',
                vigueur: 3 as Note05,
                mildiou_presence: 1 as Note05,
                mildiou_intensite: 10,
                pression_mildiou: 1 as Note03,
                commentaires: null,
              };
            } else {
              return {
                rang: rangNum,
                modalite: 'Témoin',
                vigueur: 10 as unknown as Note05, // out of range
                mildiou_presence: 1 as Note05,
                mildiou_intensite: 10,
                pression_mildiou: 1 as Note03,
                commentaires: null,
              };
            }
          });

          const expectedValid = validFlags.filter(Boolean).length;
          const expectedInvalid = validFlags.filter((f) => !f).length;

          const result = validateBatch(rangs, shared);

          expect(result.submitted).toBe(expectedValid);
          expect(result.errors).toHaveLength(expectedInvalid);
        },
      ),
      { numRuns: 100 },
    );
  });

  it('invalid rangs should be reported with their rang number without blocking valid rangs', () => {
    fc.assert(
      fc.property(
        sharedFieldsArb,
        fc.subarray([1, 2, 3, 4, 5, 6, 7], { minLength: 1, maxLength: 6 }),
        (shared, invalidRangNumbers) => {
          const invalidSet = new Set(invalidRangNumbers);

          const rangs: BatchRangInput[] = Array.from({ length: 7 }, (_, i) => {
            const rangNum = i + 1;
            const ref = MODALITES_REF.find((m) => m.rang === rangNum);
            if (invalidSet.has(rangNum)) {
              return {
                rang: rangNum,
                modalite: ref ? ref.modalite : 'Témoin',
                vigueur: 10 as unknown as Note05, // invalid
                mildiou_presence: 1 as Note05,
                mildiou_intensite: 10,
                pression_mildiou: 1 as Note03,
                commentaires: null,
              };
            }
            return {
              rang: rangNum,
              modalite: ref ? ref.modalite : 'Témoin',
              vigueur: 3 as Note05,
              mildiou_presence: 1 as Note05,
              mildiou_intensite: 10,
              pression_mildiou: 1 as Note03,
              commentaires: null,
            };
          });

          const result = validateBatch(rangs, shared);

          // Valid rangs should be submitted
          expect(result.submitted).toBe(7 - invalidSet.size);

          // Each invalid rang should appear in errors
          expect(result.errors).toHaveLength(invalidSet.size);
          const errorRangs = new Set(result.errors.map((e) => e.rang));
          for (const r of invalidRangNumbers) {
            expect(errorRangs.has(r)).toBe(true);
          }
        },
      ),
      { numRuns: 100 },
    );
  });

  it('prepareBatchRecords should produce exactly M records when M out of N rangs are valid', () => {
    fc.assert(
      fc.property(
        sharedFieldsArb,
        fc.tuple(
          fc.boolean(), fc.boolean(), fc.boolean(), fc.boolean(),
          fc.boolean(), fc.boolean(), fc.boolean(),
        ),
        (shared, validFlags) => {
          const rangs: BatchRangInput[] = validFlags.map((isValid, i) => {
            const rangNum = i + 1;
            const ref = MODALITES_REF.find((m) => m.rang === rangNum);
            if (isValid) {
              return {
                rang: rangNum,
                modalite: ref ? ref.modalite : 'Témoin',
                vigueur: 3 as Note05,
                mildiou_presence: 1 as Note05,
                mildiou_intensite: 10,
                pression_mildiou: 1 as Note03,
                commentaires: null,
              };
            }
            return {
              rang: rangNum,
              modalite: 'Témoin',
              vigueur: 10 as unknown as Note05, // invalid
              mildiou_presence: 1 as Note05,
              mildiou_intensite: 10,
              pression_mildiou: 1 as Note03,
              commentaires: null,
            };
          });

          const expectedValid = validFlags.filter(Boolean).length;
          const records = prepareBatchRecords(rangs, shared);

          expect(records).toHaveLength(expectedValid);
        },
      ),
      { numRuns: 100 },
    );
  });
});
