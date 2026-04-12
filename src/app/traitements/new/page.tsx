"use client";

import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import { Section } from "@/components/ui/Section";
import { SelectField } from "@/components/ui/SelectField";
import { NumberField } from "@/components/ui/NumberField";
import { Toast } from "@/components/Toast";
import { MODALITES_REF, VIGNOBLES, METEO_OPTIONS } from "@/lib/constants";
import { supabase } from "@/lib/supabase/client";

const PARCELLES: Record<string, { id: string; nom: string }[]> = {
  Piotte: [{ id: "b1000000-0000-0000-0000-000000000001", nom: "Parcelle principale" }],
  "Pape Clément": [{ id: "b1000000-0000-0000-0000-000000000002", nom: "Parcelle test" }],
};

export default function NewTraitementPage() {
  const router = useRouter();
  const today = new Date().toISOString().split("T")[0];
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error"; visible: boolean }>({ message: "", type: "success", visible: false });
  const hideToast = useCallback(() => setToast((t) => ({ ...t, visible: false })), []);
  const [vignoble, setVignoble] = useState("");
  const [parcelleId, setParcelleId] = useState("");
  const [rang, setRang] = useState<number>(0);
  const [date, setDate] = useState(today);
  const [produit, setProduit] = useState("");
  const [dose, setDose] = useState("");
  const [methode, setMethode] = useState("");
  const [temperature, setTemperature] = useState<number | null>(null);
  const [humidite, setHumidite] = useState<number | null>(null);
  const [conditionsMeteo, setConditionsMeteo] = useState("");
  const [operateur, setOperateur] = useState("");
  const [notes, setNotes] = useState("");

  const modaliteRef = rang > 0 ? MODALITES_REF.find((m) => m.rang === rang) : null;
  const parcelles = vignoble ? PARCELLES[vignoble] ?? [] : [];

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!parcelleId || !rang || !date || !produit) {
      setToast({ message: "Remplis au moins : parcelle, rang, date et produit", type: "error", visible: true });
      return;
    }
    setSaving(true);
    const { error } = await supabase.from("traitements").insert({
      parcelle_id: parcelleId,
      rang,
      modalite: modaliteRef?.modalite ?? "",
      date,
      produit,
      dose: dose || null,
      methode_application: methode || null,
      temperature,
      humidite,
      conditions_meteo: conditionsMeteo || null,
      operateur: operateur || null,
      notes: notes || null,
    });
    setSaving(false);
    if (error) {
      setToast({ message: "Erreur : " + error.message, type: "error", visible: true });
    } else {
      setToast({ message: "Traitement enregistré ✓", type: "success", visible: true });
      setTimeout(() => router.push("/traitements"), 1000);
    }
  }

  return (
    <div>
      <h1 className="text-xl font-bold text-[#8b5e3c] mb-4">💧 Nouveau traitement</h1>
      <Toast message={toast.message} type={toast.type} visible={toast.visible} onClose={hideToast} />
      <form onSubmit={handleSubmit} className="space-y-3">
        <Section title="Identification" icon="📍" defaultOpen={true}>
          <SelectField label="Vignoble" value={vignoble} onChange={(v) => { setVignoble(v); setParcelleId(""); }} options={VIGNOBLES} />
          {parcelles.length > 0 && (
            <SelectField label="Parcelle" value={parcelleId} onChange={setParcelleId} options={parcelles.map(p => p.id)} />
          )}
          <SelectField label="Rang" value={rang ? String(rang) : ""} onChange={(v) => setRang(Number(v))} options={["1","2","3","4","5","6","7"]} />
          {modaliteRef && (
            <div className="bg-[#8b5e3c]/5 rounded-lg px-3 py-2 text-sm">
              <span className="font-medium text-[#8b5e3c]">Modalité :</span> {modaliteRef.modalite}
            </div>
          )}
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-gray-700">Date</label>
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="border border-gray-200 rounded-lg px-3 py-2 text-sm" />
          </div>
        </Section>

        <Section title="Produit & Application" icon="🧪" defaultOpen={true}>
          <SelectField label="Produit" value={produit} onChange={setProduit} options={["Surnageant de levain", "Cuivre", "Surnageant + Cuivre"]} />
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-gray-700">Dose</label>
            <input type="text" value={dose} onChange={(e) => setDose(e.target.value)} placeholder="ex: 1L/4L, 200g/hL..." className="border border-gray-200 rounded-lg px-3 py-2 text-sm" />
          </div>
          <SelectField label="Méthode" value={methode} onChange={setMethode} options={["Pulvérisation", "Arrosage", "Autre"]} />
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-gray-700">Opérateur</label>
            <input type="text" value={operateur} onChange={(e) => setOperateur(e.target.value)} className="border border-gray-200 rounded-lg px-3 py-2 text-sm" />
          </div>
        </Section>

        <Section title="Conditions" icon="🌤️">
          <div className="grid grid-cols-2 gap-3">
            <NumberField label="Température" value={temperature} onChange={setTemperature} unit="°C" />
            <NumberField label="Humidité" value={humidite} onChange={setHumidite} unit="%" />
          </div>
          <SelectField label="Météo" value={conditionsMeteo} onChange={setConditionsMeteo} options={METEO_OPTIONS} />
        </Section>

        <Section title="Notes" icon="💬">
          <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} placeholder="Notes libres..." className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" />
        </Section>

        <button type="submit" disabled={saving} className="w-full bg-[#8b5e3c] text-white rounded-xl py-4 font-semibold text-lg shadow-md hover:bg-[#a0714d] disabled:opacity-50">
          {saving ? "Enregistrement..." : "💾 Sauvegarder le traitement"}
        </button>
      </form>
    </div>
  );
}
