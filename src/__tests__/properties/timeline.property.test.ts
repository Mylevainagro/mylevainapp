// Feature: phase2-evolution, Property 27: Fusion et tri de la timeline
// Feature: phase2-evolution, Property 28: Mapping type d'événement timeline
// Feature: phase2-evolution, Property 29: Filtrage de la timeline
// **Validates: Requirements 15.2, 15.3, 15.5**
//
// P27: Pour tout ensemble d'événements (observations + traitements + analyses_sol),
// la timeline doit les fusionner et les trier par date décroissante. Le nombre total
// d'événements dans la timeline doit être égal à la somme des observations,
// traitements et analyses_sol.
//
// P28: Pour tout événement de la timeline, le type doit correspondre à une icône et
// une couleur distinctes et prédéfinies. Deux types différents ne doivent jamais
// avoir la même combinaison icône + couleur.
//
// P29: Pour tout ensemble d'événements timeline et tout filtre (type, période), les
// événements retournés doivent tous correspondre aux critères du filtre. Le nombre
// de résultats filtrés doit être ≤ au nombre total d'événements.

import { describe, it, expect } from "vitest";
import * as fc from "fast-check";
import { buildTimeline, filterTimeline, EVENT_TYPE_CONFIG } from "@/lib/timeline";
import type { Observation, Traitement, AnalyseSol } from "@/lib/types";

// ---------------------------------------------------------------------------
// Generators
// ---------------------------------------------------------------------------

/** Generate a date string in YYYY-MM-DD format within a reasonable range */
const dateArb = fc
  .integer({ min: 0, max: 3650 })
  .map((days) => {
    const d = new Date(2020, 0, 1);
    d.setDate(d.getDate() + days);
    return d.toISOString().slice(0, 10);
  });

const modaliteArb = fc.constantFrom(
  "Témoin" as const,
  "Levain 1/4" as const,
  "Levain 1/2" as const,
  "Levain 1/4 + Cuivre" as const,
  "Levain 1/2 + Cuivre" as const,
);

const typeTraitementArb = fc.constantFrom(
  "cuivre" as const,
  "soufre" as const,
  "levain" as const,
  "biocontrole" as const,
  "phytosanitaire" as const,
  "fertilisation" as const,
  "autre" as const,
);

const phaseArb = fc.constantFrom("T0" as const, "Tfinal" as const);

/** Generate a partial Observation */
const observationArb: fc.Arbitrary<Partial<Observation>> = fc.record({
  id: fc.uuid(),
  date: dateArb,
  rang: fc.integer({ min: 1, max: 20 }),
  modalite: modaliteArb,
  commentaires: fc.option(fc.string({ minLength: 0, maxLength: 50 }), { nil: null }),
});

/** Generate a partial Traitement */
const traitementArb: fc.Arbitrary<Partial<Traitement>> = fc.record({
  id: fc.uuid(),
  date: dateArb,
  produit: fc.string({ minLength: 1, maxLength: 30 }),
  dose: fc.option(fc.string({ minLength: 1, maxLength: 10 }), { nil: null }),
  type_traitement: fc.option(typeTraitementArb, { nil: null }),
  objectif: fc.option(fc.string({ minLength: 1, maxLength: 30 }), { nil: null }),
});

/** Generate a partial AnalyseSol */
const analyseSolArb: fc.Arbitrary<Partial<AnalyseSol>> = fc.record({
  id: fc.uuid(),
  date_prelevement: dateArb,
  phase: phaseArb,
  ph: fc.option(fc.double({ min: 3, max: 10, noNaN: true }), { nil: null }),
});

const observationsArb = fc.array(observationArb, { minLength: 0, maxLength: 15 });
const traitementsArb = fc.array(traitementArb, { minLength: 0, maxLength: 15 });
const analysesArb = fc.array(analyseSolArb, { minLength: 0, maxLength: 10 });

const timelineTypeArb = fc.constantFrom("observation", "traitement", "analyse_sol");

// ---------------------------------------------------------------------------
// Property 27: Fusion et tri de la timeline
// ---------------------------------------------------------------------------

