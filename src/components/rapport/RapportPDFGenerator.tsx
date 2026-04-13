"use client";

import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase/client";
import { Toast } from "@/components/Toast";
import { assemblerDonneesRapport, genererRapportPDF } from "@/lib/rapport-pdf";
import { evaluerCompletude, type CompletudeInput } from "@/lib/completude";
import { CompletudeStatus } from "@/components/export/CompletudeStatus";
import type { RapportConfig, CompletudeResult } from "@/lib/types";

// ============================================================
// RapportPDFGenerator — Génération de rapport PDF professionnel
// Exigence : 4.6
// ============================================================

interface SiteItem {
  id: string;
  nom: string;
}

interface ZoneItem {
  id: string;
  site_id: string;
  nom: string;
  cepage?: string | null;
}

export function RapportPDFGenerator() {
  // Filters
  const [siteId, setSiteId] = useState("");
  const [zoneId, setZoneId] = useState("");
  const [campagne, setCampagne] = useState("");

  // Reference data
  const [sites, setSites] = useState<SiteItem[]>([]);
  const [zones, setZones] = useState<ZoneItem[]>([]);

  // Completude
  const [completudeResult, setCompletudeResult] = useState<CompletudeResult | null>(null);

  // UI state
  const [generating, setGenerating] = useState(false);
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
        supabase
          .from("zones_culture")
          .select("id, site_id, nom")
          .eq("actif", true)
          .order("nom"),
      ]);
      if (s.data) setSites(s.data);
      if (z.data) setZones(z.data);
    }
    load();
  }, []);

  const filteredZones = siteId
    ? zones.filter((z) => z.site_id === siteId)
    : zones;

  function buildConfig(): RapportConfig | null {
    if (!siteId || !campagne.trim()) return null;
    return {
      site_id: siteId,
      zone_culture_id: zoneId || undefined,
      campagne: campagne.trim(),
    };
  }

  async function handleGenerate() {
    const config = buildConfig();
    if (!config) {
      setToast({ message: "Veuillez sélectionner un site et une campagne", type: "error", visible: true });
      return;
    }

    setGenerating(true);
    try {
      // Fetch site info
      const { data: siteData } = await supabase
        .from("sites")
        .select("nom")
        .eq("id", config.site_id)
        .single();

      // Fetch zone info (if selected)
      let zoneData: { nom: string; cepage?: string | null } = { nom: "Toutes les zones" };
      if (config.zone_culture_id) {
        const { data: z } = await supabase
          .from("zones_culture")
          .select("nom")
          .eq("id", config.zone_culture_id)
          .single();
        if (z) zoneData = z;
      }

      // Fetch observations, traitements, analyses_sol
      let obsQuery = supabase.from("observations").select("*");
      let traitQuery = supabase.from("traitements").select("*");
      let analyseQuery = supabase.from("analyses_sol").select("*");

      // Filter by zone if selected, otherwise by all zones of the site
      if (config.zone_culture_id) {
        const zoneIds = [config.zone_culture_id];
        // Get parcelle ids linked to this zone
        const { data: parcelles } = await supabase
          .from("parcelles")
          .select("id")
          .eq("zone_culture_id", config.zone_culture_id);
        const parcelleIds = parcelles?.map((p) => p.id) ?? [];
        if (parcelleIds.length > 0) {
          obsQuery = obsQuery.in("parcelle_id", parcelleIds);
          traitQuery = traitQuery.in("parcelle_id", parcelleIds);
          analyseQuery = analyseQuery.in("parcelle_id", parcelleIds);
        }
      }

      const [obsRes, traitRes, analyseRes] = await Promise.all([
        obsQuery,
        traitQuery,
        analyseQuery,
      ]);

      const observations = (obsRes.data ?? []) as Record<string, unknown>[];
      const traitements = (traitRes.data ?? []) as Record<string, unknown>[];
      const analyses_sol = (analyseRes.data ?? []) as Record<string, unknown>[];

      // Assemble data
      const rapportData = assemblerDonneesRapport(config, {
        observations: observations.map((o) => ({
          date: String(o.date ?? ""),
          rang: Number(o.rang ?? 0),
          modalite: String(o.modalite ?? ""),
          vigueur: o.vigueur as number | null,
          mildiou_presence: o.mildiou_presence as number | null,
          score_plante: o.score_plante as number | null,
          score_sanitaire: o.score_sanitaire as number | null,
        })),
        traitements: traitements.map((t) => ({
          date: String(t.date ?? ""),
          produit: String(t.produit ?? ""),
          type_traitement: (t.type_traitement as string) ?? null,
          dose: (t.dose as string) ?? null,
          rang: Number(t.rang ?? 0),
          modalite: String(t.modalite ?? ""),
        })),
        analyses_sol: analyses_sol.map((a) => ({
          date_prelevement: String(a.date_prelevement ?? ""),
          phase: String(a.phase ?? ""),
          ph: a.ph as number | null,
          matiere_organique_pct: a.matiere_organique_pct as number | null,
          score_sante_sol: a.score_sante_sol as number | null,
        })),
        site: { nom: siteData?.nom ?? "Site inconnu" },
        zone: { nom: zoneData.nom, cepage: zoneData.cepage },
      });

      // Generate PDF
      const blob = await genererRapportPDF(rapportData);

      // Trigger download
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `rapport_${config.campagne}_${siteData?.nom ?? "site"}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      setToast({ message: "Rapport PDF téléchargé ✓", type: "success", visible: true });
    } catch (err) {
      console.error("Erreur génération rapport:", err);
      setToast({ message: "Erreur lors de la génération du rapport", type: "error", visible: true });
    } finally {
      setGenerating(false);
    }
  }

  async function handleCheckAndGenerate() {
    const config = buildConfig();
    if (!config) {
      setToast({ message: "Veuillez sélectionner un site et une campagne", type: "error", visible: true });
      return;
    }

    // Quick completude check
    let obsQuery = supabase.from("observations").select("vigueur, mildiou_presence, humidite_sol, modalite, score_plante, score_sanitaire");
    if (zoneId) {
      const { data: parcelles } = await supabase
        .from("parcelles")
        .select("id")
        .eq("zone_culture_id", zoneId);
      const parcelleIds = parcelles?.map((p) => p.id) ?? [];
      if (parcelleIds.length > 0) {
        obsQuery = obsQuery.in("parcelle_id", parcelleIds);
      }
    }

    const [obsRes, traitRes, analyseRes] = await Promise.all([
      obsQuery,
      supabase.from("traitements").select("id").limit(1),
      supabase.from("analyses_sol").select("id").limit(1),
    ]);

    const obs = (obsRes.data ?? []) as Record<string, unknown>[];
    const indicateursRemplis = obs.length > 0
      ? new Set(
          ["vigueur", "mildiou_presence", "humidite_sol"].filter((k) =>
            obs.some((o) => o[k] != null)
          )
        ).size
      : 0;

    const input: CompletudeInput = {
      has_site: true,
      has_zone: !!zoneId || obs.length > 0,
      has_observations: obs.length > 0,
      has_modalite: obs.some((o) => o.modalite != null),
      indicateurs_remplis: indicateursRemplis,
      has_traitements: (traitRes.data?.length ?? 0) > 0,
      has_scores: obs.some((o) => o.score_plante != null || o.score_sanitaire != null),
      has_analyses_sol: (analyseRes.data?.length ?? 0) > 0,
    };

    const result = evaluerCompletude(input);
    if (result.status === "complete") {
      handleGenerate();
    } else {
      setCompletudeResult(result);
    }
  }

  const canGenerate = !!siteId && !!campagne.trim();

  return (
    <div className="space-y-4">
      <Toast message={toast.message} type={toast.type} visible={toast.visible} onClose={hideToast} />

      {/* Selection filters */}
      <div className="bg-white rounded-xl border border-gray-200 p-4 space-y-3">
        <h2 className="text-sm font-semibold text-gray-700">🔍 Paramètres du rapport</h2>

        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-gray-700">
            Site <span className="text-red-500">*</span>
          </label>
          <select
            value={siteId}
            onChange={(e) => { setSiteId(e.target.value); setZoneId(""); }}
            className="border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#2d5016]/30"
          >
            <option value="">Sélectionner un site</option>
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
          <label className="text-sm font-medium text-gray-700">
            Campagne <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={campagne}
            onChange={(e) => setCampagne(e.target.value)}
            placeholder="ex: 2026"
            className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#2d5016]/30"
          />
        </div>
      </div>

      {/* Completude status */}
      {completudeResult && (
        <CompletudeStatus
          result={completudeResult}
          onContinue={() => { setCompletudeResult(null); handleGenerate(); }}
          onGoBack={() => setCompletudeResult(null)}
        />
      )}

      {/* Generate button */}
      <button
        onClick={handleCheckAndGenerate}
        disabled={generating || !canGenerate}
        className="w-full bg-[#2d5016] text-white rounded-xl py-4 font-semibold text-lg shadow-md hover:bg-[#3a6b1e] disabled:opacity-50 transition-colors"
      >
        {generating ? (
          <span className="flex items-center justify-center gap-2">
            <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            Génération en cours…
          </span>
        ) : (
          "📄 Générer le rapport PDF"
        )}
      </button>

      {!canGenerate && (
        <p className="text-xs text-gray-400 text-center">
          Sélectionnez un site et une campagne pour générer le rapport.
        </p>
      )}
    </div>
  );
}
