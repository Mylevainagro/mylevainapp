"use client";

import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase/client";
import { useDemo } from "@/components/DemoProvider";
import { DEMO_VIGNOBLES, DEMO_PARCELLES, DEMO_OBSERVATIONS, DEMO_TRAITEMENTS, DEMO_ANALYSES } from "@/lib/demo-data";
import { Toast } from "@/components/Toast";
import { assemblerDonneesRapport, genererRapportPDF } from "@/lib/rapport-pdf";
import type { RapportConfig } from "@/lib/types";

interface SiteItem { id: string; nom: string }

export function RapportPDFGenerator() {
  const { isDemo } = useDemo();
  const [siteId, setSiteId] = useState("");
  const [campagne, setCampagne] = useState("2026");
  const [sites, setSites] = useState<SiteItem[]>([]);
  const [generating, setGenerating] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error"; visible: boolean }>({ message: "", type: "success", visible: false });
  const hideToast = useCallback(() => setToast((t) => ({ ...t, visible: false })), []);

  useEffect(() => {
    if (isDemo) {
      setSites(DEMO_VIGNOBLES.map((v) => ({ id: v.id, nom: v.nom })));
      setSiteId(DEMO_VIGNOBLES[0].id);
      return;
    }
    async function load() {
      const [s1, s2] = await Promise.all([
        supabase.from("sites").select("id, nom").eq("actif", true).order("nom"),
        supabase.from("vignobles").select("id, nom").order("nom"),
      ]);
      const allSites = [...(s1.data ?? []), ...(s2.data ?? [])];
      setSites(allSites);
    }
    load();
  }, [isDemo]);

  async function handleGenerate() {
    if (!siteId || !campagne.trim()) {
      setToast({ message: "Sélectionnez un site et une campagne", type: "error", visible: true });
      return;
    }

    setGenerating(true);
    try {
      const config: RapportConfig = { site_id: siteId, campagne: campagne.trim() };
      const siteName = sites.find((s) => s.id === siteId)?.nom ?? "Site";

      let obsData, traitData, analyseData;

      if (isDemo) {
        obsData = DEMO_OBSERVATIONS.map((o) => ({
          date: o.date, rang: o.rang, modalite: o.modalite,
          vigueur: o.vigueur, mildiou_presence: o.mildiou_presence,
          score_plante: o.score_plante, score_sanitaire: o.score_sanitaire,
        }));
        traitData = DEMO_TRAITEMENTS.map((t) => ({
          date: t.date, produit: t.produit, type_traitement: t.type_traitement,
          dose: t.dose, rang: t.rang, modalite: t.modalite,
        }));
        analyseData = DEMO_ANALYSES.map((a) => ({
          date_prelevement: a.date_prelevement, phase: a.phase,
          ph: a.ph, matiere_organique_pct: a.matiere_organique_pct,
          score_sante_sol: a.score_sante_sol,
        }));
      } else {
        const [obsRes, traitRes, analyseRes] = await Promise.all([
          supabase.from("observations").select("*"),
          supabase.from("traitements").select("*"),
          supabase.from("analyses_sol").select("*"),
        ]);
        obsData = (obsRes.data ?? []).map((o: Record<string, unknown>) => ({
          date: String(o.date ?? ""), rang: Number(o.rang ?? 0), modalite: String(o.modalite ?? ""),
          vigueur: o.vigueur as number | null, mildiou_presence: o.mildiou_presence as number | null,
          score_plante: o.score_plante as number | null, score_sanitaire: o.score_sanitaire as number | null,
        }));
        traitData = (traitRes.data ?? []).map((t: Record<string, unknown>) => ({
          date: String(t.date ?? ""), produit: String(t.produit ?? ""),
          type_traitement: (t.type_traitement as string) ?? null, dose: (t.dose as string) ?? null,
          rang: Number(t.rang ?? 0), modalite: String(t.modalite ?? ""),
        }));
        analyseData = (analyseRes.data ?? []).map((a: Record<string, unknown>) => ({
          date_prelevement: String(a.date_prelevement ?? ""), phase: String(a.phase ?? ""),
          ph: a.ph as number | null, matiere_organique_pct: a.matiere_organique_pct as number | null,
          score_sante_sol: a.score_sante_sol as number | null,
        }));
      }

      const parcelle = isDemo ? DEMO_PARCELLES[0] : null;
      const rapportData = assemblerDonneesRapport(config, {
        observations: obsData,
        traitements: traitData,
        analyses_sol: analyseData,
        site: { nom: siteName },
        zone: { nom: parcelle?.nom ?? "Toutes les parcelles", cepage: parcelle?.cepage },
      });

      const blob = await genererRapportPDF(rapportData);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `rapport_${campagne}_${siteName}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      setToast({ message: "Rapport PDF téléchargé ✓", type: "success", visible: true });
    } catch (err) {
      console.error("Erreur génération rapport:", err);
      setToast({ message: "Erreur lors de la génération", type: "error", visible: true });
    } finally {
      setGenerating(false);
    }
  }

  return (
    <div className="space-y-4">
      <Toast message={toast.message} type={toast.type} visible={toast.visible} onClose={hideToast} />

      <div className="glass rounded-2xl p-4 space-y-3">
        <h2 className="text-sm font-semibold text-gray-700">🔍 Paramètres du rapport</h2>

        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-gray-700">Site *</label>
          <select
            value={siteId}
            onChange={(e) => setSiteId(e.target.value)}
            className="border border-gray-200 rounded-xl px-3 py-2.5 text-sm bg-white/80 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
          >
            <option value="">Sélectionner un site</option>
            {sites.map((s) => (
              <option key={s.id} value={s.id}>{s.nom}</option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-gray-700">Campagne *</label>
          <input
            type="text"
            value={campagne}
            onChange={(e) => setCampagne(e.target.value)}
            placeholder="ex: 2026"
            className="border border-gray-200 rounded-xl px-3 py-2.5 text-sm bg-white/80 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
          />
        </div>
      </div>

      <button
        onClick={handleGenerate}
        disabled={generating || !siteId || !campagne.trim()}
        className="w-full btn-primary"
      >
        {generating ? "Génération en cours…" : "📄 Générer le rapport PDF"}
      </button>

      {!siteId && (
        <p className="text-xs text-gray-400 text-center">
          Sélectionnez un site et une campagne pour générer le rapport.
        </p>
      )}
    </div>
  );
}
