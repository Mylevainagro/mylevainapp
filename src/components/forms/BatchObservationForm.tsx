"use client";

import { useCallback, useEffect, useState } from "react";
import { Section } from "@/components/ui/Section";
import { SliderNote } from "@/components/ui/SliderNote";
import { SelectField } from "@/components/ui/SelectField";
import { NumberField } from "@/components/ui/NumberField";
import { Toast } from "@/components/Toast";
import { METEO_OPTIONS, VENT_OPTIONS, HUMIDITE_SOL_OPTIONS } from "@/lib/constants";
import { calcScorePlante, calcScoreSanitaire } from "@/lib/scoring";
import { supabase } from "@/lib/supabase/client";
import { validateBatch, prepareBatchRecords } from "@/lib/batch";
import type { BatchRangInput, SharedFields, BatchResult } from "@/lib/batch";
import type { Note05, Note03, ValidationError } from "@/lib/types";

interface VignobleItem { id: string; nom: string }
interface ParcelleItem { id: string; vignoble_id: string; nom: string }
interface ModaliteItem { rang: number; modalite: string; description: string | null }

interface RangData {
  rang: number;
  modalite: string;
  description: string | null;
  vigueur: Note05 | null;
  mildiou_presence: Note05 | null;
  mildiou_intensite: number | null;
  pression_mildiou: Note03 | null;
  commentaires: string;
}

function defaultRangData(m: ModaliteItem): RangData {
  return {
    rang: m.rang,
    modalite: m.modalite,
    description: m.description,
    vigueur: null,
    mildiou_presence: null,
    mildiou_intensite: null,
    pression_mildiou: null,
    commentaires: "",
  };
}

