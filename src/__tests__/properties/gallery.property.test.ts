// Feature: phase2-evolution, Property 26: Tri et filtrage de la galerie photo
// **Validates: Requirements 14.2, 14.4**
//
// P26: Pour tout ensemble de photos d'une parcelle, la galerie doit les
// retourner triées par date d'observation croissante. Pour tout filtre
// (type, période), les photos retournées doivent toutes correspondre
// aux critères du filtre.

import { describe, it, expect } from "vitest";
import * as fc from "fast-check";
import {
  filterAndSortPhotos,
  type GalleryPhoto,
  type GalleryFilters,
} from "@/lib/gallery";

// ---------------------------------------------------------------------------
// Generators
// ---------------------------------------------------------------------------

const photoTypeArb = fc.constantFrom<GalleryPhoto["type"]>(
  "feuille",
  "grappe",
  "sol",
  "rang",
  "autre",
);

/** Generate a date string in YYYY-MM-DD format within a reasonable range */
const dateArb = fc
  .integer({ min: 0, max: 3650 }) // ~10 years of days
  .map((days) => {
    const d = new Date(2020, 0, 1);
    d.setDate(d.getDate() + days);
    return d.toISOString().slice(0, 10);
  });

const isoDateArb = fc
  .integer({
    min: new Date("2020-01-01").getTime(),
    max: new Date("2030-12-31").getTime(),
  })
  .map((ts) => new Date(ts).toISOString());

/** Generate a valid GalleryPhoto */
const galleryPhotoArb: fc.Arbitrary<GalleryPhoto> = fc.record({
  id: fc.uuid(),
  observation_id: fc.uuid(),
  type: photoTypeArb,
  url: fc.webUrl(),
  legende: fc.option(fc.string({ minLength: 0, maxLength: 100 }), {
    nil: null,
  }),
  created_at: isoDateArb,
  date: dateArb,
  rang: fc.option(fc.integer({ min: 1, max: 20 }), { nil: null }),
});

/** Generate an array of GalleryPhotos */
const photosArb = fc.array(galleryPhotoArb, { minLength: 0, maxLength: 30 });

/** Generate GalleryFilters with optional fields */
const filtersArb: fc.Arbitrary<GalleryFilters> = fc.record(
  {
    type: photoTypeArb,
    date_debut: dateArb,
    date_fin: dateArb,
  },
  { requiredKeys: [] },
);

// ---------------------------------------------------------------------------
// Property 26: Tri et filtrage de la galerie photo
// ---------------------------------------------------------------------------

describe("Property 26: Tri et filtrage de la galerie photo", () => {
  it("photos are always sorted by date ascending", () => {
    fc.assert(
      fc.property(photosArb, filtersArb, (photos, filters) => {
        const result = filterAndSortPhotos(photos, filters);

        // Verify ascending date order
        for (let i = 1; i < result.length; i++) {
          expect(result[i].date >= result[i - 1].date).toBe(true);
        }
      }),
      { numRuns: 100 },
    );
  });

  it("type filter: all returned photos match the requested type", () => {
    fc.assert(
      fc.property(photosArb, photoTypeArb, (photos, type) => {
        const result = filterAndSortPhotos(photos, { type });

        for (const photo of result) {
          expect(photo.type).toBe(type);
        }

        // Result count must be <= input count
        expect(result.length).toBeLessThanOrEqual(photos.length);
      }),
      { numRuns: 100 },
    );
  });

  it("period filter: all returned photos fall within the date range", () => {
    fc.assert(
      fc.property(
        photosArb,
        dateArb,
        dateArb,
        (photos, d1, d2) => {
          // Ensure date_debut <= date_fin
          const date_debut = d1 <= d2 ? d1 : d2;
          const date_fin = d1 <= d2 ? d2 : d1;

          const result = filterAndSortPhotos(photos, { date_debut, date_fin });

          for (const photo of result) {
            expect(photo.date >= date_debut).toBe(true);
            expect(photo.date <= date_fin).toBe(true);
          }

          expect(result.length).toBeLessThanOrEqual(photos.length);
        },
      ),
      { numRuns: 100 },
    );
  });

  it("combined filters: all returned photos satisfy every active criterion", () => {
    fc.assert(
      fc.property(photosArb, filtersArb, (photos, filters) => {
        const result = filterAndSortPhotos(photos, filters);

        for (const photo of result) {
          if (filters.type) {
            expect(photo.type).toBe(filters.type);
          }
          if (filters.date_debut) {
            expect(photo.date >= filters.date_debut).toBe(true);
          }
          if (filters.date_fin) {
            expect(photo.date <= filters.date_fin).toBe(true);
          }
        }

        // Filtered result is never larger than input
        expect(result.length).toBeLessThanOrEqual(photos.length);
      }),
      { numRuns: 100 },
    );
  });

  it("no matching photos are excluded by the filter", () => {
    fc.assert(
      fc.property(photosArb, filtersArb, (photos, filters) => {
        const result = filterAndSortPhotos(photos, filters);
        const resultIds = new Set(result.map((p) => p.id));

        // Every photo in the input that matches all filters must appear in result
        for (const photo of photos) {
          const matchesType = !filters.type || photo.type === filters.type;
          const matchesDebut =
            !filters.date_debut || photo.date >= filters.date_debut;
          const matchesFin =
            !filters.date_fin || photo.date <= filters.date_fin;

          if (matchesType && matchesDebut && matchesFin) {
            expect(resultIds.has(photo.id)).toBe(true);
          }
        }
      }),
      { numRuns: 100 },
    );
  });
});
