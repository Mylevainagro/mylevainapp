"use client";

import { useCallback, useEffect, useState } from "react";
import { PDFLaboImporter } from "@/components/import/PDFLaboImporter";
import { supabase } from "@/lib/supabase/client";
import { Toast } from "@/components/Toast";

interface AnalyseItem {
  id: string;
  parcelle_id: string;
  date_prelevement: string;
  phase: string;
  ph: number | null;
  matiere_organique_pct: number | null;
  fichier_pdf_url: string | null;
  parcelle_nom?: string;
}

export default function ImportAnalyseSolPage() {
  const [analyses, setAnalyses] = useState<AnalyseItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error"; visible: boolean }>({ message: "", type: "success", visible: false });
  const hideToast = useCallback(() => setToast(t => ({ ...t, visible: false })), []);

  async function loadAnalyses() {
    const { data } = await supabase
      .from("analyses_sol")
      .select("id, parcelle_id, date_prelevement, phase, ph, matiere_organique_pct, fichier_pdf_url")
      .order("date_prelevement", { ascending: false });

    if (data) {
      // Load parcelle names
      const pIds = [...new Set(data.map(a => a.parcelle_id))];
      const { data: parcData } = await supabase.from("parcelles").select("id, nom").in("id", pIds);
      const parcMap: Record<string, string> = {};
      for (const p of parcData ?? []) parcMap[p.id] = p.nom;

      setAnalyses(data.map(a => ({ ...a, parcelle_nom: parcMap[a.parcelle_id] || "—" })));
    }
    setLoading(false);
  }

  useEffect(() => { loadAnalyses(); }, []);

  async function deleteAnalyse(id: string) {
    if (!confirm("Supprimer cette analyse de sol ?")) return;
    const { error } = await supabase.from("analyses_sol").delete().eq("id", id);
    if (error) {
      setToast({ message: "Erreur : " + error.message, type: "error", visible: true });
    } else {
      setAnalyses(a => a.filter(x => x.id !== id));
      setToast({ message: "Analyse supprimée ✓", type: "success", visible: true });
    }
  }

  return (
    <div>
      <Toast message={toast.message} type={toast.type} visible={toast.visible} onClose={hideToast} />

      <h1 className="text-xl font-bold gradient-text mb-1">🧪 Import PDF — Analyse de sol</h1>
      <p className="text-sm text-gray-500 mb-4">
        Importe un PDF d&apos;analyse de laboratoire (Eurofins, etc.). Les valeurs seront extraites automatiquement.
      </p>
      <PDFLaboImporter />

      {/* Liste des analyses existantes */}
      <h2 className="text-lg font-bold text-gray-800 mt-8 mb-3">📋 Analyses existantes</h2>

      {loading ? (
        <p className="text-sm text-gray-400">Chargement…</p>
      ) : analyses.length === 0 ? (
        <div className="glass rounded-2xl p-6 text-center">
          <p className="text-sm text-gray-400">Aucune analyse importée</p>
        </div>
      ) : (
        <div className="space-y-2">
          {analyses.map(a => (
            <div key={a.id} className="glass rounded-2xl p-4 flex items-center justify-between">
              <div className="flex-1 min-w-0">
                <div className="font-medium text-sm">{a.parcelle_nom} — {a.phase}</div>
                <div className="text-xs text-gray-500">
                  {new Date(a.date_prelevement).toLocaleDateString("fr-FR")}
                  {a.ph != null && ` · pH ${a.ph}`}
                  {a.matiere_organique_pct != null && ` · MO ${a.matiere_organique_pct}%`}
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {a.fichier_pdf_url && (
                  <a href={a.fichier_pdf_url} target="_blank" rel="noopener noreferrer"
                    className="text-xs bg-blue-50 text-blue-700 px-2.5 py-1.5 rounded-lg font-medium hover:bg-blue-100">
                    📄 PDF
                  </a>
                )}
                <button
                  onClick={() => deleteAnalyse(a.id)}
                  className="text-xs bg-red-50 text-red-600 px-2.5 py-1.5 rounded-lg hover:bg-red-100 transition-colors"
                  title="Supprimer cette analyse"
                >
                  🗑
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
