"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Section } from "@/components/ui/Section";
import { SelectField } from "@/components/ui/SelectField";
import { NumberField } from "@/components/ui/NumberField";
import { Toast } from "@/components/Toast";
import { METEO_OPTIONS, TYPES_APPLICATION, VENT_OPTIONS } from "@/lib/constants";
import { supabase } from "@/lib/supabase/client";
import { RecommandationBbch } from "@/components/traitements/RecommandationBbch";

interface SiteItem { id: string; nom: string; }
interface ParcelleItem { id: string; vignoble_id: string; site_id: string | null; nom: string; culture_id: string | null; nb_rangs: number | null; surface: number | null; }
interface BbchOption { id: string; code: string; label: string; culture_id: string; }
interface RangModalite { rang: number; modalite_code: string | null; produit: string | null; dose: string | null; produit2: string | null; dose2: string | null; temoin: boolean; }

// Données saisies par rang lors du traitement
interface RangTraitData {
  rang: number;
  modalite_code: string;
  temoin: boolean;
  produit1: string;
  dose1_lha: string;
  produit2: string;
  dose2_lha: string;
  nb_produits: 1 | 2;
  // Produit 1
  p1_volume_prepare: number | null;
  p1_ph_bouillie: number | null;
  p1_volume_restant: number | null;
  // Produit 2
  p2_volume_prepare: number | null;
  p2_ph_bouillie: number | null;
  p2_volume_restant: number | null;
}

