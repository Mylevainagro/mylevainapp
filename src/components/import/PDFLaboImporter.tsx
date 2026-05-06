"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase/client";
import { Toast } from "@/components/Toast";
import { SelectField } from "@/components/ui/SelectField";
import type { ParsedLaboResult } from "@/lib/types";

interface VignobleItem { id: string; nom: string; }
interface ParcelleItem { id: string; vignoble_id: string; site_id: string | null; nom: string; }

export function PDFLaboImporter() {
  const router = useRouter();

  const [file, setFile] = useState<File | null>(null);
  const [result, setResult] = useState<ParsedLaboResult | null>(null);

  const [sitesList, setSitesList] = useState<VignobleItem[]>([]);
  const [parcellesList, setParcellesList] = useState<ParcelleItem[]>([]);
  const [siteId, setSiteId] = useState("");
  const [parcelleId, setParcelleId] = useState("");
  const [datePrelevement, setDatePrelevement] = useState(new Date().toISOString().split("T")[0]);
  const [phase, setPhase] = useState<"T0" | "T6" | "T12" | "Tfinal">("T0");

  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [toast, setToast] = useState<{ message: string; type: "success" | "error"; visible: boolean }>({ message: "", type: "success", visible: false });
  const hideToast = useCallback(() => setToast((t) => ({ ...t, visible: false })), []);

  useEffect(() => {
    async function load() {
      const [s, p] = await Promise.all([
        supabase.from("sites").select("id, nom").order("nom"),
        supabase.from("parcelles").select("id, vignoble_id, site_id, nom").order("nom"),
      ]);
      if (s.data) setSitesList(s.data);
      if (p.data) setParcellesList(p.data);
    }
    load();
  }, []);

  // Parcelles filtrées par site sélectionné
  const filteredParcelles = siteId
    ? parcellesList.filter(p => p.site_id === siteId || p.vignoble_id === siteId)
    : parcellesList;

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const selected = e.target.files?.[0];
    if (!selected) return;
    if (selected.type !== "application/pdf") {
      setToast({ message: "Seuls les fichiers PDF sont acceptés", type: "error", visible: true });
      return;
    }
    setFile(selected);
    setResult({ valeurs: [], texte_brut: "", fichier_nom: selected.name });
    setMessage(`PDF prêt : ${selected.name}`);
    setToast({ message: `PDF "${selected.name}" prêt — sélectionnez le site et la parcelle puis validez`, type: "success", visible: true });
  }

  async function handleSubmit() {
    if (!file) { setToast({ message: "Sélectionnez d'abord un PDF", type: "error", visible: true }); return; }
    if (!parcelleId) { setToast({ message: "Sélectionnez une parcelle", type: "error", visible: true }); return; }

    setSaving(true);
    try {
      // Upload PDF to Supabase Storage
      const storagePath = `analyses-sol/${Date.now()}_${file.name}`;
      const { error: uploadError } = await supabase.storage.from("documents").upload(storagePath, file, { contentType: "application/pdf", upsert: false });
      if (uploadError) throw new Error("Erreur upload PDF : " + uploadError.message);

      const { data: urlData } = supabase.storage.from("documents").getPublicUrl(storagePath);

      // Insert analyse record
      const { error: insertError } = await supabase.from("analyses_sol").insert({
        parcelle_id: parcelleId,
        date_prelevement: datePrelevement,
        phase,
        fichier_pdf_url: urlData.publicUrl,
      });

      if (insertError) throw new Error("Erreur insertion : " + insertError.message);

      setToast({ message: "Analyse enregistrée avec PDF ✓", type: "success", visible: true });
      setMessage("Analyse enregistrée avec succès");
      setTimeout(() => router.push("/import/analyse-sol"), 1500);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Erreur inattendue";
      setToast({ message: msg, type: "error", visible: true });
      setMessage(msg);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-4">
      <Toast message={toast.message} type={toast.type} visible={toast.visible} onClose={hideToast} />

      <div className="bg-white rounded-xl border border-gray-200 p-4 space-y-3">
        <h2 className="text-sm font-semibold text-gray-700">📍 Identification</h2>

        <SelectField label="Site" value={siteId} onChange={(v) => { setSiteId(v); setParcelleId(""); }}
          options={sitesList.map(s => ({ value: s.id, label: s.nom }))} placeholder="Sélectionner un site" />

        {filteredParcelles.length > 0 && (
          <SelectField label="Parcelle" value={parcelleId} onChange={setParcelleId}
            options={filteredParcelles.map(p => ({ value: p.id, label: p.nom }))} placeholder="Sélectionner une parcelle" />
        )}

        <div className="grid grid-cols-2 gap-3">
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-gray-700">Date prélèvement</label>
            <input type="date" value={datePrelevement} onChange={(e) => setDatePrelevement(e.target.value)} className="border border-gray-200 rounded-lg px-3 py-2 text-sm" />
          </div>
          <SelectField label="Phase" value={phase} onChange={(v) => setPhase(v as typeof phase)} options={["T0", "T6", "T12", "Tfinal"]} />
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-4 space-y-3">
        <h2 className="text-sm font-semibold text-gray-700">📄 Fichier PDF labo</h2>
        <label className="flex flex-col items-center justify-center border-2 border-dashed border-gray-300 rounded-xl p-6 cursor-pointer hover:border-emerald-400 transition-colors">
          <span className="text-3xl mb-2">📎</span>
          <span className="text-sm text-gray-500">{file ? file.name : "Cliquer pour sélectionner un PDF"}</span>
          <input type="file" accept="application/pdf" onChange={handleFileChange} className="hidden" />
        </label>
      </div>

      {result && (
        <div className="bg-emerald-50 rounded-xl border border-emerald-200 p-4">
          <p className="text-sm text-emerald-700 font-medium">✓ PDF prêt : {result.fichier_nom}</p>
          <p className="text-xs text-emerald-600 mt-1">Le fichier sera stocké et accessible depuis la fiche parcelle.</p>
        </div>
      )}

      {message && <div className="bg-gray-50 border border-gray-200 rounded-xl p-3 text-sm text-gray-700">{message}</div>}

      <button type="button" onClick={handleSubmit} disabled={saving || !file}
        className="w-full btn-primary !py-4">
        {saving ? "Enregistrement..." : "✅ Valider et enregistrer l'analyse"}
      </button>
    </div>
  );
}
