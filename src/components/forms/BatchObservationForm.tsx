"use client";

import { useCallback, useEffect, useState } from "react";
import { Section } from "@/components/ui/Section";
import { SliderNote } from "@/components/ui/SliderNote";
import { SelectField } from "@/components/ui/SelectField";
import { NumberField } from "@/components/ui/NumberField";
import { Toast } from "@/components/Toast";
import { STADES_BBCH } from "@/lib/constants";
import { supabase } from "@/lib/supabase/client";
import { validateBatch, prepareBatchRecords } from "@/lib/batch";
import type { BatchRangInput, SharedFields, BatchResult } from "@/lib/batch";
import type { Note05, ValidationError } from "@/lib/types";

interface VignobleItem { id: string; nom: string }
interface ParcelleItem { id: string; vignoble_id: string; nom: string }
interface ModaliteItem { rang: number; modalite: string; description: string | null }

interface RangData {
  rang: number;
  modalite: string;
  description: string | null;
  vigueur: Note05 | null;
  commentaires: string;
}

function defaultRangData(m: ModaliteItem): RangData {
  return {
    rang: m.rang,
    modalite: m.modalite,
    description: m.description,
    vigueur: null,
    commentaires: "",
  };
}

export function BatchObservationForm() {
  const today = new Date().toISOString().split("T")[0];
  const now = new Date().toTimeString().slice(0, 5);

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

  // Shared fields v2
  const [vignoble, setVignoble] = useState("");
  const [parcelleId, setParcelleId] = useState("");
  const [date, setDate] = useState(today);
  const [heure, setHeure] = useState(now);
  const [stadeBbch, setStadeBbch] = useState("");
  const [repetition, setRepetition] = useState<number | null>(null);

  // Per-rang data
  const [rangs, setRangs] = useState<RangData[]>([]);
  const [rangErrors, setRangErrors] = useState<Record<number, ValidationError[]>>({});

  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error"; visible: boolean }>({
    message: "", type: "success", visible: false,
  });
  const hideToast = useCallback(() => setToast((t) => ({ ...t, visible: false })), []);

  const parcelles = vignoble
    ? parcellesList.filter((p) => {
        const v = vignoblesList.find((vv) => vv.nom === vignoble);
        return v && p.vignoble_id === v.id;
      })
    : [];

  function updateRang(index: number, field: keyof RangData, value: unknown) {
    setRangs((prev) => prev.map((r, i) => (i === index ? { ...r, [field]: value } : r)));
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
      stade_bbch: stadeBbch || null,
      repetition,
    };
  }

  function toBatchRangInputs(): BatchRangInput[] {
    return rangs.map((r) => ({
      rang: r.rang,
      modalite: r.modalite,
      vigueur: r.vigueur,
      commentaires: r.commentaires || null,
    }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    const shared = buildSharedFields();
    const batchInputs = toBatchRangInputs();
    const result: BatchResult = validateBatch(batchInputs, shared);

    const errMap: Record<number, ValidationError[]> = {};
    for (const err of result.errors) {
      errMap[err.rang] = err.errors;
    }
    setRangErrors(errMap);

    if (result.submitted === 0) {
      setToast({
        message: `Aucun rang valide — ${result.errors.length} rang(s) en erreur`,
        type: "error",
        visible: true,
      });
      return;
    }

    setSaving(true);
    const records = prepareBatchRecords(batchInputs, shared);
    const { error } = await supabase.from("observations").insert(records);
    setSaving(false);

    if (error) {
      setToast({ message: "Erreur : " + error.message, type: "error", visible: true });
    } else {
      const errCount = result.errors.length;
      const msg = errCount > 0
        ? `${records.length} observations enregistrées, ${errCount} rang(s) en erreur`
        : `${records.length} observations enregistrées ✓`;
      setToast({ message: msg, type: "success", visible: true });
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  }

  function hasRangError(rang: number): boolean {
    return (rangErrors[rang]?.length ?? 0) > 0;
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <Toast message={toast.message} type={toast.type} visible={toast.visible} onClose={hideToast} />

      {/* Shared fields */}
      <Section title="Champs communs" icon="📋" defaultOpen={true}>
        <SelectField label="Site" value={vignoble} onChange={(v) => { setVignoble(v); setParcelleId(""); }} options={vignoblesList.map((v) => v.nom)} />
        {parcelles.length > 0 && (
          <SelectField label="Parcelle" value={parcelleId} onChange={setParcelleId} options={parcelles.map((p) => ({ value: p.id, label: p.nom }))} />
        )}
        <div className="grid grid-cols-2 gap-3">
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-gray-700">Date</label>
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="border border-gray-200 rounded-xl px-3 py-2.5 text-sm" />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-gray-700">Heure</label>
            <input type="time" value={heure} onChange={(e) => setHeure(e.target.value)} className="border border-gray-200 rounded-xl px-3 py-2.5 text-sm" />
          </div>
        </div>
        <SelectField
          label="Stade BBCH"
          value={stadeBbch}
          onChange={setStadeBbch}
          options={STADES_BBCH.map(s => ({ value: s.code, label: `${s.code} — ${s.label}` }))}
          placeholder="Sélectionner un stade"
        />
        <NumberField label="Répétition (placette)" value={repetition} onChange={setRepetition} min={1} max={10} />
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
            <div className="bg-red-50 border border-red-200 rounded-xl px-3 py-2 text-sm text-red-700 mb-2">
              {rangErrors[r.rang].map((err, j) => (
                <p key={j}>• {err.message} ({err.champ})</p>
              ))}
            </div>
          )}
          <div className="bg-emerald-50 rounded-xl px-3 py-2 text-sm mb-2">
            <span className="font-medium text-emerald-700">Modalité :</span> {r.modalite}
            {r.description && <span className="text-gray-500 ml-2">— {r.description}</span>}
          </div>
          <SliderNote label="Vigueur" value={r.vigueur} onChange={(v) => updateRang(i, "vigueur", v)} />
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-gray-700">Commentaires</label>
            <textarea
              value={r.commentaires}
              onChange={(e) => updateRang(i, "commentaires", e.target.value)}
              rows={2}
              placeholder="Notes pour ce rang..."
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
            />
          </div>
        </Section>
      ))}

      <button
        type="submit"
        disabled={saving || rangs.length === 0}
        className="w-full btn-primary"
      >
        {saving ? (
          <span className="flex items-center justify-center gap-2">
            <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            Enregistrement...
          </span>
        ) : (
          `💾 Sauvegarder les ${rangs.length} observations`
        )}
      </button>
    </form>
  );
}