export default function NewTraitementPage() {
  const router = useRouter();
  const today = new Date().toISOString().split("T")[0];
  const now = new Date().toTimeString().slice(0, 5);

  const [sitesList, setSitesList] = useState<SiteItem[]>([]);
  const [parcellesList, setParcellesList] = useState<ParcelleItem[]>([]);
  const [bbchOptions, setBbchOptions] = useState<BbchOption[]>([]);
  const [parcelleRangs, setParcelleRangs] = useState<RangModalite[]>([]);

  useEffect(() => {
    async function load() {
      const [s, p, b] = await Promise.all([
        supabase.from("sites").select("id, nom").order("nom"),
        supabase.from("parcelles").select("id, vignoble_id, site_id, nom, culture_id, nb_rangs, surface").order("nom"),
        supabase.from("bbch_stades").select("id, code, label, culture_id").eq("actif", true).order("ordre"),
      ]);
      if (s.data) setSitesList(s.data);
      if (p.data) setParcellesList(p.data);
      if (b.data) setBbchOptions(b.data);
    }
    load();
  }, []);

  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error"; visible: boolean }>({ message: "", type: "success", visible: false });
  const hideToast = useCallback(() => setToast((t) => ({ ...t, visible: false })), []);

  // 1. Identification
  const [siteId, setSiteId] = useState("");
  const [parcelleId, setParcelleId] = useState("");
  const [date, setDate] = useState(today);
  const [stadeBbch, setStadeBbch] = useState("");
  const [operateur, setOperateur] = useState("");

  // GPS
  const [latitude, setLatitude] = useState<number | null>(null);
  const [longitude, setLongitude] = useState<number | null>(null);
  const [gpsStatus, setGpsStatus] = useState<"loading" | "ok" | "error" | "idle">("idle");
  useEffect(() => {
    if (!navigator.geolocation) { setGpsStatus("error"); return; }
    setGpsStatus("loading");
    navigator.geolocation.getCurrentPosition(
      (pos) => { setLatitude(Math.round(pos.coords.latitude * 1000000) / 1000000); setLongitude(Math.round(pos.coords.longitude * 1000000) / 1000000); setGpsStatus("ok"); },
      () => setGpsStatus("error"),
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }, []);

  // 2. Paramètres globaux
  const [volumeCible, setVolumeCible] = useState<number | null>(null); // L/ha
  const [phEau, setPhEau] = useState<number | null>(null);
  const [phBouillieGlobal, setPhBouillieGlobal] = useState<number | null>(null);
  const [origineEau, setOrigineEau] = useState("");

  // 3. Météo
  const [heure, setHeure] = useState(now);
  const [temperature, setTemperature] = useState<number | null>(null);
  const [humidite, setHumidite] = useState<number | null>(null);
  const [vent, setVent] = useState("");
  const [couvert, setCouvert] = useState("");

  // 4. Application
  const [typeApplication, setTypeApplication] = useState("");

  // 5. Options
  const [prelevementSol, setPrelevementSol] = useState(false);

  // 6. Détail par rang
  const [rangTraitData, setRangTraitData] = useState<RangTraitData[]>([]);

  // 7. Notes
  const [notes, setNotes] = useState("");

  // Derived
  const parcelles = siteId ? parcellesList.filter(p => p.site_id === siteId || p.vignoble_id === siteId) : [];
  const selectedParcelle = parcellesList.find(p => p.id === parcelleId);
  const filteredBbch = selectedParcelle?.culture_id ? bbchOptions.filter(b => b.culture_id === selectedParcelle.culture_id) : bbchOptions;
  const surfaceRang = selectedParcelle?.surface && selectedParcelle?.nb_rangs ? Math.round(selectedParcelle.surface / selectedParcelle.nb_rangs * 10000) / 10000 : null;

  // Load parcelle rangs when parcelle changes
  useEffect(() => {
    if (!parcelleId) { setParcelleRangs([]); setRangTraitData([]); return; }
    async function loadRangs() {
      const { data } = await supabase.from("parcelle_rangs").select("rang, modalite_code, produit, dose, produit2, dose2, temoin").eq("parcelle_id", parcelleId).order("rang");
      if (data && data.length > 0) {
        setParcelleRangs(data);
        setRangTraitData(data.map(r => ({
          rang: r.rang, modalite_code: r.modalite_code || "", temoin: r.temoin || false,
          produit1: r.produit || "", dose1_lha: r.dose || "",
          produit2: r.produit2 || "", dose2_lha: r.dose2 || "",
          nb_produits: (r.produit2 ? 2 : 1) as 1 | 2,
          p1_volume_prepare: null, p1_ph_bouillie: null, p1_volume_restant: null,
          p2_volume_prepare: null, p2_ph_bouillie: null, p2_volume_restant: null,
        })));
      } else {
        setParcelleRangs([]);
        setRangTraitData([]);
      }
    }
    loadRangs();
  }, [parcelleId]);

  function updateRangTrait(index: number, field: keyof RangTraitData, value: unknown) {
    setRangTraitData(prev => prev.map((r, i) => i === index ? { ...r, [field]: value } : r));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!parcelleId || !date) { setToast({ message: "Parcelle et date obligatoires", type: "error", visible: true }); return; }
    setSaving(true);

    const { data: traitData, error } = await supabase.from("traitements").insert({
      parcelle_id: parcelleId, date, rang: selectedParcelle?.nb_rangs || 0, modalite: "",
      produit: "", dose: null, methode_application: typeApplication || null,
      temperature, humidite, conditions_meteo: couvert || null, operateur: operateur || null,
      notes: notes || null, campagne: new Date().getFullYear().toString(),
      stade: stadeBbch || null, zone_traitee_type: "rang", type_application: typeApplication || null,
      prelevement_sol: prelevementSol, couvert: couvert || null,
      volume_bouillie_l: volumeCible, ph_eau: phEau, ph_bouillie: phBouillieGlobal,
      origine_eau: origineEau || null, mode: "rang", nb_rangs: selectedParcelle?.nb_rangs || null,
      surface_ha: selectedParcelle?.surface || null, heure: heure || null, latitude, longitude,
    }).select("id").single();

    if (error || !traitData) { setSaving(false); setToast({ message: "Erreur : " + (error?.message ?? ""), type: "error", visible: true }); return; }

    // Save rang details
    const rangRecords = rangTraitData.filter(r => !r.temoin).map(r => ({
      traitement_id: traitData.id, rang: `R${r.rang}`, modalite_id: r.modalite_code,
      dose: r.dose1_lha || null,
      commentaire: [
        r.p1_volume_prepare ? `P1: Préparé ${r.p1_volume_prepare}L | pH ${r.p1_ph_bouillie ?? "?"} | Restant ${r.p1_volume_restant ?? "?"}L` : "",
        r.nb_produits === 2 && r.p2_volume_prepare ? `P2: Préparé ${r.p2_volume_prepare}L | pH ${r.p2_ph_bouillie ?? "?"} | Restant ${r.p2_volume_restant ?? "?"}L` : "",
      ].filter(Boolean).join(" | ") || null,
    }));
    if (rangRecords.length > 0) await supabase.from("traitement_rangs").insert(rangRecords);

    setSaving(false);
    setToast({ message: "Traitement enregistré ✓", type: "success", visible: true });
    setTimeout(() => router.push("/traitements"), 1000);
  }

  return (
    <div>
      <h1 className="text-xl font-bold gradient-text mb-4">🧪 Nouveau traitement</h1>
      <Toast message={toast.message} type={toast.type} visible={toast.visible} onClose={hideToast} />
      <form onSubmit={handleSubmit} className="space-y-3">

        {/* ===== 1. Identification ===== */}
        <Section title="1. Identification" icon="📍" defaultOpen={true}>
          <SelectField label="Site" value={siteId} onChange={v => { setSiteId(v); setParcelleId(""); }} options={sitesList.map(s => ({ value: s.id, label: s.nom }))} placeholder="Sélectionner un site" />
          {parcelles.length > 0 && (
            <SelectField label="Parcelle" value={parcelleId} onChange={setParcelleId} options={parcelles.map(p => ({ value: p.id, label: p.nom }))} placeholder="Sélectionner" />
          )}
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium text-gray-700">Date</label>
              <input type="date" value={date} onChange={e => setDate(e.target.value)} className="border border-gray-200 rounded-xl px-3 py-2.5 text-sm" />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium text-gray-700">Heure</label>
              <input type="time" value={heure} onChange={e => setHeure(e.target.value)} className="border border-gray-200 rounded-xl px-3 py-2.5 text-sm" />
            </div>
          </div>
          <div>
            <label className="text-sm font-medium text-gray-700 mb-1 block">Stade BBCH</label>
            <select value={stadeBbch} onChange={e => setStadeBbch(e.target.value)} className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm">
              <option value="">Sélectionner…</option>
              {filteredBbch.map(b => <option key={b.id} value={b.code}>{b.code} — {b.label}</option>)}
            </select>
          </div>
          <RecommandationBbch stadeCode={stadeBbch} />
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-gray-700">Opérateur</label>
            <input type="text" value={operateur} onChange={e => setOperateur(e.target.value)} placeholder="Nom" className="border border-gray-200 rounded-xl px-3 py-2.5 text-sm" />
          </div>
          <div className="flex items-center gap-2 text-xs text-gray-500">
            <span>📍</span>
            {gpsStatus === "ok" && <span className="text-emerald-600">GPS : {latitude}, {longitude}</span>}
            {gpsStatus === "loading" && <span>Localisation…</span>}
            {gpsStatus === "error" && <span className="text-amber-600">GPS indisponible</span>}
          </div>
        </Section>

        {/* ===== 2. Récap protocole (lecture seule) ===== */}
        {parcelleRangs.length > 0 && (
          <Section title="2. Protocole parcelle" icon="📋" defaultOpen={true}>
            <p className="text-xs text-gray-500 mb-2">Modalités définies dans Admin → Parcelle. {selectedParcelle?.nb_rangs} rangs · {selectedParcelle?.surface ? `${selectedParcelle.surface} ha` : "—"}{surfaceRang ? ` · ${surfaceRang} ha/rang` : ""}</p>
            <div className="space-y-1">
              {parcelleRangs.map(r => (
                <div key={r.rang} className={`flex items-center gap-2 text-xs px-3 py-2 rounded-lg ${r.temoin ? "bg-gray-100 text-gray-500" : "bg-emerald-50 text-gray-700"}`}>
                  <span className="font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded">R{r.rang}</span>
                  {r.temoin ? <span className="italic">Témoin</span> : (
                    <>
                      <span className="font-medium">{r.modalite_code}</span>
                      {r.produit && <span>· {r.produit}</span>}
                      {r.dose && <span className="text-amber-700 font-medium">· {r.dose}</span>}
                      {r.produit2 && <span>· {r.produit2} {r.dose2}</span>}
                    </>
                  )}
                </div>
              ))}
            </div>
          </Section>
        )}

        {/* ===== 3. Paramètres globaux ===== */}
        <Section title="3. Paramètres globaux" icon="⚗️" defaultOpen={true}>
          <NumberField label="Volume de bouillie cible (L/ha)" value={volumeCible} onChange={setVolumeCible} step={10} />
          <NumberField label="pH eau" value={phEau} onChange={setPhEau} step={0.1} />
          <SelectField label="Origine eau" value={origineEau} onChange={setOrigineEau} options={["Robinet", "Pluie", "Forage", "Autre"]} />
        </Section>

        {/* ===== 4. Conditions météo ===== */}
        <Section title="4. Conditions météo" icon="🌤️">
          <div className="grid grid-cols-2 gap-3">
            <NumberField label="Température" value={temperature} onChange={setTemperature} unit="°C" step={0.5} />
            <NumberField label="Humidité" value={humidite} onChange={setHumidite} unit="%" />
          </div>
          <SelectField label="Vent" value={vent} onChange={setVent} options={[...VENT_OPTIONS]} />
          <SelectField label="Couvert" value={couvert} onChange={setCouvert} options={[...METEO_OPTIONS]} />
        </Section>

        {/* ===== 5. Type application ===== */}
        <Section title="5. Type d'application" icon="🚜">
          <div className="grid grid-cols-1 gap-2">
            {TYPES_APPLICATION.map(t => (
              <button key={t.code} type="button" onClick={() => setTypeApplication(t.code)}
                className={`text-left px-4 py-3 rounded-xl border transition-all ${typeApplication === t.code ? "border-amber-500 bg-amber-50 ring-2 ring-amber-500/20" : "border-gray-200 hover:border-amber-300"}`}>
                <span className="text-sm font-medium">{t.label}</span>
              </button>
            ))}
          </div>
        </Section>

        {/* ===== 6. Options ===== */}
        <Section title="6. Options" icon="🔍">
          <label className="flex items-center gap-3 cursor-pointer py-2">
            <input type="checkbox" checked={prelevementSol} onChange={e => setPrelevementSol(e.target.checked)} className="w-5 h-5 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500" />
            <span className="text-sm font-medium">🧪 Prélèvement sol effectué</span>
          </label>
        </Section>

        {/* ===== 7. Détail par modalité/rang ===== */}
        {rangTraitData.length > 0 && (
          <Section title="7. Contrôle par rang" icon="📊" defaultOpen={true}>
            <p className="text-xs text-gray-500 mb-2">Pour chaque rang traité, saisissez le volume préparé et restant. Le dosage réel est calculé automatiquement.</p>
            <div className="space-y-3">
              {rangTraitData.map((r, i) => {
                if (r.temoin) return (
                  <div key={r.rang} className="bg-gray-50 rounded-xl px-3 py-2 text-xs text-gray-500 italic flex items-center gap-2">
                    <span className="font-bold bg-gray-200 px-2 py-0.5 rounded">R{r.rang}</span> Témoin — pas de traitement
                  </div>
                );
                const p1Applied = (r.p1_volume_prepare && r.p1_volume_restant != null) ? r.p1_volume_prepare - r.p1_volume_restant : null;
                const p1Dosage = (p1Applied && surfaceRang) ? Math.round(p1Applied / surfaceRang * 10) / 10 : null;
                const p2Applied = (r.p2_volume_prepare && r.p2_volume_restant != null) ? r.p2_volume_prepare - r.p2_volume_restant : null;
                const p2Dosage = (p2Applied && surfaceRang) ? Math.round(p2Applied / surfaceRang * 10) / 10 : null;
                return (
                  <div key={r.rang} className="bg-white border border-gray-200 rounded-xl p-3 space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-lg">R{r.rang}</span>
                        <span className="text-xs font-medium text-gray-700">{r.modalite_code}</span>
                      </div>
                      <select value={r.nb_produits} onChange={e => updateRangTrait(i, "nb_produits", Number(e.target.value))}
                        className="text-xs border border-gray-200 rounded-lg px-2 py-1">
                        <option value={1}>1 produit</option>
                        <option value={2}>2 produits</option>
                      </select>
                    </div>

                    {/* Produit 1 */}
                    <div className="bg-emerald-50/50 rounded-lg p-2 space-y-1.5">
                      <div className="text-[10px] font-semibold text-emerald-700">🧪 {r.produit1 || "Produit 1"}{r.dose1_lha && ` — ${r.dose1_lha}`}</div>
                      <div className="grid grid-cols-3 gap-2">
                        <NumberField label="Préparé (L)" value={r.p1_volume_prepare} onChange={v => updateRangTrait(i, "p1_volume_prepare", v)} step={0.5} />
                        <NumberField label="pH bouillie" value={r.p1_ph_bouillie} onChange={v => updateRangTrait(i, "p1_ph_bouillie", v)} step={0.1} />
                        <NumberField label="Restant (L)" value={r.p1_volume_restant} onChange={v => updateRangTrait(i, "p1_volume_restant", v)} step={0.5} />
                      </div>
                      {p1Applied != null && (
                        <div className="flex gap-2 text-[10px]">
                          <span className="bg-blue-50 text-blue-700 px-2 py-0.5 rounded">Appliqué : <strong>{p1Applied} L</strong></span>
                          {p1Dosage != null && <span className={`px-2 py-0.5 rounded ${Math.abs(p1Dosage - parseFloat(r.dose1_lha || "0")) < 20 ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700"}`}>Dosage : <strong>{p1Dosage} L/ha</strong></span>}
                        </div>
                      )}
                    </div>

                    {/* Produit 2 */}
                    {r.nb_produits === 2 && (
                      <div className="bg-amber-50/50 rounded-lg p-2 space-y-1.5">
                        <div className="text-[10px] font-semibold text-amber-700">🧪 {r.produit2 || "Produit 2"}{r.dose2_lha && ` — ${r.dose2_lha}`}</div>
                        <div className="grid grid-cols-3 gap-2">
                          <NumberField label="Préparé (L)" value={r.p2_volume_prepare} onChange={v => updateRangTrait(i, "p2_volume_prepare", v)} step={0.5} />
                          <NumberField label="pH bouillie" value={r.p2_ph_bouillie} onChange={v => updateRangTrait(i, "p2_ph_bouillie", v)} step={0.1} />
                          <NumberField label="Restant (L)" value={r.p2_volume_restant} onChange={v => updateRangTrait(i, "p2_volume_restant", v)} step={0.5} />
                        </div>
                        {p2Applied != null && (
                          <div className="flex gap-2 text-[10px]">
                            <span className="bg-blue-50 text-blue-700 px-2 py-0.5 rounded">Appliqué : <strong>{p2Applied} L</strong></span>
                            {p2Dosage != null && <span className={`px-2 py-0.5 rounded ${Math.abs(p2Dosage - parseFloat(r.dose2_lha || "0")) < 20 ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700"}`}>Dosage : <strong>{p2Dosage} L/ha</strong></span>}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </Section>
        )}

        {/* ===== 8. Notes ===== */}
        <Section title="8. Notes" icon="💬">
          <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={3} placeholder="Observations terrain, anomalies…"
            className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20" />
        </Section>

        <button type="submit" disabled={saving} className="w-full btn-secondary">
          {saving ? (
            <span className="flex items-center justify-center gap-2">
              <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              Enregistrement...
            </span>
          ) : "💾 Sauvegarder le traitement"}
        </button>
      </form>
    </div>
  );
}
