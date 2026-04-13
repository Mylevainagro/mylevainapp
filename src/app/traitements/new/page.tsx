"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Section } from "@/components/ui/Section";
import { SelectField } from "@/components/ui/SelectField";
import { NumberField } from "@/components/ui/NumberField";
import { Toast } from "@/components/Toast";
import { METEO_OPTIONS } from "@/lib/constants";
import { supabase } from "@/lib/supabase/client";

interface VignobleItem { id: string; nom: string; }
interface ParcelleItem { id: string; vignoble_id: string; nom: string; }
interface ModaliteItem { rang: number; modalite: string; }

export default function NewTraitementPage() {
  const router = useRouter();
  const today = new Date().toISOString().split("T")[0];

  const [vignoblesList, setVignoblesList] = useState<VignobleItem[]>([]);
  const [parcellesList, setParcellesList] = useState<ParcelleItem[]>([]);
  const [modalitesList, setModalitesList] = useState<ModaliteItem[]>([]);

  useEffect(() => {
    async function load() {
      const [v, p, m] = await Promise.all([
        supabase.from("vignobles").select("id, nom").order("nom"),
        supabase.from("parcelles").select("id, vignoble_id, nom").order("nom"),
        supabase.from("referentiel_modalites").select("rang, modalite").eq("actif", true).order("rang"),
      ]);
      if (v.data) setVignoblesList(v.data);
      if (p.data) setParcellesList(p.data);
      if (m.data) setModalitesList(m.data);
    }
    load();
  }, []);

  const currentYear = new Date().getFullYear().toString();

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

  // Phase 2 — Champs enrichis (Exigence 7.1)
  const [typeTraitement, setTypeTraitement] = useState("");
  const [matiereActive, setMatiereActive] = useState("");
  const [concentration, setConcentration] = useState<number | null>(null);
  const [unite, setUnite] = useState("");
  const [objectif, setObjectif] = useState("");
  const [campagne, setCampagne] = useState(currentYear);

  const modaliteRef = rang > 0 ? modalitesList.find((m) => m.rang === rang) : null;
  const parcelles = vignoble ? parcellesList.filter(p => {
    const v = vignoblesList.find(vv => vv.nom === vignoble);
    return v && p.vignoble_id === v.id;
  }) : [];

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
      type_traitement: typeTraitement || null,
      matiere_active: matiereActive || null,
      concentration,
      unite: unite || null,
      objectif: objectif || null,
      campagne: campagne || null,
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
          <SelectField label="Vignoble" value={vignoble} onChange={(v) => { setVignoble(v); setParcelleId(""); }} options={vignoblesList.map(v => v.nom)} />
          {parcelles.length > 0 && (
            <SelectField label="Parcelle" value={parcelleId} onChange={setParcelleId} options={parcelles.map(p => p.id)} />
          )}
          <SelectField label="Rang" value={rang ? String(rang) : ""} onChange={(v) => setRang(Number(v))} options={modalitesList.map(m => String(m.rang))} />
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

        <Section title="Détails traitement" icon="🔬" defaultOpen={true}>
          <SelectField label="Type de traitement" value={typeTraitement} onChange={setTypeTraitement} options={["cuivre", "soufre", "levain", "biocontrole", "phytosanitaire", "fertilisation", "autre"]} />
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-gray-700">Matière active</label>
            <input type="text" value={matiereActive} onChange={(e) => setMatiereActive(e.target.value)} placeholder="ex: hydroxyde de cuivre..." className="border border-gray-200 rounded-lg px-3 py-2 text-sm" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <NumberField label="Concentration" value={concentration} onChange={setConcentration} />
            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium text-gray-700">Unité</label>
              <input type="text" value={unite} onChange={(e) => setUnite(e.target.value)} placeholder="g/L, %, ..." className="border border-gray-200 rounded-lg px-3 py-2 text-sm" />
            </div>
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-gray-700">Objectif</label>
            <input type="text" value={objectif} onChange={(e) => setObjectif(e.target.value)} placeholder="ex: prévention mildiou..." className="border border-gray-200 rounded-lg px-3 py-2 text-sm" />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-gray-700">Campagne</label>
            <input type="text" value={campagne} onChange={(e) => setCampagne(e.target.value)} placeholder="ex: 2025" className="border border-gray-200 rounded-lg px-3 py-2 text-sm" />
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
