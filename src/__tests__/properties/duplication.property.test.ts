// Feature: phase2-evolution, Property 23: Duplication d'observation
// **Validates: Requirements 12.2, 12.4**
//
// Pour toute observation source, la fonction de duplication doit produire un objet avec :
// (a) un nouvel id différent de l'id source (le résultat ne contient pas de propriété id),
// (b) la date mise à jour au jour courant,
// (c) l'heure mise à jour à l'heure courante,
// (d) tous les autres champs identiques à l'observation source.

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as fc from 'fast-check';
import { dupliquerObservation } from '@/lib/duplication';
import type { Observation, Modalite, MeteoType, VentType, HumiditeSol, Localisation, Progression, Note05, Note03 } from '@/lib/types';

// ---------------------------------------------------------------------------
// Generators
// ---------------------------------------------------------------------------

const modaliteArb: fc.Arbitrary<Modalite> = fc.constantFrom(
  'Témoin', 'Levain 1/4', 'Levain 1/2', 'Levain 1/4 + Cuivre', 'Levain 1/2 + Cuivre',
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

const localisationArb: fc.Arbitrary<Localisation | null> = fc.option(
  fc.constantFrom<Localisation>('Feuilles', 'Grappes', 'Tiges', 'Multiple'),
  { nil: null },
);

const progressionArb: fc.Arbitrary<Progression | null> = fc.option(
  fc.constantFrom<Progression>('Stable', 'En hausse', 'En baisse'),
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

const optionalNumber: fc.Arbitrary<number | null> = fc.option(
  fc.double({ min: 0, max: 10000, noNaN: true, noDefaultInfinity: true }),
  { nil: null },
);

const optionalString: fc.Arbitrary<string | null> = fc.option(
  fc.string({ minLength: 0, maxLength: 50 }),
  { nil: null },
);

const dateStrArb = fc
  .tuple(
    fc.integer({ min: 2020, max: 2030 }),
    fc.integer({ min: 1, max: 12 }),
    fc.integer({ min: 1, max: 28 }),
  )
  .map(([y, m, d]) => `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`);

const heureArb = fc
  .tuple(fc.integer({ min: 0, max: 23 }), fc.integer({ min: 0, max: 59 }))
  .map(([h, m]) => `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`);

/** Generate a random complete Observation object */
const observationArb: fc.Arbitrary<Observation> = fc.record({
  id: fc.uuid(),
  parcelle_id: fc.string({ minLength: 1, maxLength: 30 }).filter((s) => s.trim().length > 0),
  rang: fc.integer({ min: 1, max: 20 }),
  modalite: modaliteArb,
  date: dateStrArb,
  heure: heureArb,
  mois: fc.constantFrom('janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'),
  meteo: meteoArb,
  temperature: fc.option(fc.double({ min: -10, max: 50, noNaN: true, noDefaultInfinity: true }), { nil: null }),
  humidite: fc.option(fc.double({ min: 0, max: 100, noNaN: true, noDefaultInfinity: true }), { nil: null }),
  vent: ventArb,
  pluie_recente: fc.option(fc.boolean(), { nil: null }),
  derniere_pluie: fc.option(dateStrArb, { nil: null }),
  humidite_sol: humiditeSolArb,
  volume_applique_l: optionalNumber,
  ph_surnageant: fc.option(fc.double({ min: 0, max: 14, noNaN: true, noDefaultInfinity: true }), { nil: null }),
  surnageant_l: optionalNumber,
  eau_l: optionalNumber,
  cuivre: fc.option(fc.boolean(), { nil: null }),
  date_surnageant: fc.option(dateStrArb, { nil: null }),
  date_cuivre: fc.option(dateStrArb, { nil: null }),
  vigueur: note05Arb,
  croissance: note05Arb,
  homogeneite: note05Arb,
  couleur_feuilles: note05Arb,
  epaisseur_feuilles: note05Arb,
  turgescence: note05Arb,
  brulures: note05Arb,
  necroses: note05Arb,
  deformations: note05Arb,
  mildiou_presence: note05Arb,
  mildiou_intensite: fc.option(fc.double({ min: 0, max: 100, noNaN: true, noDefaultInfinity: true }), { nil: null }),
  localisation_mildiou: localisationArb,
  progression: progressionArb,
  pression_mildiou: note03Arb,
  nb_grappes_par_cep: fc.option(fc.integer({ min: 0, max: 100 }), { nil: null }),
  taille_grappes: note05Arb,
  homogeneite_grappes: note05Arb,
  nombre_grappes: fc.option(fc.integer({ min: 0, max: 500 }), { nil: null }),
  poids_moyen_grappe: optionalNumber,
  rendement_estime: optionalNumber,
  rendement_reel: optionalNumber,
  score_plante: fc.option(fc.double({ min: 0, max: 5, noNaN: true, noDefaultInfinity: true }), { nil: null }),
  score_sanitaire: fc.option(fc.double({ min: 0, max: 5, noNaN: true, noDefaultInfinity: true }), { nil: null }),
  commentaires: optionalString,
  created_at: fc.string({ minLength: 10, maxLength: 30 }),
});

// ---------------------------------------------------------------------------
// Fake time setup — fixed to 2025-07-15T10:30:00
// ---------------------------------------------------------------------------

const FAKE_NOW = new Date('2025-07-15T10:30:00');
const EXPECTED_DATE = '2025-07-15';
const EXPECTED_HEURE = '10:30';

// Fields stripped by dupliquerObservation (not present in result)
const STRIPPED_FIELDS = ['id', 'created_at', 'score_plante', 'score_sanitaire'] as const;

// Fields updated by dupliquerObservation
const UPDATED_FIELDS = ['date', 'heure', 'mois'] as const;

// ---------------------------------------------------------------------------
// Property tests
// ---------------------------------------------------------------------------

describe("Property 23: Duplication d'observation", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(FAKE_NOW);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  // (a) The result must NOT have an id property (it's stripped, not regenerated)
  it('should not include id in the duplicated result (id is stripped)', () => {
    fc.assert(
      fc.property(observationArb, (source) => {
        const result = dupliquerObservation(source);
        expect(result).not.toHaveProperty('id');
      }),
      { numRuns: 100 },
    );
  });

  // (b) The date must be updated to the current day
  it('should update date to the current day (YYYY-MM-DD)', () => {
    fc.assert(
      fc.property(observationArb, (source) => {
        const result = dupliquerObservation(source);
        expect(result.date).toBe(EXPECTED_DATE);
      }),
      { numRuns: 100 },
    );
  });

  // (c) The heure must be updated to the current time
  it('should update heure to the current time (HH:MM)', () => {
    fc.assert(
      fc.property(observationArb, (source) => {
        const result = dupliquerObservation(source);
        expect(result.heure).toBe(EXPECTED_HEURE);
      }),
      { numRuns: 100 },
    );
  });

  // (d) All other fields must be identical to the source observation
  it('should copy all non-stripped, non-updated fields identically from the source', () => {
    fc.assert(
      fc.property(observationArb, (source) => {
        const result = dupliquerObservation(source);

        // Check every field on the source that is not stripped or updated
        const allSourceKeys = Object.keys(source) as (keyof Observation)[];
        const skipKeys = new Set<string>([...STRIPPED_FIELDS, ...UPDATED_FIELDS]);

        for (const key of allSourceKeys) {
          if (skipKeys.has(key)) continue;
          expect((result as Record<string, unknown>)[key]).toEqual(
            source[key],
          );
        }
      }),
      { numRuns: 100 },
    );
  });

  // Additional: stripped fields (created_at, score_plante, score_sanitaire) must not be present
  it('should not include created_at, score_plante, or score_sanitaire in the result', () => {
    fc.assert(
      fc.property(observationArb, (source) => {
        const result = dupliquerObservation(source);
        expect(result).not.toHaveProperty('created_at');
        expect(result).not.toHaveProperty('score_plante');
        expect(result).not.toHaveProperty('score_sanitaire');
      }),
      { numRuns: 100 },
    );
  });
});
