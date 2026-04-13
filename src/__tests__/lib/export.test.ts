import { describe, it, expect } from "vitest";
import {
  exportCSV,
  exportExcel,
  exportJSON,
  applyExportFilters,
} from "@/lib/export";

// ---------------------------------------------------------------------------
// exportCSV
// ---------------------------------------------------------------------------

describe("exportCSV", () => {
  it("returns empty string for empty array", () => {
    expect(exportCSV([], "observations")).toBe("");
  });

  it("produces header + data rows", () => {
    const data = [
      { id: "uuid-1", nom: "Site A", campagne: "2025" },
      { id: "uuid-2", nom: "Site B", campagne: "2025" },
    ];
    const csv = exportCSV(data, "sites");
    const lines = csv.split("\n");
    expect(lines).toHaveLength(3);
    expect(lines[0]).toBe("id,nom,campagne");
    expect(lines[1]).toBe("uuid-1,Site A,2025");
  });

  it("escapes commas in values", () => {
    const data = [{ note: "a, b" }];
    const csv = exportCSV(data, "test");
    expect(csv).toContain('"a, b"');
  });

  it("escapes double-quotes in values", () => {
    const data = [{ note: 'say "hello"' }];
    const csv = exportCSV(data, "test");
    expect(csv).toContain('"say ""hello"""');
  });

  it("escapes newlines in values", () => {
    const data = [{ note: "line1\nline2" }];
    const csv = exportCSV(data, "test");
    expect(csv).toContain('"line1\nline2"');
  });

  it("handles null and undefined values", () => {
    const data = [{ a: null, b: undefined, c: 0 }];
    const csv = exportCSV(data, "test");
    const lines = csv.split("\n");
    expect(lines[1]).toBe(",,0");
  });

  it("preserves UUID values as-is (Exigence 3.6)", () => {
    const uuid = "550e8400-e29b-41d4-a716-446655440000";
    const data = [{ id: uuid, nom: "test" }];
    const csv = exportCSV(data, "test");
    expect(csv).toContain(uuid);
  });
});

// ---------------------------------------------------------------------------
// exportExcel
// ---------------------------------------------------------------------------

describe("exportExcel", () => {
  it("returns a Blob with xlsx MIME type", async () => {
    const blob = await exportExcel({
      Observations: [{ id: "1", date: "2025-01-01" }],
    });
    expect(blob).toBeInstanceOf(Blob);
    expect(blob.type).toBe(
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );
  });

  it("creates multiple sheets", async () => {
    const XLSX = await import("xlsx");
    const blob = await exportExcel({
      Observations: [{ id: "1" }],
      Traitements: [{ id: "2" }],
    });
    const buf = await blob.arrayBuffer();
    const wb = XLSX.read(buf);
    expect(wb.SheetNames).toContain("Observations");
    expect(wb.SheetNames).toContain("Traitements");
  });

  it("round-trips data through Excel", async () => {
    const XLSX = await import("xlsx");
    const original = [
      { id: "uuid-1", nom: "Site A", valeur: 42 },
      { id: "uuid-2", nom: "Site B", valeur: 99 },
    ];
    const blob = await exportExcel({ Data: original });
    const buf = await blob.arrayBuffer();
    const wb = XLSX.read(buf);
    const parsed = XLSX.utils.sheet_to_json(wb.Sheets["Data"]);
    expect(parsed).toHaveLength(2);
    expect((parsed[0] as Record<string, unknown>).id).toBe("uuid-1");
    expect((parsed[1] as Record<string, unknown>).valeur).toBe(99);
  });

  it("truncates sheet names longer than 31 chars", async () => {
    const XLSX = await import("xlsx");
    const longName = "A".repeat(40);
    const blob = await exportExcel({ [longName]: [{ x: 1 }] });
    const buf = await blob.arrayBuffer();
    const wb = XLSX.read(buf);
    expect(wb.SheetNames[0]).toHaveLength(31);
  });
});

// ---------------------------------------------------------------------------
// exportJSON
// ---------------------------------------------------------------------------

describe("exportJSON", () => {
  it("returns pretty-printed JSON with 2-space indent", () => {
    const data = { a: 1 };
    const json = exportJSON(data);
    expect(json).toBe('{\n  "a": 1\n}');
  });

  it("round-trips through JSON.parse", () => {
    const data = {
      sites: [{ id: "uuid-1", nom: "Site A" }],
      observations: [{ id: "uuid-2", date: "2025-01-01" }],
    };
    const json = exportJSON(data);
    expect(JSON.parse(json)).toEqual(data);
  });

  it("preserves UUIDs in JSON output", () => {
    const uuid = "550e8400-e29b-41d4-a716-446655440000";
    const data = { items: [{ id: uuid }] };
    const json = exportJSON(data);
    expect(json).toContain(uuid);
  });
});

// ---------------------------------------------------------------------------
// applyExportFilters
// ---------------------------------------------------------------------------

describe("applyExportFilters", () => {
  const dataset = [
    { id: "1", site_id: "s1", zone_culture_id: "z1", campagne: "2025", date: "2025-03-15", modalite: "Témoin" },
    { id: "2", site_id: "s1", zone_culture_id: "z2", campagne: "2025", date: "2025-06-20", modalite: "Levain 1/2" },
    { id: "3", site_id: "s2", zone_culture_id: "z3", campagne: "2024", date: "2024-09-10", modalite: "Témoin" },
    { id: "4", site_id: "s2", zone_culture_id: "z3", campagne: "2025", date: "2025-01-05", modalite: "Levain 1/4" },
  ];

  it("returns all data when no filters are set", () => {
    const result = applyExportFilters(dataset, {});
    expect(result).toHaveLength(4);
  });

  it("filters by site_id", () => {
    const result = applyExportFilters(dataset, { site_id: "s1" });
    expect(result).toHaveLength(2);
    expect(result.every((r) => r.site_id === "s1")).toBe(true);
  });

  it("filters by zone_culture_id", () => {
    const result = applyExportFilters(dataset, { zone_culture_id: "z3" });
    expect(result).toHaveLength(2);
  });

  it("filters by campagne", () => {
    const result = applyExportFilters(dataset, { campagne: "2024" });
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("3");
  });

  it("filters by modalite", () => {
    const result = applyExportFilters(dataset, { modalite: "Témoin" });
    expect(result).toHaveLength(2);
  });

  it("filters by date_debut", () => {
    const result = applyExportFilters(dataset, { date_debut: "2025-03-01" });
    expect(result).toHaveLength(2);
    expect(result.map((r) => r.id).sort()).toEqual(["1", "2"]);
  });

  it("filters by date_fin", () => {
    const result = applyExportFilters(dataset, { date_fin: "2025-01-31" });
    expect(result).toHaveLength(2);
    expect(result.map((r) => r.id).sort()).toEqual(["3", "4"]);
  });

  it("filters by date range (debut + fin)", () => {
    const result = applyExportFilters(dataset, {
      date_debut: "2025-01-01",
      date_fin: "2025-04-01",
    });
    expect(result).toHaveLength(2);
  });

  it("combines multiple filters", () => {
    const result = applyExportFilters(dataset, {
      site_id: "s2",
      campagne: "2025",
    });
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("4");
  });

  it("returns empty array when no records match", () => {
    const result = applyExportFilters(dataset, { site_id: "nonexistent" });
    expect(result).toHaveLength(0);
  });
});
