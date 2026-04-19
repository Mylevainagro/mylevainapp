"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Section } from "@/components/ui/Section";
import { SelectField } from "@/components/ui/SelectField";
import { NumberField } from "@/components/ui/NumberField";
import { Toast } from "@/components/Toast";
import {
  METEO_OPTIONS,
  STADES_TRAITEMENT,
  TYPES_APPLICATION,
  VENT_OPTIONS,
} from "@/lib/constants";
import { supabase } from "@/lib/supabase/client";

interface VignobleItem { id: string; nom: string; }
interface ParcelleItem { id: string; vignoble_id: string; nom: string; }
interface ProtocoleOption { id: string; code: string; label: string; }
interface ModaliteLevainOption { id: string; code: string; label: string; }
interface ProduitOption { id: string; code: string; label: string; }

export default function NewTraitementPage() {
  const router = useRouter();
  const today = new Date().toISOString().split("T")[0];

  const [vignoblesList, setVignoblesList] = useState<VignobleItem[]>([]);
  const [parcellesList, setParcellesList] = useState<ParcelleItem[]>([]);
  const [protocoleOptions, setProtocoleOptions] = useState<ProtocoleOption[]>([]);
  const [modaliteLevainOptions, setModaliteLevainOptions] = useState<ModaliteLevainOption[]>([]);
  const [produitOptions, setProduitOptions] = useState<ProduitOption[]>([]);

  useEffect(() => {
    async function load() {
      const [v, p, proto, modLev, prod] = await Promise.all([
        supabase.from("vignobles").select("id, nom").order("nom"),
        supabase.from("parcelles").select("id, vignoble_id, nom").order("nom"),
        supabase.from("protocoles").select("id, code, label").eq("actif", true).order("ordre"),
        supabase.from("modalites_levain").select("id, code, label").eq("actif", true).order("ordre"),
        supabase.from("produits").select("id, code, label").eq("actif", true).order("ordre"),
      ]);
      if (v.data) setVignoblesList(v.data);
      if (p.data) setParcellesList(p.data);
      if (proto.data) setProtocoleOptions(proto.data);
      if (modLev.data) setModaliteLevainOptions(modLev.data);
      if (prod.data) setProduitOptions(prod.data);
    }
    load();
  }, []);

  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error"; visible: boolean }>({ message: "", type: "success", visible: false });
  const hideToast = useCallback(() => setToast((t) => ({ ...t, visible: false })), []);

  // 1. Identification
  const [vignoble, setVignoble] = useState("");
  const [parcelleId, setParcelleId] = useState("");
  const [protocoleId, setProtocoleId] = useState("");
  const [date, setDate] = useState(today);
  const [stade, setStade] = useState("");
  const [operateur, setOperateur] = useState("");

  // 2. Zone traitée
  const [zoneType, setZoneType] = useState<"rang" | "surface">("rang");
  const [zoneRang, setZoneRang] = useState("");
  const [zoneSurfaceM2, setZoneSurfaceM2] = useState<number | null>(null);

  // 3. Modalité
  const [modaliteLevainId, setModaliteLevainId] = useState("");
  const [rang, setRang] = useState<number>(0);

  // 4. Produit & Application
  const [produitLevainId, setProduitLevainId] = useState("");
  const [dose, setDose] = useState("");
  const [volumeBouillie, setVolumeBouillie] = useState<number | null>(null);
  const [phEau, setPhEau] = useState<number | null>(null);
  const [phBouillie, setPhBouillie] = useState<number | null>(null);
  const [origineEau, setOrigineEau] = useState("");

  // 5. Conditions météo
  const [temperature, setTemperature] = useState<number | null>(null);
  const [humidite, setHumidite] = useState<number | null>(null);
  const [vent, setVent] = useState("");
  const [couvert, setCouvert] = useState("");
  const [conditionsMeteo, setConditionsMeteo] = useState("");

  // 6. Type application
  const [typeApplication, setTypeApplication] = useState("");

  // 7. Cas spécial
  const [prelevementSol, setPrelevementSol] = useState(false);

  // 8. Notes
  const [notes, setNotes] = useState("");

  const parcelles = vignoble ? parcellesList.filter(p => {
    const v = vignoblesList.find(vv => vv.nom === vignoble);
    return v && p.vignoble_id === v.id;
  }) : [];

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!parcelleId || !date) {
      setToast({ message: "Remplis au moins : parcelle et date", type: "error", visible: true });
      return;
    }
    setSaving(true);
    const { error } = await supabase.from("traitements").insert({
      parcelle_id: parcelleId,
      rang,
      modalite: "",
      date,
      produit: "",
      dose: dose || null,
      methode_application: typeApplication || null,
      temperature,
      humidite,
      conditions_meteo: conditionsMeteo || null,
      operateur: operateur || null,
      notes: notes || null,
      campagne: new Date().getFullYear().toString(),
      protocole_id: protocoleId || null,
      modalite_levain_id: modaliteLevainId || null,
      produit_levain_id: produitLevainId || null,
      // Nouveaux champs v2
      stade: stade || null,
      zone_traitee_type: zoneType,
      zone_traitee_rang: zoneType === "rang" ? (zoneRang || null) : null,
      zone_traitee_surface_m2: zoneType === "surface" ? zoneSurfaceM2 : null,
      type_application: typeApplication || null,
      prelevement_sol: prelevementSol,
      couvert: couvert || null,
      volume_bouillie_l: volumeBouillie,
      ph_eau: phEau,
      ph_bouillie: phBouillie,
      origine_eau: origineEau || null,
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
      <h1 className="text-xl font-bold gradient-text mb-4">🧪 Nouveau traitement</h1>
      <Toast message={toast.message} type={toast.type} visible={toast.visible} onClose={hideToast} />
      <form onSubmit={handleSubmit} className="space-y-3">

        {/* ===== Étape 1 — Identification ===== */}
        <Section title="Identification" icon="📍" defaultOpen={true}>
          <SelectField label="Site" value={vignoble} onChange={(v) => { setVignoble(v); setParcelleId(""); }} options={vignoblesList.map(v => v.nom)} />
          {parcelles.length > 0 && (
            <SelectField label="Parcelle" value={parcelleId} onChange={setParcelleId} options={parcelles.map(p => ({ value: p.id, label: p.nom }))} />
          )}
          <SelectField label="Protocole" value={protocoleId} onChange={setProtocoleId}
            options={protocoleOptions.map(p => ({ value: p.id, label: `${p.code} — ${p.label}` }))} placeholder="Sélectionner un protocole" />
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-gray-700">Date</label>
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="border border-gray-200 rounded-xl px-3 py-2.5 text-sm bg-white/80 focus:outline-none focus:ring-2 focus:ring-emerald-500/20" />
          </div>
          <div>
            <label className="text-sm font-medium text-gray-700 mb-1 block">Stade</label>
            <div className="flex gap-2 flex-wrap">
              {STADES_TRAITEMENT.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setStade(s)}
                  className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
                    stade === s
                      ? "bg-emerald-600 text-white shadow-md"
                      : "bg-gray-100 text-gray-600 hover:bg-emerald-50 hover:text-emerald-700"
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-gray-700">Opérateur</label>
            <input type="text" value={operateur} onChange={(e) => setOperateur(e.target.value)} placeholder="Nom de l'opérateur" className="border border-gray-200 rounded-xl px-3 py-2.5 text-sm bg-white/80 focus:outline-none focus:ring-2 focus:ring-emerald-500/20" />
          </div>
        </Section>

        {/* ===== Étape 2 — Zone traitée ===== */}
        <Section title="Zone traitée" icon="🗺️" defaultOpen={true}>
          <div className="flex gap-2 mb-3">
            <button
              type="button"
              onClick={() => setZoneType("rang")}
              className={`flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                zoneType === "rang"
                  ? "bg-emerald-600 text-white shadow-md"
                  : "bg-gray-100 text-gray-600"
              }`}
            >
              Par rang
            </button>
            <button
              type="button"
              onClick={() => setZoneType("surface")}
              className={`flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                zoneType === "surface"
                  ? "bg-emerald-600 text-white shadow-md"
                  : "bg-gray-100 text-gray-600"
              }`}
            >
              Par surface
            </button>
          </div>
          {zoneType === "rang" ? (
            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium text-gray-700">Rang(s)</label>
              <input type="text" value={zoneRang} onChange={(e) => setZoneRang(e.target.value)} placeholder="ex: R1, R2, R3…" className="border border-gray-200 rounded-xl px-3 py-2.5 text-sm bg-white/80 focus:outline-none focus:ring-2 focus:ring-emerald-500/20" />
            </div>
          ) : (
            <NumberField label="Surface" value={zoneSurfaceM2} onChange={setZoneSurfaceM2} unit="m²" />
          )}
        </Section>

        {/* ===== Étape 3 — Modalité ===== */}
        <Section title="Modalité" icon="🔬" defaultOpen={true}>
          <SelectField label="Modalité levain" value={modaliteLevainId} onChange={setModaliteLevainId}
            options={modaliteLevainOptions.map(m => ({ value: m.id, label: `${m.code} — ${m.label}` }))} placeholder="Sélectionner une modalité" />
        </Section>

        {/* ===== Étape 4 — Produit / pH ===== */}
        <Section title="Produit & pH" icon="🧪" defaultOpen={true}>
          <SelectField label="Produit" value={produitLevainId} onChange={setProduitLevainId}
            options={produitOptions.map(p => ({ value: p.id, label: `${p.code} — ${p.label}` }))} placeholder="Sélectionner un produit" />
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-gray-700">Dose réelle</label>
            <input type="text" value={dose} onChange={(e) => setDose(e.target.value)} placeholder="ex: 1L/4L, 200g/hL…" className="border border-gray-200 rounded-xl px-3 py-2.5 text-sm bg-white/80 focus:outline-none focus:ring-2 focus:ring-emerald-500/20" />
          </div>
          <NumberField label="Volume bouillie" value={volumeBouillie} onChange={setVolumeBouillie} unit="L" step={0.5} />
          <div className="grid grid-cols-2 gap-3">
            <NumberField label="pH eau" value={phEau} onChange={setPhEau} step={0.1} />
            <NumberField label="pH bouillie" value={phBouillie} onChange={setPhBouillie} step={0.1} />
          </div>
          <SelectField label="Origine eau" value={origineEau} onChange={setOrigineEau} options={["Forage", "Robinet", "Pluie", "Autre"]} />
        </Section>

        {/* ===== Étape 5 — Conditions météo ===== */}
        <Section title="Conditions météo" icon="🌤️">
          <div className="grid grid-cols-2 gap-3">
            <NumberField label="Température" value={temperature} onChange={setTemperature} unit="°C" step={0.5} />
            <NumberField label="Humidité" value={humidite} onChange={setHumidite} unit="%" />
          </div>
          <SelectField label="Vent" value={vent} onChange={setVent} options={[...VENT_OPTIONS]} />
          <SelectField label="Couvert" value={couvert} onChange={setCouvert} options={[...METEO_OPTIONS]} />
        </Section>

        {/* ===== Étape 6 — Type application ===== */}
        <Section title="Type d'application" icon="🚜">
          <div className="grid grid-cols-1 gap-2">
            {TYPES_APPLICATION.map((t) => (
              <button
                key={t.code}
                type="button"
                onClick={() => setTypeApplication(t.code)}
                className={`text-left px-4 py-3 rounded-xl border transition-all ${
                  typeApplication === t.code
                    ? "border-amber-500 bg-amber-50 ring-2 ring-amber-500/20"
                    : "border-gray-200 hover:border-amber-300"
                }`}
              >
                <span className="text-sm font-medium">{t.label}</span>
              </button>
            ))}
          </div>
        </Section>

        {/* ===== Étape 7 — Cas spécial ===== */}
        <Section title="Cas spécial" icon="🔍">
          <label className="flex items-center gap-3 cursor-pointer py-2">
            <input
              type="checkbox"
              checked={prelevementSol}
              onChange={(e) => setPrelevementSol(e.target.checked)}
              className="w-5 h-5 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
            />
            <span className="text-sm font-medium">🧪 Prélèvement sol effectué</span>
          </label>
        </Section>

        {/* ===== Étape 8 — Notes ===== */}
        <Section title="Notes & anomalies" icon="💬">
          <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} placeholder="Observations terrain, anomalies…" className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm bg-white/80 focus:outline-none focus:ring-2 focus:ring-emerald-500/20" />
        </Section>

        <button type="submit" disabled={saving} className="w-full btn-secondary">
          {saving ? (
            <span className="flex items-center justify-center gap-2">
              <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              Enregistrement...
            </span>
          ) : (
            "💾 Sauvegarder le traitement"
          )}
        </button>
      </form>
    </div>
  );
}
