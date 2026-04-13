// ============================================================
// MyLevain Agro — Export CSV / Excel / JSON
// Exigences : 3.1, 3.2, 3.3, 3.4, 3.5, 3.6
// ============================================================

import type { ExportFilters } from "@/lib/types";

// ---------------------------------------------------------------------------
// CSV Export — one file per entity
// ---------------------------------------------------------------------------

/**
 * Escape a single CSV cell value.
 * Wraps in double-quotes when the value contains a comma, double-quote,
 * or newline. Inner double-quotes are doubled per RFC 4180.
 */
function escapeCSVValue(value: unknown): string {
  if (value === null || value === undefined) return "";
  const str = String(value);
  if (str.includes(",") || str.includes('"') || str.includes("\n") || str.includes("\r")) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

/**
 * Convert an array of records to a CSV string.
 * Headers are derived from the keys of the first record.
 * UUID fields are preserved as-is for traceability (Exigence 3.6).
 */
export function exportCSV(data: Record<string, unknown>[], entite: string): string {
  if (data.length === 0) return "";

  const headers = Object.keys(data[0]);
  const headerLine = headers.map(escapeCSVValue).join(",");

  const rows = data.map((row) =>
    headers.map((h) => escapeCSVValue(row[h])).join(",")
  );

  return [headerLine, ...rows].join("\n");
}

// ---------------------------------------------------------------------------
// Excel Export — multi-sheet workbook (dynamic import to avoid SSR issues)
// ---------------------------------------------------------------------------

/**
 * Create a multi-sheet Excel workbook and return it as a Blob.
 * Each key in `sheets` becomes a sheet name; the value is the data array.
 * Uses dynamic import of xlsx to stay SSR-safe.
 */
export async function exportExcel(
  sheets: Record<string, Record<string, unknown>[]>
): Promise<Blob> {
  const XLSX = await import("xlsx");
  const wb = XLSX.utils.book_new();

  for (const [name, data] of Object.entries(sheets)) {
    const ws = XLSX.utils.json_to_sheet(data);
    XLSX.utils.book_append_sheet(wb, ws, name.slice(0, 31)); // Excel sheet name max 31 chars
  }

  const buf = XLSX.write(wb, { type: "array", bookType: "xlsx" }) as ArrayBuffer;
  return new Blob([buf], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
}

// ---------------------------------------------------------------------------
// JSON Export — structured object
// ---------------------------------------------------------------------------

/**
 * Serialize data to a pretty-printed JSON string (2-space indent).
 */
export function exportJSON(data: Record<string, unknown>): string {
  return JSON.stringify(data, null, 2);
}

// ---------------------------------------------------------------------------
// Filter helper
// ---------------------------------------------------------------------------

/**
 * Apply export filters to an array of records.
 * Only filters whose value is defined (not undefined) are applied.
 * Supports: site_id, zone_culture_id, campagne, date_debut, date_fin, modalite.
 */
export function applyExportFilters<T extends Record<string, unknown>>(
  data: T[],
  filters: ExportFilters
): T[] {
  return data.filter((row) => {
    if (filters.site_id !== undefined && row.site_id !== filters.site_id) return false;
    if (filters.zone_culture_id !== undefined && row.zone_culture_id !== filters.zone_culture_id) return false;
    if (filters.campagne !== undefined && row.campagne !== filters.campagne) return false;
    if (filters.modalite !== undefined && row.modalite !== filters.modalite) return false;
    if (filters.date_debut !== undefined) {
      const rowDate = row.date as string | undefined;
      if (rowDate !== undefined && rowDate < filters.date_debut) return false;
    }
    if (filters.date_fin !== undefined) {
      const rowDate = row.date as string | undefined;
      if (rowDate !== undefined && rowDate > filters.date_fin) return false;
    }
    return true;
  });
}
