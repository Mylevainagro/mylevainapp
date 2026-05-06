"use client";

import { useCallback, useEffect, useState } from "react";
import { PDFLaboImporter } from "@/components/import/PDFLaboImporter";
import { Section } from "@/components/ui/Section";
import { NumberField } from "@/components/ui/NumberField";
import { SelectField } from "@/components/ui/SelectField";
import { supabase } from "@/lib/supabase/client";
import { Toast } from "@/components/Toast";

interface AnalyseItem {
  id: string;
  parcelle_id: string;
  date_prelevement: string;
  phase: string;
  laboratoire: string | null;
  ph: number | null;
  matiere_organique_pct: number | null;
  fichier_pdf_url: string | null;
  parcelle_nom?: string;
}

interface ParcelleOption { id: string; nom: string; site_id: string | null; vignoble_id: string; }
interface SiteOption { id: string; nom: string; }

export default function ImportAnalyseSolPage() {
  const [analyses, setAnalyses] = useState<AnalyseItem[]>([]);
  const [parcelles, setParcelles] = useState<ParcelleOption[]>([]);
  const [sites, setSites] = useState<SiteOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formSiteId, setFormSiteId] = useState("");
  const [toast, setToast] = useState<{ message: string; type: "success" | "error"; visible: boolean }>({ message: "", type: "success", visible: false });
  const hideToast = useCallback(() => setToast(t => ({ ...t, visible: false })), []);

  // Form state
  const [parcelleId, setParcelleId] = useState("");
  const [dateAnalyse, setDateAnalyse] = useState(new Date().toISOString().split("T")[0]);
  const [phase, setPhase] = useState("T0");
  const [laboratoire, setLaboratoire] = useState("");
  // Chimie
  const [phEau, setPhEau] = useState<number | null>(null);
  const [phKcl, setPhKcl] = useState<number | null>(null);
  const [mo, setMo] = useState<number | null>(null);
  const [carbone, setCarbone] = useState<number | null>(null);
  const [ratioCn, setRatioCn] = useState<number | null>(null);
  // Nutriments
  const [azote, setAzote] = useState<number | null>(null);
  const [phosphore, setPhosphore] = useState<number | null>(null);
  const [potassium, setPotassium] = useState<number | null>(null);
  const [magnesium, setMagnesium] = useState<number | null>(null);
  const [calcium, setCalcium] = useState<number | null>(null);
  // Métaux
  const [cuivreTotal, setCuivreTotal] = useState<number | null>(null);
  const [cuivreBiodispo, setCuivreBiodispo] = useState<number | null>(null);
  const [cadmium, setCadmium] = useState<number | null>(null);
  const [zinc, setZinc] = useState<number | null>(null);
  // Biologie
  const [activiteMicro, setActiviteMicro] = useState<number | null>(null);
  const [biomasseMicro, setBiomasseMicro] = useState<number | null>(null);
  // Autres
  const [cec, setCec] = useState<number | null>(null);
  const [textureSol, setTextureSol] = useState("");

  async function loadAnalyses() {
    const [{ data: anaData }, { data: parcData }, { data: siteData }] = await Promise.all([
      supabase.from("analyses_sol").select("id, parcelle_id, date_prelevement, phase, laboratoire, ph, matiere_organique_pct, fichier_pdf_url").order("date_prelevement", { ascending: false }),
      supabase.from("parcelles").select("id, nom, site_id, vignoble_id").order("nom"),
      supabase.from("sites").select("id, nom").order("nom"),
    ]);
    if (parcData) setParcelles(parcData);
    if (siteData) setSites(siteData);
    if (anaData) {
      const parcMap: Record<string, string> = {};
      for (const p of parcData ?? []) parcMap[p.id] = p.nom;
      setAnalyses(anaData.map(a => ({ ...a, parcelle_nom: parcMap[a.parcelle_id] || "—" })));
    }
    setLoading(false);
  }

  useEffect(() => { loadAnalyses(); }, []);

  async function deleteAnalyse(id: string) {
    if (!confirm("Supprimer cette analyse de sol ?")) return;
    const { error } = await supabase.from("analyses_sol").delete().eq("id", id);
    if (error) { setToast({ message: "Erreur : " + error.message, type: "error", visible: true }); }
    else { setAnalyses(a => a.filter(x => x.id !== id)); setToast({ message: "Analyse supprimée ✓", type: "success", visible: true }); }
  }

  async function handleSaveAnalyse(e: React.FormEvent) {
    e.preventDefault();
    if (!parcelleId || !dateAnalyse) {
      setToast({ message: "Parcelle et date obligatoires", type: "error", visible: true });
      return;
    }
    setSaving(true);
    const { error } = await supabase.from("analyses_sol").insert({
      parcelle_id: parcelleId,
      date_prelevement: dateAnalyse,
      phase,
      laboratoire: laboratoire || null,
      ph: phEau,
      ph_kcl: phKcl,
      matiere_organique_pct: mo,
      carbone,
      rapport_c_n: ratioCn,
      azote_total: azote,
      phosphore,
      potassium,
      magnesium,
      calcium,
      cuivre_total: cuivreTotal,
      cuivre_biodisponible: cuivreBiodispo,
      cadmium_total: cadmium,
      zinc,
      activite_microbienne: activiteMicro,
      biomasse_microbienne: biomasseMicro,
      cec,
      texture_sol: textureSol || null,
    });
    setSaving(false);
    if (error) {
      setToast({ message: "Erreur : " + error.message, type: "error", visible: true });
    } else {
      setToast({ message: "Analyse enregistrée ✓", type: "success", visible: true });
      setShowForm(false);
      loadAnalyses();
    }
  }

  return (
    <div>
      <Toast message={toast.message} type={toast.type} visible={toast.visible} onClose={hideToast} />

      <h1 className="text-xl font-bold gradient-text mb-1">🧪 Analyses de sol</h1>
      <p className="text-sm text-gray-500 mb-4">Importez un PDF ou saisissez manuellement les résultats d&apos;analyse.</p>

      {/* Actions */}
      <div className="grid grid-cols-2 gap-3 mb-6">
        <button onClick={() => setShowForm(!showForm)}
          className={`rounded-2xl py-3 text-center text-sm font-semibold transition-all ${showForm ? "bg-gray-200 text-gray-700" : "bg-gradient-to-r from-emerald-500 to-emerald-600 text-white shadow-lg shadow-emerald-200/40"}`}>
          {showForm ? "✕ Fermer" : "📝 Nouvelle analyse"}
        </button>
        <div className="glass rounded-2xl p-3 text-center text-sm font-medium text-gray-600">
          📥 Import PDF ↓
        </div>
      </div>

      {/* Import PDF */}
      {!showForm && <PDFLaboImporter />}

      {/* Formulaire saisie manuelle */}
      {showForm && (
        <form onSubmit={handleSaveAnalyse} className="space-y-3 mb-6">
          <Section title="Identité" icon="🏷️" defaultOpen={true}>
            <SelectField label="Site *" value={formSiteId} onChange={(v) => { setFormSiteId(v); setParcelleId(""); }}
              options={sites.map(s => ({ value: s.id, label: s.nom }))} placeholder="Sélectionner un site" />
            {formSiteId && (
              <SelectField label="Parcelle *" value={parcelleId} onChange={setParcelleId}
                options={parcelles.filter(p => p.site_id === formSiteId || p.vignoble_id === formSiteId).map(p => ({ value: p.id, label: p.nom }))} placeholder="Sélectionner une parcelle" />
            )}
            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1">
                <label className="text-sm font-medium text-gray-700">Date analyse *</label>
                <input type="date" value={dateAnalyse} onChange={e => setDateAnalyse(e.target.value)} className="border border-gray-200 rounded-xl px-3 py-2.5 text-sm" />
              </div>
              <SelectField label="Phase" value={phase} onChange={setPhase} options={["T0", "T6", "T12", "Tfinal"]} />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium text-gray-700">Laboratoire</label>
              <input type="text" value={laboratoire} onChange={e => setLaboratoire(e.target.value)} placeholder="ex: Eurofins, Auréa" className="border border-gray-200 rounded-xl px-3 py-2.5 text-sm" />
            </div>
          </Section>

          <Section title="Chimie" icon="⚗️">
            <div className="grid grid-cols-2 gap-3">
              <NumberField label="pH eau" value={phEau} onChange={setPhEau} step={0.1} />
              <NumberField label="pH KCl" value={phKcl} onChange={setPhKcl} step={0.1} />
            </div>
            <div className="grid grid-cols-3 gap-3">
              <NumberField label="MO (%)" value={mo} onChange={setMo} step={0.1} />
              <NumberField label="Carbone" value={carbone} onChange={setCarbone} step={0.1} />
              <NumberField label="C/N" value={ratioCn} onChange={setRatioCn} step={0.1} />
            </div>
          </Section>

          <Section title="Nutriments" icon="🌱">
            <div className="grid grid-cols-2 gap-3">
              <NumberField label="Azote total" value={azote} onChange={setAzote} step={0.1} />
              <NumberField label="Phosphore" value={phosphore} onChange={setPhosphore} step={1} />
            </div>
            <div className="grid grid-cols-3 gap-3">
              <NumberField label="Potassium" value={potassium} onChange={setPotassium} step={1} />
              <NumberField label="Magnésium" value={magnesium} onChange={setMagnesium} step={1} />
              <NumberField label="Calcium" value={calcium} onChange={setCalcium} step={1} />
            </div>
          </Section>

          <Section title="Métaux" icon="⚠️">
            <div className="grid grid-cols-2 gap-3">
              <NumberField label="Cu total (mg/kg)" value={cuivreTotal} onChange={setCuivreTotal} step={0.1} />
              <NumberField label="Cu biodispo." value={cuivreBiodispo} onChange={setCuivreBiodispo} step={0.1} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <NumberField label="Cadmium" value={cadmium} onChange={setCadmium} step={0.01} />
              <NumberField label="Zinc" value={zinc} onChange={setZinc} step={0.1} />
            </div>
          </Section>

          <Section title="Biologie" icon="🦠">
            <div className="grid grid-cols-2 gap-3">
              <NumberField label="Activité microbienne" value={activiteMicro} onChange={setActiviteMicro} step={1} />
              <NumberField label="Biomasse microbienne" value={biomasseMicro} onChange={setBiomasseMicro} step={1} />
            </div>
          </Section>

          <Section title="Autres" icon="📊">
            <NumberField label="CEC (meq/100g)" value={cec} onChange={setCec} step={0.1} />
            <SelectField label="Texture sol" value={textureSol} onChange={setTextureSol}
              options={["Argileuse", "Argilo-limoneuse", "Limoneuse", "Limono-sableuse", "Sableuse", "Sablo-limoneuse"]} placeholder="Sélectionner" />
          </Section>

          <button type="submit" disabled={saving} className="w-full btn-primary">
            {saving ? "Enregistrement…" : "💾 Enregistrer l'analyse"}
          </button>
        </form>
      )}

      {/* Liste des analyses existantes */}
      <h2 className="text-lg font-bold text-gray-800 mt-6 mb-3">📋 Analyses existantes</h2>

      {loading ? (
        <p className="text-sm text-gray-400">Chargement…</p>
      ) : analyses.length === 0 ? (
        <div className="glass rounded-2xl p-6 text-center">
          <p className="text-sm text-gray-400">Aucune analyse importée ou saisie</p>
        </div>
      ) : (
        <div className="space-y-2">
          {analyses.map(a => (
            <div key={a.id} className="glass rounded-2xl p-4 flex items-center justify-between">
              <div className="flex-1 min-w-0">
                <div className="font-medium text-sm">{a.parcelle_nom} — {a.phase}</div>
                <div className="text-xs text-gray-500">
                  {new Date(a.date_prelevement).toLocaleDateString("fr-FR")}
                  {a.laboratoire && ` · ${a.laboratoire}`}
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
                <button onClick={() => deleteAnalyse(a.id)}
                  className="text-xs bg-red-50 text-red-600 px-2.5 py-1.5 rounded-lg hover:bg-red-100" title="Supprimer">
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