describe("Property 27: Fusion et tri de la timeline", () => {
  it("total event count equals sum of observations + traitements + analyses", () => {
    fc.assert(
      fc.property(
        observationsArb,
        traitementsArb,
        analysesArb,
        (observations, traitements, analyses) => {
          const timeline = buildTimeline(observations, traitements, analyses);
          expect(timeline.length).toBe(
            observations.length + traitements.length + analyses.length,
          );
        },
      ),
      { numRuns: 100 },
    );
  });

  it("events are sorted by date descending", () => {
    fc.assert(
      fc.property(
        observationsArb,
        traitementsArb,
        analysesArb,
        (observations, traitements, analyses) => {
          const timeline = buildTimeline(observations, traitements, analyses);
          for (let i = 1; i < timeline.length; i++) {
            expect(timeline[i - 1].date >= timeline[i].date).toBe(true);
          }
        },
      ),
      { numRuns: 100 },
    );
  });

  it("empty inputs produce an empty timeline", () => {
    const timeline = buildTimeline([], [], []);
    expect(timeline).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// Property 28: Mapping type d'événement timeline
// ---------------------------------------------------------------------------

describe("Property 28: Mapping type d'événement timeline", () => {
  it("every event has icone and couleur matching EVENT_TYPE_CONFIG for its type", () => {
    fc.assert(
      fc.property(
        observationsArb,
        traitementsArb,
        analysesArb,
        (observations, traitements, analyses) => {
          const timeline = buildTimeline(observations, traitements, analyses);
          for (const event of timeline) {
            const cfg = EVENT_TYPE_CONFIG[event.type];
            expect(cfg).toBeDefined();
            expect(event.icone).toBe(cfg.icone);
            expect(event.couleur).toBe(cfg.couleur);
          }
        },
      ),
      { numRuns: 100 },
    );
  });

  it("all event types have distinct icone+couleur combinations", () => {
    const types = Object.keys(EVENT_TYPE_CONFIG) as Array<keyof typeof EVENT_TYPE_CONFIG>;
    const combos = types.map((t) => `${EVENT_TYPE_CONFIG[t].icone}|${EVENT_TYPE_CONFIG[t].couleur}`);
    expect(new Set(combos).size).toBe(types.length);
  });

  it("two different types never share the same icone+couleur", () => {
    const types = Object.keys(EVENT_TYPE_CONFIG) as Array<keyof typeof EVENT_TYPE_CONFIG>;
    for (let i = 0; i < types.length; i++) {
      for (let j = i + 1; j < types.length; j++) {
        const a = EVENT_TYPE_CONFIG[types[i]];
        const b = EVENT_TYPE_CONFIG[types[j]];
        expect(`${a.icone}|${a.couleur}`).not.toBe(`${b.icone}|${b.couleur}`);
      }
    }
  });
});

// ---------------------------------------------------------------------------
// Property 29: Filtrage de la timeline
// ---------------------------------------------------------------------------

describe("Property 29: Filtrage de la timeline", () => {
  it("type filter: all returned events match the requested type", () => {
    fc.assert(
      fc.property(
        observationsArb,
        traitementsArb,
        analysesArb,
        timelineTypeArb,
        (observations, traitements, analyses, type) => {
          const timeline = buildTimeline(observations, traitements, analyses);
          const filtered = filterTimeline(timeline, { type });

          for (const event of filtered) {
            expect(event.type).toBe(type);
          }
          expect(filtered.length).toBeLessThanOrEqual(timeline.length);
        },
      ),
      { numRuns: 100 },
    );
  });

  it("period filter: all returned events fall within the date range", () => {
    fc.assert(
      fc.property(
        observationsArb,
        traitementsArb,
        analysesArb,
        dateArb,
        dateArb,
        (observations, traitements, analyses, d1, d2) => {
          const date_debut = d1 <= d2 ? d1 : d2;
          const date_fin = d1 <= d2 ? d2 : d1;

          const timeline = buildTimeline(observations, traitements, analyses);
          const filtered = filterTimeline(timeline, { date_debut, date_fin });

          for (const event of filtered) {
            expect(event.date >= date_debut).toBe(true);
            expect(event.date <= date_fin).toBe(true);
          }
          expect(filtered.length).toBeLessThanOrEqual(timeline.length);
        },
      ),
      { numRuns: 100 },
    );
  });

  it("combined filters: all returned events satisfy every active criterion", () => {
    const filtersArb = fc.record(
      {
        type: timelineTypeArb,
        date_debut: dateArb,
        date_fin: dateArb,
      },
      { requiredKeys: [] },
    );

    fc.assert(
      fc.property(
        observationsArb,
        traitementsArb,
        analysesArb,
        filtersArb,
        (observations, traitements, analyses, filters) => {
          const timeline = buildTimeline(observations, traitements, analyses);
          const filtered = filterTimeline(timeline, filters);

          for (const event of filtered) {
            if (filters.type) {
              expect(event.type).toBe(filters.type);
            }
            if (filters.date_debut) {
              expect(event.date >= filters.date_debut).toBe(true);
            }
            if (filters.date_fin) {
              expect(event.date <= filters.date_fin).toBe(true);
            }
          }
          expect(filtered.length).toBeLessThanOrEqual(timeline.length);
        },
      ),
      { numRuns: 100 },
    );
  });

  it("no matching events are excluded by the filter", () => {
    const filtersArb = fc.record(
      {
        type: timelineTypeArb,
        date_debut: dateArb,
        date_fin: dateArb,
      },
      { requiredKeys: [] },
    );

    fc.assert(
      fc.property(
        observationsArb,
        traitementsArb,
        analysesArb,
        filtersArb,
        (observations, traitements, analyses, filters) => {
          const timeline = buildTimeline(observations, traitements, analyses);
          const filtered = filterTimeline(timeline, filters);
          const filteredIds = new Set(filtered.map((e) => e.id));

          for (const event of timeline) {
            const matchesType = !filters.type || event.type === filters.type;
            const matchesDebut = !filters.date_debut || event.date >= filters.date_debut;
            const matchesFin = !filters.date_fin || event.date <= filters.date_fin;

            if (matchesType && matchesDebut && matchesFin) {
              expect(filteredIds.has(event.id)).toBe(true);
            }
          }
        },
      ),
      { numRuns: 100 },
    );
  });
});