export function BatchObservationForm() {
  const today = new Date().toISOString().split("T")[0];
  const now = new Date().toTimeString().slice(0, 5);

  // Reference data from Supabase
  const [vignoblesList, setVignoblesList] = useState<VignobleItem[]>([]);
  const [parcellesList, setParcellesList] = useState<ParcelleItem[]>([]);
  useEffect(() => {
    async function load() {
      const [v, p, m] = await Promise.all([
        supabase.from("vignobles").select("id, nom").order("nom"),
        supabase.from("parcelles").select("id, vignoble_id, nom").order("nom"),
        supabase.from("referentiel_modalites").select("rang, modalite, description").eq("actif", true).order("rang"),
      ]);
      if (v.data) setVignoblesList(v.data);
      if (p.data) setParcellesList(p.data);
      if (m.data) setRangs(m.data.map(defaultRangData));
    }
    load();
  }, []);

  // Shared fields
  const [vignoble, setVignoble] = useState("");
  const [parcelleId, setParcelleId] = useState("");
  const [date, setDate] = useState(today);
  const [heure, setHeure] = useState(now);
  const [meteo, setMeteo] = useState("");
  const [temperature, setTemperature] = useState<number | null>(null);
  const [humidite, setHumidite] = useState<number | null>(null);
  const [vent, setVent] = useState("");
  const [humiditeSol, setHumiditeSol] = useState("");

  // Per-rang data
  const [rangs, setRangs] = useState<RangData[]>([]);

  // Validation errors per rang
  const [rangErrors, setRangErrors] = useState<Record<number, ValidationError[]>>({});

  // UI state
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error"; visible: boolean }>({
    message: "", type: "success", visible: false,
  });
  const hideToast = useCallback(() => setToast((t) => ({ ...t, visible: false })), []);

  // Filtered parcelles by vignoble
  const parcelles = vignoble
    ? parcellesList.filter((p) => {
        const v = vignoblesList.find((vv) => vv.nom === vignoble);
        return v && p.vignoble_id === v.id;
      })
    : [];

  function updateRang(index: number, field: keyof RangData, value: unknown) {
    setRangs((prev) => prev.map((r, i) => (i === index ? { ...r, [field]: value } : r)));
    // Clear errors for this rang when user edits
    const rang = rangs[index];
    if (rang && rangErrors[rang.rang]) {
      setRangErrors((prev) => {
        const next = { ...prev };
        delete next[rang.rang];
        return next;
      });
    }
  }

  function buildSharedFields(): SharedFields {
    const mois = date ? new Date(date).toLocaleString("fr-FR", { month: "long" }) : "";
    return {
      parcelle_id: parcelleId,
      date,
      heure,
      mois,
      meteo: meteo || null,
      temperature,
      humidite,
      vent: vent || null,
      humidite_sol: humiditeSol || null,
    };
  }

  function toBatchRangInputs(): BatchRangInput[] {
    return rangs.map((r) => ({
      rang: r.rang,
      modalite: r.modalite,
      vigueur: r.vigueur,
      mildiou_presence: r.mildiou_presence,
      mildiou_intensite: r.mildiou_intensite,
      pression_mildiou: r.pression_mildiou,
      commentaires: r.commentaires || null,
    }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    const shared = buildSharedFields();
    const batchInputs = toBatchRangInputs();

    // Validate all rangs
    const result: BatchResult = validateBatch(batchInputs, shared);

    // Store errors per rang for display
    const errMap: Record<number, ValidationError[]> = {};
    for (const err of result.errors) {
      errMap[err.rang] = err.errors;
    }
    setRangErrors(errMap);

    // If ALL rangs are invalid, don't submit
    if (result.submitted === 0) {
      setToast({
        message: `Aucun rang valide — ${result.errors.length} rang(s) en erreur`,
        type: "error",
        visible: true,
      });
      return;
    }

    setSaving(true);

    // Prepare only valid records
    const records = prepareBatchRecords(batchInputs, shared).map((r) => ({
      ...r,
      score_plante: calcScorePlante({ vigueur: r.vigueur } as any),
      score_sanitaire: calcScoreSanitaire({
        mildiou_presence: r.mildiou_presence,
        pression_mildiou: r.pression_mildiou,
      } as any),
    }));

    const { error } = await supabase.from("observations").insert(records);
    setSaving(false);

    if (error) {
      setToast({ message: "Erreur : " + error.message, type: "error", visible: true });
    } else {
      const errCount = result.errors.length;
      const msg = errCount > 0
        ? `${records.length} observations enregistrées, ${errCount} rang(s) en erreur`
        : `${records.length} observations enregistrées ✓`;
      setToast({ message: msg, type: errCount > 0 ? "success" : "success", visible: true });
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  }

  /** Check if a rang has validation errors */
  function hasRangError(rang: number): boolean {
    return (rangErrors[rang]?.length ?? 0) > 0;
  }

  /** Get error message for a specific field on a rang */
  function getRangFieldError(rang: number, champ: string): string | undefined {
    return rangErrors[rang]?.find((e) => e.champ === champ)?.message;
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <Toast message={toast.message} type={toast.type} visible={toast.visible} onClose={hideToast} />

      {/* Shared fields */}
      <Section title="Champs communs" icon="📋" defaultOpen={true}>
        <SelectField label="Vignoble" value={vignoble} onChange={(v) => { setVignoble(v); setParcelleId(""); }} options={vignoblesList.map((v) => v.nom)} />
        {parcelles.length > 0 && (
          <SelectField label="Parcelle" value={parcelleId} onChange={setParcelleId} options={parcelles.map((p) => p.id)} />
        )}
        {parcelles.length > 0 && (
          <p className="text-xs text-gray-400">{parcelles.find((p) => p.id === parcelleId)?.nom ?? ""}</p>
        )}
        <div className="grid grid-cols-2 gap-3">
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-gray-700">Date</label>
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="border border-gray-200 rounded-lg px-3 py-2 text-sm" />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-gray-700">Heure</label>
            <input type="time" value={heure} onChange={(e) => setHeure(e.target.value)} className="border border-gray-200 rounded-lg px-3 py-2 text-sm" />
          </div>
        </div>
      </Section>

      <Section title="Météo" icon="🌤️">
        <SelectField label="Météo" value={meteo} onChange={setMeteo} options={METEO_OPTIONS} />
        <div className="grid grid-cols-2 gap-3">
          <NumberField label="Température" value={temperature} onChange={setTemperature} unit="°C" step={0.5} />
          <NumberField label="Humidité" value={humidite} onChange={setHumidite} unit="%" />
        </div>
        <SelectField label="Vent" value={vent} onChange={setVent} options={VENT_OPTIONS} />
        <SelectField label="Humidité sol" value={humiditeSol} onChange={setHumiditeSol} options={HUMIDITE_SOL_OPTIONS} />
      </Section>

      {/* Per-rang sections */}
      {rangs.map((r, i) => (
        <Section
          key={r.rang}
          title={`Rang ${r.rang}${hasRangError(r.rang) ? " ⚠️" : ""}`}
          icon="🌱"
          defaultOpen={i === 0 || hasRangError(r.rang)}
        >
          {hasRangError(r.rang) && (
            <div className="bg-red-50 border border-red-200 rounded-lg px-3 py-2 text-sm text-red-700 mb-2">
              {rangErrors[r.rang].map((err, j) => (
                <p key={j}>• {err.message} ({err.champ})</p>
              ))}
            </div>
          )}
          <div className="bg-[#2d5016]/5 rounded-lg px-3 py-2 text-sm mb-2">
            <span className="font-medium text-[#2d5016]">Modalité :</span> {r.modalite}
            {r.description && <span className="text-gray-500 ml-2">— {r.description}</span>}
          </div>
          <SliderNote label="Vigueur" value={r.vigueur} onChange={(v) => updateRang(i, "vigueur", v)} />
          <SliderNote label="Mildiou présence" value={r.mildiou_presence} onChange={(v) => updateRang(i, "mildiou_presence", v)} />
          <NumberField label="Mildiou intensité" value={r.mildiou_intensite} onChange={(v) => updateRang(i, "mildiou_intensite", v)} unit="%" max={100} />
          <SliderNote label="Pression mildiou" value={r.pression_mildiou} onChange={(v) => updateRang(i, "pression_mildiou", v)} max={3} />
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-gray-700">Commentaires</label>
            <textarea
              value={r.commentaires}
              onChange={(e) => updateRang(i, "commentaires", e.target.value)}
              rows={2}
              placeholder="Notes pour ce rang..."
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#2d5016]/30"
            />
          </div>
        </Section>
      ))}

      {/* Submit */}
      <button
        type="submit"
        disabled={saving || rangs.length === 0}
        className="w-full bg-[#2d5016] text-white rounded-xl py-4 font-semibold text-lg shadow-md hover:bg-[#4a7c28] disabled:opacity-50 transition-colors"
      >
        {saving ? "Enregistrement..." : `💾 Sauvegarder les ${rangs.length} observations`}
      </button>
    </form>
  );
}
