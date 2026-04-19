"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Section } from "@/components/ui/Section";
import { SelectField } from "@/components/ui/SelectField";
import { NumberField } from "@/components/ui/NumberField";
import { Toast } from "@/components/Toast";
import {
  METEO_OPTIONS,
  TYPES_APPLICATION,
  VENT_OPTIONS,
} from "@/lib/constants";
import { supabase } from "@/lib/supabase/client";
import { RecommandationBbch } from "@/components/traitements/RecommandationBbch";

interface VignobleItem { id: string; nom: string; }
interface ParcelleItem { id: string; vignoble_id: string; site_id: string | null; nom: string; }
interface ProtocoleOption { id: string; code: string; label: string; }
interface ModaliteLevainOption { id: string; code: string; label: string; }
interface BbchOption { id: string; code: string; label: string; }

interface RangEntry {
  rang: string;
  modalite_id: string;
  dose: string;
  commentaire: string;
}

export default function NewTraitementPage() {
  const router = useRouter();
  const today = new Date().toISOString().split("T")[0];
  const now = new Date().toTimeString().slice(0, 5);

  const [vignoblesList, setVignoblesList] = useState<VignobleItem[]>([]);
  const [parcellesList, setParcellesList] = useState<ParcelleItem[]>([]);
  const [protocoleOptions, setProtocoleOptions] = useState<ProtocoleOption[]>([]);
  const [modaliteOptions, setModaliteOptions] = useState<ModaliteLevainOption[]>([]);
  const [bbchOptions, setBbchOptions] = useState<BbchOption[]>([]);

  useEffect(() => {
    async function load() {
      const [v, p, proto, modLev] = await Promise.all([
        supabase.from("sites").select("id, nom").order("nom"),
        supabase.from("parcelles").select("id, vignoble_id, site_id, nom").order("nom"),
        supabase.from("protocoles").select("id, code, label").eq("actif", true).order("ordre"),
        supabase.from("modalites_levain").select("id, code, label").eq("actif", true).order("ordre"),
      ]);
      if (v.data) setVignoblesList(v.data);
      if (p.data) setParcellesList(p.data);
      if (proto.data) setProtocoleOptions(proto.data);
      if (modLev.data) setModaliteOptions(modLev.data);
      // Load BBCH stades
      const { data: bbchData } = await supabase.from("bbch_stades").select("id, code, label").eq("actif", true).order("ordre");
      if (bbchData) setBbchOptions(bbchData);
    }
    load();
  }, []);

  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error"; visible: boolean }>({ message: "", type: "success", visible: false });
  const hideToast = useCallback(() => setToast((t) => ({ ...t, visible: false })), []);

  // Étape 1 — Identification
  const [vignoble, setVignoble] = useState("");
  const [parcelleId, setParcelleId] = useState("");
  const [date, setDate] = useState(today);
  const [stadeBbchCode, setStadeBbchCode] = useState("");
  const [operateur, setOperateur] = useState("");

  // GPS auto
  const [latitude, setLatitude] = useState<number | null>(null);
  const [longitude, setLongitude] = useState<number | null>(null);
  const [gpsStatus, setGpsStatus] = useState<"loading" | "ok" | "error" | "idle">("idle");

  useEffect(() => {
    if (!navigator.geolocation) {
      setGpsStatus("error");
      return;
    }
    setGpsStatus("loading");
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLatitude(Math.round(pos.coords.latitude * 1000000) / 1000000);
        setLongitude(Math.round(pos.coords.longitude * 1000000) / 1000000);
        setGpsStatus("ok");
      },
      () => {
        setGpsStatus("error");
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }, []);

  // Étape 2 — Protocole
  const [protocoleId, setProtocoleId] = useState("");
  const [modeLibre, setModeLibre] = useState(false);

  // Étape 3 — Type de zone
  const [mode, setMode] = useState<"rang" | "surface">("rang");

  // Étape 4 — Nombre de rangs (mode rang)
  const [nbRangs, setNbRangs] = useState<number>(1);

  // Étape 5+6 — Rangs générés avec modalités
  const [rangs, setRangs] = useState<RangEntry[]>([]);

  // Mode surface
  const [surfaceHa, setSurfaceHa] = useState<number | null>(null);
  const [modaliteGlobale, setModaliteGlobale] = useState("");

  // Étape 7 — Paramètres globaux
  const [volumeBouillie, setVolumeBouillie] = useState<number | null>(null);
  const [phEau, setPhEau] = useState<number | null>(null);
  const [phBouillie, setPhBouillie] = useState<number | null>(null);
  const [origineEau, setOrigineEau] = useState("");

  // Étape 8 — Conditions météo
  const [heure, setHeure] = useState(now);
  const [temperature, setTemperature] = useState<number | null>(null);
  const [humidite, setHumidite] = useState<number | null>(null);
  const [vent, setVent] = useState("");
  const [couvert, setCouvert] = useState("");

  // Étape 9 — Type application
  const [typeApplication, setTypeApplication] = useState("");

  // Étape 10 — Options
  const [prelevementSol, setPrelevementSol] = useState(false);

  // Étape 11 — Notes
  const [notes, setNotes] = useState("");

  const parcelles = vignoble ? parcellesList.filter(p => {
    const v = vignoblesList.find(vv => vv.nom === vignoble);
    return v && (p.site_id === v.id || p.vignoble_id === v.id);
  }) : [];

  // Générer les rangs quand nbRangs change
  function genererRangs() {
    const newRangs: RangEntry[] = [];
    for (let i = 1; i <= nbRangs; i++) {
      const existing = rangs.find(r => r.rang === `R${i}`);
      newRangs.push(existing ?? { rang: `R${i}`, modalite_id: "", dose: "", commentaire: "" });
    }
    setRangs(newRangs);
  }

  useEffect(() => {
    if (mode === "rang" && nbRangs > 0) {
      genererRangs();
    }
  }, [nbRangs, mode]);

  function updateRang(index: number, field: keyof RangEntry, value: string) {
    setRangs(prev => prev.map((r, i) => i === index ? { ...r, [field]: value } : r));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!parcelleId || !date) {
      setToast({ message: "Remplis au moins : parcelle et date", type: "error", visible: true });
      return;
    }
    if (mode === "rang" && rangs.some(r => !r.modalite_id)) {
      setToast({ message: "Chaque rang doit avoir une modalité", type: "error", visible: true });
      return;
    }
    if (mode === "surface" && !modaliteGlobale) {
      setToast({ message: "Sélectionne une modalité pour la surface", type: "error", visible: true });
      return;
    }

    setSaving(true);

    // 1. Insérer le traitement principal
    const { data: traitData, error: traitError } = await supabase.from("traitements").insert({
      parcelle_id: parcelleId,
      rang: mode === "rang" ? nbRangs : 0,
      modalite: mode === "surface" ? modaliteGlobale : "",
      date,
      produit: "",
      dose: null,
      methode_application: typeApplication || null,
      temperature,
      humidite,
      conditions_meteo: couvert || null,
      operateur: operateur || null,
      notes: notes || null,
      campagne: new Date().getFullYear().toString(),
      protocole_id: (!modeLibre && protocoleId) ? protocoleId : null,
      stade: stadeBbchCode || null,
      zone_traitee_type: mode,
      type_application: typeApplication || null,
      prelevement_sol: prelevementSol,
      couvert: couvert || null,
      volume_bouillie_l: volumeBouillie,
      ph_eau: phEau,
      ph_bouillie: phBouillie,
      origine_eau: origineEau || null,
      mode,
      nb_rangs: mode === "rang" ? nbRangs : null,
      surface_ha: mode === "surface" ? surfaceHa : null,
      modalite_globale: mode === "surface" ? modaliteGlobale : null,
      heure: heure || null,
      latitude,
      longitude,
    }).select("id").single();

    if (traitError || !traitData) {
      setSaving(false);
      setToast({ message: "Erreur : " + (traitError?.message ?? "inconnue"), type: "error", visible: true });
      return;
    }

    // 2. Insérer les rangs (mode rang uniquement)
    if (mode === "rang" && rangs.length > 0) {
      const rangRecords = rangs.map(r => ({
        traitement_id: traitData.id,
        rang: r.rang,
        modalite_id: r.modalite_id,
        dose: r.dose || null,
        commentaire: r.commentaire || null,
      }));
      const { error: rangError } = await supabase.from("traitement_rangs").insert(rangRecords);
      if (rangError) {
        setSaving(false);
        setToast({ message: "Traitement créé mais erreur rangs : " + rangError.message, type: "error", visible: true });
        return;
      }
    }

    setSaving(false);
    setToast({ message: `Traitement enregistré ✓ (${mode === "rang" ? rangs.length + " rangs" : "surface"})`, type: "success", visible: true });
    setTimeout(() => router.push("/traitements"), 1000);
  }

  return (
    <div>
      <h1 className="text-xl font-bold gradient-text mb-4">🧪 Nouveau traitement</h1>
      <Toast message={toast.message} type={toast.type} visible={toast.visible} onClose={hideToast} />
      <form onSubmit={handleSubmit} className="space-y-3">

        {/* ===== Étape 1 — Identification ===== */}
        <Section title="1. Identification" icon="📍" defaultOpen={true}>
          <SelectField label="Site" value={vignoble} onChange={(v) => { setVignoble(v); setParcelleId(""); }} options={vignoblesList.map(v => v.nom)} />
          {parcelles.length > 0 && (
            <SelectField label="Parcelle" value={parcelleId} onChange={setParcelleId} options={parcelles.map(p => ({ value: p.id, label: p.nom }))} />
          )}
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-gray-700">Date</label>
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="border border-gray-200 rounded-xl px-3 py-2.5 text-sm" />
          </div>
          {/* Stade BBCH */}
          <div>
            <label className="text-sm font-medium text-gray-700 mb-1 block">Stade BBCH</label>
            <select value={stadeBbchCode} onChange={e => setStadeBbchCode(e.target.value)}
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm">
              <option value="">Sélectionner un stade BBCH…</option>
              {bbchOptions.map(b => <option key={b.id} value={b.code}>{b.code} — {b.label}</option>)}
            </select>
          </div>

          {/* Recommandations dynamiques */}
          <RecommandationBbch stadeCode={stadeBbchCode} />
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-gray-700">Opérateur</label>
            <input type="text" value={operateur} onChange={(e) => setOperateur(e.target.value)} placeholder="Nom" className="border border-gray-200 rounded-xl px-3 py-2.5 text-sm" />
          </div>

          {/* GPS auto */}
          <div className="flex items-center gap-2 mt-1">
            <span className="text-sm">📍</span>
            {gpsStatus === "loading" && (
              <span className="text-xs text-gray-400 flex items-center gap-1">
                <span className="w-3 h-3 border-2 border-gray-300 border-t-emerald-500 rounded-full animate-spin" />
                Localisation en cours…
              </span>
            )}
            {gpsStatus === "ok" && (
              <span className="text-xs text-emerald-600 font-medium">
                GPS : {latitude}, {longitude}
              </span>
            )}
            {gpsStatus === "error" && (
              <span className="text-xs text-amber-600">GPS indisponible — position non enregistrée</span>
            )}
            {gpsStatus === "idle" && (
              <span className="text-xs text-gray-400">En attente du GPS…</span>
            )}
          </div>
        </Section>

        {/* ===== Étape 2 — Protocole ===== */}
        <Section title="2. Protocole" icon="📋" defaultOpen={true}>
          <label className="flex items-center gap-2 cursor-pointer mb-2">
            <input type="checkbox" checked={modeLibre} onChange={(e) => setModeLibre(e.target.checked)}
              className="w-5 h-5 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500" />
            <span className="text-sm font-medium">Mode libre (sans protocole)</span>
          </label>
          {!modeLibre && (
            <SelectField label="Protocole" value={protocoleId} onChange={setProtocoleId}
              options={protocoleOptions.map(p => ({ value: p.id, label: `${p.code} — ${p.label}` }))} placeholder="Sélectionner un protocole" />
          )}
        </Section>

        {/* ===== Étape 3 — Type de zone ===== */}
        <Section title="3. Type de zone" icon="🗺️" defaultOpen={true}>
          <div className="flex gap-2">
            <button type="button" onClick={() => setMode("rang")}
              className={`flex-1 py-3 rounded-xl text-sm font-semibold transition-all ${mode === "rang" ? "bg-emerald-600 text-white shadow-md" : "bg-gray-100 text-gray-600"}`}>
              Par rangs
            </button>
            <button type="button" onClick={() => setMode("surface")}
              className={`flex-1 py-3 rounded-xl text-sm font-semibold transition-all ${mode === "surface" ? "bg-emerald-600 text-white shadow-md" : "bg-gray-100 text-gray-600"}`}>
              Par surface
            </button>
          </div>
        </Section>

        {mode === "rang" ? (
          <>
            {/* ===== Étape 4 — Nombre de rangs ===== */}
            <Section title="4. Nombre de rangs" icon="🔢" defaultOpen={true}>
              <select
                value={nbRangs}
                onChange={(e) => setNbRangs(Number(e.target.value))}
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm"
              >
                {Array.from({ length: 20 }, (_, i) => i + 1).map(n => (
                  <option key={n} value={n}>{n} rang{n > 1 ? "s" : ""}</option>
                ))}
              </select>
              <p className="text-xs text-gray-400">{rangs.length} rang(s) générés automatiquement</p>
            </Section>

            {/* ===== Étape 5+6 — Saisie par rang ===== */}
            <Section title="5. Modalité par rang" icon="🌱" defaultOpen={true}>
              <p className="text-xs text-gray-400 mb-2">Attribuez une modalité à chaque rang. La dose et le commentaire sont optionnels.</p>
              <div className="space-y-2">
                {rangs.map((r, i) => (
                  <div key={r.rang} className="bg-gray-50 rounded-xl p-3">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-xs font-bold text-emerald-700 bg-emerald-100 px-2.5 py-1 rounded-lg">{r.rang}</span>
                      <div className="flex-1">
                        <select
                          value={r.modalite_id}
                          onChange={(e) => updateRang(i, "modalite_id", e.target.value)}
                          className={`w-full border rounded-lg px-2 py-1.5 text-sm ${!r.modalite_id ? "border-red-300 bg-red-50/50" : "border-gray-200"}`}
                        >
                          <option value="">Modalité *</option>
                          {modaliteOptions.map(m => (
                            <option key={m.id} value={m.code}>{m.code} — {m.label}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <input
                        type="text"
                        value={r.dose}
                        onChange={(e) => updateRang(i, "dose", e.target.value)}
                        placeholder="Dose (optionnel)"
                        className="border border-gray-200 rounded-lg px-2 py-1.5 text-xs"
                      />
                      <input
                        type="text"
                        value={r.commentaire}
                        onChange={(e) => updateRang(i, "commentaire", e.target.value)}
                        placeholder="Note (optionnel)"
                        className="border border-gray-200 rounded-lg px-2 py-1.5 text-xs"
                      />
                    </div>
                  </div>
                ))}
              </div>
            </Section>
          </>
        ) : (
          /* ===== Mode surface ===== */
          <Section title="4. Surface & Modalité" icon="📐" defaultOpen={true}>
            <NumberField label="Surface" value={surfaceHa} onChange={setSurfaceHa} unit="ha" step={0.01} />
            <SelectField label="Modalité globale" value={modaliteGlobale} onChange={setModaliteGlobale}
              options={modaliteOptions.map(m => ({ value: m.code, label: `${m.code} — ${m.label}` }))} placeholder="Sélectionner une modalité" />
          </Section>
        )}

        {/* ===== Étape 7 — Paramètres globaux ===== */}
        <Section title={mode === "rang" ? "6. Paramètres globaux" : "5. Paramètres globaux"} icon="⚗️">
          <NumberField label="Volume bouillie" value={volumeBouillie} onChange={setVolumeBouillie} unit="L/ha" step={0.5} />
          <div className="grid grid-cols-2 gap-3">
            <NumberField label="pH eau" value={phEau} onChange={setPhEau} step={0.1} />
            <NumberField label="pH bouillie" value={phBouillie} onChange={setPhBouillie} step={0.1} />
          </div>
          <SelectField label="Origine eau" value={origineEau} onChange={setOrigineEau} options={["Robinet", "Pluie", "Forage", "Autre"]} />
        </Section>

        {/* ===== Étape 8 — Conditions météo ===== */}
        <Section title={mode === "rang" ? "7. Conditions météo" : "6. Conditions météo"} icon="🌤️">
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-gray-700">Heure</label>
            <input type="time" value={heure} onChange={(e) => setHeure(e.target.value)} className="border border-gray-200 rounded-xl px-3 py-2.5 text-sm" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <NumberField label="Température" value={temperature} onChange={setTemperature} unit="°C" step={0.5} />
            <NumberField label="Humidité" value={humidite} onChange={setHumidite} unit="%" />
          </div>
          <SelectField label="Vent" value={vent} onChange={setVent} options={[...VENT_OPTIONS]} />
          <SelectField label="Couvert nuageux" value={couvert} onChange={setCouvert} options={[...METEO_OPTIONS]} />
        </Section>

        {/* ===== Étape 9 — Type application ===== */}
        <Section title={mode === "rang" ? "8. Type d'application" : "7. Type d'application"} icon="🚜">
          <div className="grid grid-cols-1 gap-2">
            {TYPES_APPLICATION.map((t) => (
              <button key={t.code} type="button" onClick={() => setTypeApplication(t.code)}
                className={`text-left px-4 py-3 rounded-xl border transition-all ${typeApplication === t.code ? "border-amber-500 bg-amber-50 ring-2 ring-amber-500/20" : "border-gray-200 hover:border-amber-300"}`}>
                <span className="text-sm font-medium">{t.label}</span>
              </button>
            ))}
          </div>
        </Section>

        {/* ===== Étape 10 — Options ===== */}
        <Section title={mode === "rang" ? "9. Options" : "8. Options"} icon="🔍">
          <label className="flex items-center gap-3 cursor-pointer py-2">
            <input type="checkbox" checked={prelevementSol} onChange={(e) => setPrelevementSol(e.target.checked)}
              className="w-5 h-5 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500" />
            <span className="text-sm font-medium">🧪 Prélèvement sol effectué</span>
          </label>
        </Section>

        {/* ===== Étape 11 — Notes ===== */}
        <Section title={mode === "rang" ? "10. Notes" : "9. Notes"} icon="💬">
          <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} placeholder="Observations terrain, anomalies…"
            className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20" />
        </Section>

        {/* Résumé */}
        {mode === "rang" && rangs.length > 0 && (
          <div className="glass rounded-2xl p-4">
            <div className="text-xs font-semibold text-gray-600 mb-2">📊 Résumé</div>
            <div className="flex flex-wrap gap-1.5">
              {rangs.map(r => (
                <span key={r.rang} className={`text-xs px-2 py-1 rounded-lg ${r.modalite_id ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-600"}`}>
                  {r.rang} → {r.modalite_id || "?"}
                </span>
              ))}
            </div>
          </div>
        )}

        <button type="submit" disabled={saving} className="w-full btn-secondary">
          {saving ? (
            <span className="flex items-center justify-center gap-2">
              <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              Enregistrement...
            </span>
          ) : (
            `💾 Sauvegarder le traitement${mode === "rang" ? ` (${rangs.length} rangs)` : ""}`
          )}
        </button>
      </form>
    </div>
  );
}
