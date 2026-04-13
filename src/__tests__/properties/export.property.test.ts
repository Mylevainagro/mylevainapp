// Feature: phase2-evolution, Property 3: Round-trip export CSV
// Feature: phase2-evolution, Property 4: Round-trip export Excel
// Feature: phase2-evolution, Property 5: Round-trip export JSON
// Feature: phase2-evolution, Property 6: Correction des filtres d'export
// Feature: phase2-evolution, Property 7: Stabilité des UUID dans l'export
// **Validates: Requirements 3.1, 3.2, 3.3, 3.4, 3.6**
//
// Property 3: Pour tout ensemble de records, exporter en CSV puis parser le CSV
// résultant doit produire des données équivalentes (mêmes colonnes, mêmes valeurs,
// même nombre de lignes).
//
// Property 4: Pour tout ensemble de données, exporter en Excel multi-onglets puis
// lire les onglets doit produire des données équivalentes pour chaque feuille.
//
// Property 5: Pour tout objet de données, JSON.parse(exportJSON(data)) doit produire
// un objet équivalent aux données d'origine.
//
// Property 6: Pour tout ensemble de filtres et de données, tous les enregistrements
// filtrés doivent satisfaire chaque filtre appliqué. Le nombre filtré ≤ total.
//
// Property 7: Pour tout enregistrement avec un champ id (UUID), l'id dans l'export
// doit être identique à l'id de l'enregistrement source.

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import {
  exportCSV,
  exportExcel,
  exportJSON,
  applyExportFilters,
} from '@/lib/export';

// ---------------------------------------------------------------------------
// Generators
// ---------------------------------------------------------------------------

