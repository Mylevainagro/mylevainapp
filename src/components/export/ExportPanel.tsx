"use client";

import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase/client";
import { Toast } from "@/components/Toast";
import { SelectField } from "@/components/ui/SelectField";
import { exportCSV, exportExcel, exportJSON, applyExportFilters } from "@/lib/export";
import { evaluerCompletude, type CompletudeInput } from "@/lib/completude";
import { CompletudeStatus } from "@/components/export/CompletudeStatus";
import type { ExportFilters, ExportFormat, CompletudeResult } from "@/lib/types";

// ============================================================
// ExportPanel — Panneau d'export CSV / Excel / JSON
// Exigences : 3.1, 3.4
// ============================================================

interface SiteItem {
  id: string;
  nom: string;
}

interface ZoneItem {
  id: string;
  site_id: string;
  nom: string;
}

const FORMAT_LABELS: Record<ExportFormat, string> = {
  csv: "CSV",
  excel: "Excel (.xlsx)",
  json: "JSON",
};

const MODALITE_OPTIONS: readonly string[] = [
  "Témoin",
  "Levain 1/4",
  "Levain 1/2",
  "Levain 1/4 + Cuivre",
  "Levain 1/2 + Cuivre",
];

/** Trigger a browser download from a Blob or string */
function downloadFile(content: Blob | string, filename: string, mime: string) {
  const blob =
    typeof content === "string" ? new Blob([content], { type: mime }) : content;
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function ExportPanel() {
  // Format
  const [format, setFormat] = useState<ExportFormat>("csv");

  // Filters
  const [siteId, setSiteId] = useState("");
  const [zoneId, setZoneId] = useState("");
  const [campagne, setCampagne] = useState("");
  const [dateDebut, setDateDebut] = useState("");
  const [dateFin, setDateFin] = useState("");
  const [modalite, setModalite] = useState("");

  // Reference data
  const [sites, setSites] = useState<SiteItem[]>([]);
  const [zones, setZones] = useState<ZoneItem[]>([]);

  // Completude state
  const [completudeResult, setCompletudeResult] = useState<CompletudeResult | null>(null);

  // UI state
  const [exporting, setExporting] = useState(false);
  const [toast, setToast] = useState<{
    message: string;
    type: "success" | "error";
    visible: boolean;
  }>({ message: "", type: "success", visible: false });
  const hideToast = useCallback(
    () => setToast((t) => ({ ...t, visible: false })),
    []
  );

  // Load sites & zones
  useEffect(() => {
    async function load() {
      const [s, z] = await Promise.all([
        supabase.from("sites").select("id, nom").eq("actif", true).order("nom"),
        supabase.from("zones_culture").select("id, site_id, nom").eq("actif", true).order("nom"),
      ]);
      if (s.data) setSites(s.data);
      if (z.data) setZones(z.data);
    }
    load();
  }, []);

  const filteredZones = siteId
    ? zones.filter((z) => z.site_id === siteId)
    : zones;

  function buildFilters(): ExportFilters {
    const f: ExportFilters = {};
    if (siteId) f.site_id = siteId;
    if (zoneId) f.zone_culture_id = zoneId;
    if (campagne.trim()) f.campagne = campagne.trim();
    if (dateDebut) f.date_debut = dateDebut;
    if (dateFin) f.date_fin = dateFin;
    if (modalite) f.modalite = modalite;
    return f;
  }

  async function fetchData(table: string): Promise<Record<string, unknown>[]> {
    const { data, error } = await supabase.from(table).select("*");
    if (error || !data) return [];
    return data as Record<string, unknown>[];
  }

  async function checkCompletude() {
    const filters = buildFilters();
    const [observations, traitements, analysesSol] = await Promise.all([
      fetchData("observations"),
      fetchData("traitements"),
      fetchData("analyses_sol"),
    ]);
    const filteredObs = applyExportFilters(observations, filters);
    const filteredTrait = applyExportFilters(traitements, filters);
    const filteredAnalyses = applyExportFilters(analysesSol, filters);

    // Check for key indicators (vigueur, mildiou_frequence, humidite_sol)
    const indicateursRemplis = filteredObs.length > 0
      ? new Set(
          ["vigueur", "mildiou_frequence", "humidite_sol"].filter((k) =>
            filteredObs.some((o) => o[k] != null)
          )
        ).size
      : 0;

    const input: CompletudeInput = {
      has_site: !!filters.site_id || filteredObs.length > 0,
      has_zone: !!filters.zone_culture_id || filteredObs.length > 0,
      has_observations: filteredObs.length > 0,
      has_modalite: filteredObs.some((o) => o.modalite != null),
      indicateurs_remplis: indicateursRemplis,
      has_traitements: filteredTrait.length > 0,
      has_scores: filteredObs.some((o) => o.score_plante != null || o.score_sanitaire != null),
      has_analyses_sol: filteredAnalyses.length > 0,
    };

    setCompletudeResult(evaluerCompletude(input));
  }

  async function handleExport() {
    setExporting(true);
    try {
      const filters = buildFilters();
      const timestamp = new Date().toISOString().slice(0, 10);

      // Fetch all entities
      const [observations, traitements, analysesSol] = await Promise.all([
        fetchData("observations"),
        fetchData("traitements"),
        fetchData("analyses_sol"),
      ]);

      // Apply filters
      const filteredObs = applyExportFilters(observations, filters);
      const filteredTrait = applyExportFilters(traitements, filters);
      const filteredAnalyses = applyExportFilters(analysesSol, filters);

      if (format === "csv") {
        // Export CSV — one file per entity (download the main one: observations)
        const csv = exportCSV(filteredObs, "observations");
        if (!csv) {
          setToast({ message: "Aucune donnée à exporter", type: "error", visible: true });
          return;
        }
        downloadFile(csv, `observations_${timestamp}.csv`, "text/csv;charset=utf-8");

        // Also export traitements and analyses if they have data
        const csvTrait = exportCSV(filteredTrait, "traitements");
        if (csvTrait) downloadFile(csvTrait, `traitements_${timestamp}.csv`, "text/csv;charset=utf-8");

        const csvAnalyses = exportCSV(filteredAnalyses, "analyses_sol");
        if (csvAnalyses) downloadFile(csvAnalyses, `analyses_sol_${timestamp}.csv`, "text/csv;charset=utf-8");

        setToast({ message: "Export CSV téléchargé ✓", type: "success", visible: true });
      } else if (format === "excel") {
        const sheets: Record<string, Record<string, unknown>[]> = {
          Observations: filteredObs,
          Traitements: filteredTrait,
          Analyses_Sol: filteredAnalyses,
        };
        const blob = await exportExcel(sheets);
        downloadFile(blob, `export_${timestamp}.xlsx`, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
        setToast({ message: "Export Excel téléchargé ✓", type: "success", visible: true });
      } else {
        // JSON
        const jsonData = {
          observations: filteredObs,
          traitements: filteredTrait,
          analyses_sol: filteredAnalyses,
        };
        const jsonStr = exportJSON(jsonData);
        downloadFile(jsonStr, `export_${timestamp}.json`, "application/json");
        setToast({ message: "Export JSON téléchargé ✓", type: "success", visible: true });
      }
    } catch (err) {
      setToast({ message: "Erreur lors de l'export", type: "error", visible: true });
    } finally {
      setExporting(false);
    }
  }

  return (
    <div className="space-y-4">
      <Toast message={toast.message} type={toast.type} visible={toast.visible} onClose={hideToast} />

      {/* Format selection */}
      <div className="bg-white rounded-xl border border-gray-200 p-4 space-y-3">
        <h2 className="text-sm font-semibold text-gray-700">📦 Format d&apos;export</h2>
        <div className="flex gap-3">
          {(Object.keys(FORMAT_LABELS) as ExportFormat[]).map((f) => (
            <label
              key={f}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg border cursor-pointer transition-colors ${
                format === f
                  ? "border-[#2d5016] bg-[#2d5016]/5 text-[#2d5016] font-medium"
                  : "border-gray-200 text-gray-600 hover:border-gray-300"
              }`}
            >
              <input
                type="radio"
                name="format"
                value={f}
                checked={format === f}
                onChange={() => setFormat(f)}
                className="accent-[#2d5016]"
              />
              {FORMAT_LABELS[f]}
            </label>
          ))}
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl border border-gray-200 p-4 space-y-3">
        <h2 className="text-sm font-semibold text-gray-700">🔍 Filtres</h2>

        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-gray-700">Site</label>
          <select
            value={siteId}
            onChange={(e) => { setSiteId(e.target.value); setZoneId(""); }}
            className="border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#2d5016]/30"
          >
            <option value="">Tous les sites</option>
            {sites.map((s) => (
              <option key={s.id} value={s.id}>{s.nom}</option>
            ))}
          </select>
        </div>

        {filteredZones.length > 0 && (
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-gray-700">Zone de culture</label>
            <select
              value={zoneId}
              onChange={(e) => setZoneId(e.target.value)}
              className="border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#2d5016]/30"
            >
              <option value="">Toutes les zones</option>
              {filteredZones.map((z) => (
                <option key={z.id} value={z.id}>{z.nom}</option>
              ))}
            </select>
          </div>
        )}

        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-gray-700">Campagne</label>
          <input
            type="text"
            value={campagne}
            onChange={(e) => setCampagne(e.target.value)}
            placeholder="ex: 2026"
            className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#2d5016]/30"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-gray-700">Date début</label>
            <input
              type="date"
              value={dateDebut}
              onChange={(e) => setDateDebut(e.target.value)}
              className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#2d5016]/30"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-gray-700">Date fin</label>
            <input
              type="date"
              value={dateFin}
              onChange={(e) => setDateFin(e.target.value)}
              className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#2d5016]/30"
            />
          </div>
        </div>

        <SelectField
          label="Modalité"
          value={modalite}
          onChange={setModalite}
          options={MODALITE_OPTIONS}
          placeholder="Toutes les modalités"
        />
      </div>

      {/* Completude status */}
      {completudeResult && (
        <CompletudeStatus
          result={completudeResult}
          onContinue={() => { setCompletudeResult(null); handleExport(); }}
          onGoBack={() => setCompletudeResult(null)}
        />
      )}

      {/* Export button */}
      <button
        onClick={checkCompletude}
        disabled={exporting}
        className="w-full bg-[#2d5016] text-white rounded-xl py-4 font-semibold text-lg shadow-md hover:bg-[#3a6b1e] disabled:opacity-50 transition-colors"
      >
        {exporting ? "Export en cours..." : `📥 Exporter en ${FORMAT_LABELS[format]}`}
      </button>
    </div>
  );
}