/** Simple alphanumeric string without commas, quotes, or newlines for safe CSV round-trip */
const safeStringArb: fc.Arbitrary<string> = fc
  .string({ minLength: 1, maxLength: 20 })
  .map((s) => s.replace(/[,"\n\r]/g, '').replace(/\s+/g, ' ').trim())
  .filter((s) => s.length > 0);

/** Simple numeric value (integer) for safe round-trip through CSV/Excel */
const safeNumberArb = fc.integer({ min: -9999, max: 9999 });

/** Generate a simple record with string and number values (safe for CSV round-trip) */
const simpleRecordArb: fc.Arbitrary<Record<string, string | number>> = fc.record({
  col_a: safeStringArb,
  col_b: safeStringArb,
  col_c: safeNumberArb,
}) as fc.Arbitrary<Record<string, string | number>>;

/** Non-empty array of simple records (all same shape) */
const simpleRecordsArb = fc.array(simpleRecordArb, { minLength: 1, maxLength: 20 });

/** UUID arbitrary */
const uuidArb = fc.uuid();

/** Record with a UUID id field */
const recordWithIdArb: fc.Arbitrary<Record<string, unknown>> = fc.record({
  id: uuidArb,
  nom: safeStringArb,
  valeur: safeNumberArb,
});

/** Non-empty array of records with id */
const recordsWithIdArb = fc.array(recordWithIdArb, { minLength: 1, maxLength: 20 });

/** Date string YYYY-MM-DD */
const dateArb = fc
  .tuple(
    fc.integer({ min: 2020, max: 2030 }),
    fc.integer({ min: 1, max: 12 }),
    fc.integer({ min: 1, max: 28 }),
  )
  .map(([y, m, d]) => `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`);

const siteIdArb = fc.constantFrom('s1', 's2', 's3');
const campagneArb = fc.constantFrom('2023', '2024', '2025');
const modaliteArb = fc.constantFrom('Témoin', 'Levain 1/4', 'Levain 1/2');

/** Record with filterable fields */
const filterableRecordArb = fc.record({
  id: uuidArb,
  site_id: siteIdArb,
  campagne: campagneArb,
  date: dateArb,
  modalite: modaliteArb,
});

const filterableRecordsArb = fc.array(filterableRecordArb, { minLength: 0, maxLength: 30 });

/** Random export filters (each field optionally set) */
const filtersArb = fc.record({
  site_id: fc.option(siteIdArb, { nil: undefined }),
  campagne: fc.option(campagneArb, { nil: undefined }),
  date_debut: fc.option(dateArb, { nil: undefined }),
  date_fin: fc.option(dateArb, { nil: undefined }),
  modalite: fc.option(modaliteArb, { nil: undefined }),
});

// ---------------------------------------------------------------------------
// Helper: parse CSV string back into records
// ---------------------------------------------------------------------------

function parseCSV(csv: string): Record<string, string>[] {
  const lines = csv.split('\n');
  if (lines.length < 2) return [];
  const headers = lines[0].split(',');
  return lines.slice(1).map((line) => {
    const values = line.split(',');
    const record: Record<string, string> = {};
    headers.forEach((h, i) => {
      record[h] = values[i] ?? '';
    });
    return record;
  });
}

// ---------------------------------------------------------------------------
// Property 3: Round-trip export CSV
// ---------------------------------------------------------------------------

describe('Property 3: Round-trip export CSV', () => {
  it('export CSV then parse back should produce same row count and column values', () => {
    fc.assert(
      fc.property(simpleRecordsArb, (records) => {
        const csv = exportCSV(records as Record<string, unknown>[], 'test');
        const parsed = parseCSV(csv);

        // Same number of rows
        expect(parsed).toHaveLength(records.length);

        // Same columns
        const expectedHeaders = Object.keys(records[0]);
        const csvHeaders = csv.split('\n')[0].split(',');
        expect(csvHeaders).toEqual(expectedHeaders);

        // Same values (CSV values are strings, so compare as strings)
        for (let i = 0; i < records.length; i++) {
          for (const key of expectedHeaders) {
            expect(parsed[i][key]).toBe(String(records[i][key]));
          }
        }
      }),
      { numRuns: 100 },
    );
  });

  it('empty array should produce empty string', () => {
    expect(exportCSV([], 'test')).toBe('');
  });
});

// ---------------------------------------------------------------------------
// Property 4: Round-trip export Excel
// ---------------------------------------------------------------------------

describe('Property 4: Round-trip export Excel', () => {
  it('export Excel then read back should produce same data per sheet', async () => {
    const XLSX = await import('xlsx');

    await fc.assert(
      fc.asyncProperty(simpleRecordsArb, async (records) => {
        const sheetName = 'TestSheet';
        const blob = await exportExcel({ [sheetName]: records as Record<string, unknown>[] });

        const buf = await blob.arrayBuffer();
        const wb = XLSX.read(buf);

        // Sheet exists
        expect(wb.SheetNames).toContain(sheetName);

        // Parse back
        const parsed = XLSX.utils.sheet_to_json<Record<string, unknown>>(wb.Sheets[sheetName]);

        // Same row count
        expect(parsed).toHaveLength(records.length);

        // Same values
        for (let i = 0; i < records.length; i++) {
          for (const key of Object.keys(records[i])) {
            const original = records[i][key];
            const roundTripped = parsed[i][key];
            // xlsx preserves numbers as numbers and strings as strings
            if (typeof original === 'number') {
              expect(roundTripped).toBe(original);
            } else {
              expect(String(roundTripped)).toBe(String(original));
            }
          }
        }
      }),
      { numRuns: 100 },
    );
  });
});

// ---------------------------------------------------------------------------
// Property 5: Round-trip export JSON
// ---------------------------------------------------------------------------

describe('Property 5: Round-trip export JSON', () => {
  it('JSON.parse(exportJSON(data)) should be equivalent to original data', () => {
    fc.assert(
      fc.property(
        fc.record({
          sites: fc.array(fc.record({ id: uuidArb, nom: safeStringArb }), { minLength: 0, maxLength: 5 }),
          observations: fc.array(fc.record({ id: uuidArb, date: dateArb, valeur: safeNumberArb }), { minLength: 0, maxLength: 5 }),
          traitements: fc.array(fc.record({ id: uuidArb, produit: safeStringArb }), { minLength: 0, maxLength: 5 }),
        }),
        (data) => {
          const json = exportJSON(data);
          const parsed = JSON.parse(json);

          expect(parsed).toEqual(data);
        },
      ),
      { numRuns: 100 },
    );
  });

  it('should preserve nested structures through round-trip', () => {
    fc.assert(
      fc.property(
        fc.record({
          meta: fc.record({ version: safeStringArb, count: safeNumberArb }),
          items: fc.array(fc.record({ id: uuidArb, name: safeStringArb }), { minLength: 1, maxLength: 10 }),
        }),
        (data) => {
          const json = exportJSON(data);
          const parsed = JSON.parse(json);

          expect(parsed).toEqual(data);
        },
      ),
      { numRuns: 100 },
    );
  });
});

// ---------------------------------------------------------------------------
// Property 6: Correction des filtres d'export
// ---------------------------------------------------------------------------

describe('Property 6: Correction des filtres d\'export', () => {
  it('all filtered records should satisfy every applied filter', () => {
    fc.assert(
      fc.property(filterableRecordsArb, filtersArb, (records, filters) => {
        const filtered = applyExportFilters(records, filters);

        for (const row of filtered) {
          if (filters.site_id !== undefined) {
            expect(row.site_id).toBe(filters.site_id);
          }
          if (filters.campagne !== undefined) {
            expect(row.campagne).toBe(filters.campagne);
          }
          if (filters.modalite !== undefined) {
            expect(row.modalite).toBe(filters.modalite);
          }
          if (filters.date_debut !== undefined && row.date !== undefined) {
            expect(row.date >= filters.date_debut).toBe(true);
          }
          if (filters.date_fin !== undefined && row.date !== undefined) {
            expect(row.date <= filters.date_fin).toBe(true);
          }
        }
      }),
      { numRuns: 100 },
    );
  });

  it('filtered count should be <= total count', () => {
    fc.assert(
      fc.property(filterableRecordsArb, filtersArb, (records, filters) => {
        const filtered = applyExportFilters(records, filters);
        expect(filtered.length).toBeLessThanOrEqual(records.length);
      }),
      { numRuns: 100 },
    );
  });

  it('with no filters, all records should be returned', () => {
    fc.assert(
      fc.property(filterableRecordsArb, (records) => {
        const filtered = applyExportFilters(records, {});
        expect(filtered.length).toBe(records.length);
      }),
      { numRuns: 100 },
    );
  });
});

// ---------------------------------------------------------------------------
// Property 7: Stabilité des UUID dans l'export
// ---------------------------------------------------------------------------

describe('Property 7: Stabilité des UUID dans l\'export', () => {
  it('UUID ids in CSV export should match original record ids', () => {
    fc.assert(
      fc.property(recordsWithIdArb, (records) => {
        const csv = exportCSV(records, 'test');
        const parsed = parseCSV(csv);

        expect(parsed).toHaveLength(records.length);

        for (let i = 0; i < records.length; i++) {
          expect(parsed[i].id).toBe(String(records[i].id));
        }
      }),
      { numRuns: 100 },
    );
  });

  it('UUID ids in JSON export should match original record ids', () => {
    fc.assert(
      fc.property(recordsWithIdArb, (records) => {
        const data = { items: records };
        const json = exportJSON(data);
        const parsed = JSON.parse(json);

        expect(parsed.items).toHaveLength(records.length);

        for (let i = 0; i < records.length; i++) {
          expect(parsed.items[i].id).toBe(records[i].id);
        }
      }),
      { numRuns: 100 },
    );
  });

  it('UUID ids in Excel export should match original record ids', async () => {
    const XLSX = await import('xlsx');

    await fc.assert(
      fc.asyncProperty(recordsWithIdArb, async (records) => {
        const blob = await exportExcel({ Data: records });
        const buf = await blob.arrayBuffer();
        const wb = XLSX.read(buf);
        const parsed = XLSX.utils.sheet_to_json<Record<string, unknown>>(wb.Sheets['Data']);

        expect(parsed).toHaveLength(records.length);

        for (let i = 0; i < records.length; i++) {
          expect(String(parsed[i].id)).toBe(String(records[i].id));
        }
      }),
      { numRuns: 100 },
    );
  });
});
