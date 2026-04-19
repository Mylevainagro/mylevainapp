"use client";

import { useCallback, useEffect, useState } from "react";
import { Section } from "@/components/ui/Section";
import { SliderNote } from "@/components/ui/SliderNote";
import { SelectField } from "@/components/ui/SelectField";
import { NumberField } from "@/components/ui/NumberField";
import { Toast } from "@/components/Toast";
import { supabase } from "@/lib/supabase/client";

interface SiteItem { id: string; nom: string; }
interface ParcelleItem { id: string; site_id: string; vignoble_id: string; nom: string; }
interface PlacetteItem { id: string; parcelle_id: string; nom: string; nb_ceps: number; }
interface ModaliteOption { id: string; code: string; label: string; }
interface BbchOption { id: string; code: string; label: string; }

interface LotLine {
  key: string; // unique key for React
  identifiant: string; // "R1" or "Placette 1"
  modalite_id: string;
  dose: string;
  commentaire: string;
  // Observation fields
  vigueur: number | null;
  croissance: number | null;
  couleur_feuilles: number | null;
  turgescence: number | null;
  brulures: number | null;
  necroses: number | null;
  escargots: boolean;
  acariens: boolean;
  // Maladie rapide
  maladie_type: string;
  maladie_nb_feuilles: number | null;
  maladie_surface_pct: number | null;
  // Rendement
  nb_grappes: number | null;
  poids_moyen_grappe: number | null;
  poids_100_baies: number | null;
}

function emptyLine(identifiant: string): LotLine {
  return {
    key: `${identifiant}-${Date.now()}-${Math.random()}`,
    identifiant, modalite_id: "", dose: "", commentaire: "",
    vigueur: null, croissance: null, couleur_feuilles: null, turgescence: null,
    brulures: null, necroses: null, escargots: false, acariens: false,
    maladie_type: "", maladie_nb_feuilles: null, maladie_surface_pct: null,
    nb_grappes: null, poids_moyen_grappe: null, poids_100_baies: null,
  };
}

export function BatchObservationForm() {
  const today = new Date().toISOString().split("T")[0];

  // Ref data
  const [sites, setSites] = useState<SiteItem[]>([]);
  const [parcelles, setParcelles] = useState<ParcelleItem[]>([]);
  const [placettes, setPlacettes] = useState<PlacetteItem[]>([]);
  const [modalites, setModalites] = useState<ModaliteOption[]>([]);
  const [bbchStades, setBbchStades] = useState<BbchOption[]>([]);

  useEffect(() => {
    async function load() {
      const [s, p, pl, m, b] = await Promise.all([
        supabase.from("sites").select("id, nom").order("nom"),
        supabase.from("parcelles").select("id, site_id, vignoble_id, nom").order("nom"),
        supabase.from("placettes").select("id, parcelle_id, nom, nb_ceps").eq("actif", true).order("nom"),
        supabase.from("modalites_levain").select("id, code, label").eq("actif", true).order("ordre"),
        supabase.from("bbch_stades").select("id, code, label").eq("actif", true).order("ordre"),
      ]);
      if (s.data) setSites(s.data);
      if (p.data) setParcelles(p.data);
      if (pl.data) setPlacettes(pl.data);
      if (m.data) setModalites(m.data);
      if (b.data) setBbchStades(b.data);
    }
    load();
  }, []);

  // UI
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error"; visible: boolean }>({ message: "", type: "success", visible: false });
  const hideToast = useCallback(() => setToast(t => ({ ...t, visible: false })), []);

  // Étape 1 — Champs communs
  const [siteId, setSiteId] = useState("");
  const [parcelleId, setParcelleId] = useState("");
  const [date, setDate] = useState(today);
  const [stadeBbch, setStadeBbch] = useState("");
  const [operateur, setOperateur] = useState("");

  // Étape 2 — Config lot
  const [typeLot, setTypeLot] = useState<"rang" | "placette">("rang");
  const [nbLignes, setNbLignes] = useState(7);

  // Étape 3+4 — Lignes
  const [lines, setLines] = useState<LotLine[]>([]);
  const [expandedLine, setExpandedLine] = useState<number | null>(null);

  // Filtered data
  const filteredParcelles = siteId
    ? parcelles.filter(p => p.site_id === siteId || p.vignoble_id === siteId)
    : [];
  const filteredPlacettes = parcelleId
    ? placettes.filter(pl => pl.parcelle_id === parcelleId)
    : [];

  // Generate lines
  function genererLignes() {
    const newLines: LotLine[] = [];
    if (typeLot === "rang") {
      for (let i = 1; i <= nbLignes; i++) {
        const existing = lines.find(l => l.identifiant === `R${i}`);
        newLines.push(existing ?? emptyLine(`R${i}`));
      }
    } else {
      // Use actual placettes if available
      if (filteredPlacettes.length > 0) {
        for (const pl of filteredPlacettes) {
          const existing = lines.find(l => l.identifiant === pl.nom);
          newLines.push(existing ?? emptyLine(pl.nom));
        }
      } else {
        for (let i = 1; i <= nbLignes; i++) {
          const existing = lines.find(l => l.identifiant === `Placette ${i}`);
          newLines.push(existing ?? emptyLine(`Placette ${i}`));
        }
      }
    }
    setLines(newLines);
  }

  useEffect(() => {
    genererLignes();
  }, [nbLignes, typeLot, filteredPlacettes.length]);

  function updateLine(index: number, field: keyof LotLine, value: unknown) {
    setLines(prev => prev.map((l, i) => i === index ? { ...l, [field]: value } : l));
  }

  function addLine() {
    const id = typeLot === "rang" ? `R${lines.length + 1}` : `Placette ${lines.length + 1}`;
    setLines(prev => [...prev, emptyLine(id)]);
  }

  function removeLine(index: number) {
    setLines(prev => prev.filter((_, i) => i !== index));
  }

  function duplicateLine(index: number) {
    const source = lines[index];
    const id = typeLot === "rang" ? `R${lines.length + 1}` : `Placette ${lines.length + 1}`;
    setLines(prev => [...prev, { ...source, key: `${id}-${Date.now()}`, identifiant: id }]);
  }

  // Submit
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!parcelleId || !date) {
      setToast({ message: "Remplis au moins : parcelle et date", type: "error", visible: true });
      return;
    }
    const validLines = lines.filter(l => l.modalite_id);
    if (validLines.length === 0) {
      setToast({ message: "Au moins une ligne doit avoir une modalité", type: "error", visible: true });
      return;
    }

    setSaving(true);
    const sessionId = `lot-${Date.now()}`;

    // Insert all lines as observation_lots
    const records = validLines.map(l => ({
      session_id: sessionId,
      parcelle_id: parcelleId,
      rang: typeLot === "rang" ? l.identifiant : null,
      placette_id: typeLot === "placette" ? (filteredPlacettes.find(p => p.nom === l.identifiant)?.id ?? null) : null,
      modalite_id: l.modalite_id,
      date,
      stade_bbch: stadeBbch || null,
      vigueur: l.vigueur,
      croissance: l.croissance,
      couleur_feuilles: l.couleur_feuilles,
      turgescence: l.turgescence,
      brulures: l.brulures,
      necroses: l.necroses,
      escargots: l.escargots || false,
      acariens: l.acariens || false,
      maladie_type: l.maladie_type || null,
      maladie_nb_feuilles: l.maladie_nb_feuilles,
      maladie_surface_pct: l.maladie_surface_pct,
      nb_grappes: l.nb_grappes,
      poids_moyen_grappe: l.poids_moyen_grappe,
      poids_100_baies: l.poids_100_baies,
      dose: l.dose || null,
      commentaire: l.commentaire || null,
    }));

    const { error } = await supabase.from("observation_lots").insert(records);

    // Also insert into observations table for compatibility
    const obsRecords = validLines.map(l => ({
      parcelle_id: parcelleId,
      rang: typeLot === "rang" ? parseInt(l.identifiant.replace("R", "")) || 0 : 0,
      modalite: modalites.find(m => m.code === l.modalite_id)?.label ?? l.modalite_id,
      date,
      heure: new Date().toTimeString().slice(0, 5),
      mois: new Date(date).toLocaleString("fr-FR", { month: "long" }),
      stade_bbch: stadeBbch || null,
      placette_id: typeLot === "placette" ? (filteredPlacettes.find(p => p.nom === l.identifiant)?.id ?? null) : null,
      repetition: 1,
      vigueur: l.vigueur,
      croissance: l.croissance,
      couleur_feuilles: l.couleur_feuilles,
      turgescence: l.turgescence,
      brulures: l.brulures,
      necroses: l.necroses,
      escargots: l.escargots || null,
      acariens: l.acariens || null,
      nb_grappes_par_cep: l.nb_grappes,
      poids_moyen_grappe: l.poids_moyen_grappe,
      poids_100_baies: l.poids_100_baies,
      commentaires: l.commentaire || null,
    }));

    await supabase.from("observations").insert(obsRecords);

    setSaving(false);
    if (error) {
      setToast({ message: "Erreur : " + error.message, type: "error", visible: true });
    } else {
      setToast({ message: `${validLines.length} observations enregistrées ✓`, type: "success", visible: true });
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <Toast message={toast.message} type={toast.type} visible={toast.visible} onClose={hideToast} />

      {/* ===== Étape 1 — Champs communs ===== */}
      <Section title="1. Champs communs" icon="📋" defaultOpen={true}>
        <SelectField label="Site" value={siteId} onChange={v => { setSiteId(v); setParcelleId(""); }}
          options={sites.map(s => ({ value: s.id, label: s.nom }))} placeholder="Sélectionner un site" />
        {filteredParcelles.length > 0 && (
          <SelectField label="Parcelle" value={parcelleId} onChange={setParcelleId}
            options={filteredParcelles.map(p => ({ value: p.id, label: p.nom }))} placeholder="Sélectionner" />
        )}
        <div className="grid grid-cols-2 gap-3">
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-gray-700">Date</label>
            <input type="date" value={date} onChange={e => setDate(e.target.value)} className="border border-gray-200 rounded-xl px-3 py-2.5 text-sm" />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-gray-700">Opérateur</label>
            <input type="text" value={operateur} onChange={e => setOperateur(e.target.value)} placeholder="Nom" className="border border-gray-200 rounded-xl px-3 py-2.5 text-sm" />
          </div>
        </div>
        {bbchStades.length > 0 && (
          <SelectField label="Stade BBCH" value={stadeBbch} onChange={setStadeBbch}
            options={bbchStades.map(b => ({ value: b.code, label: `${b.code} — ${b.label}` }))} placeholder="Sélectionner un stade" />
        )}
      </Section>

      {/* ===== Étape 2 — Configuration lot ===== */}
      <Section title="2. Configuration du lot" icon="⚙️" defaultOpen={true}>
        <div className="flex gap-2 mb-3">
          <button type="button" onClick={() => setTypeLot("rang")}
            className={`flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all ${typeLot === "rang" ? "bg-emerald-600 text-white shadow-md" : "bg-gray-100 text-gray-600"}`}>
            Par rangs
          </button>
          <button type="button" onClick={() => setTypeLot("placette")}
            className={`flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all ${typeLot === "placette" ? "bg-emerald-600 text-white shadow-md" : "bg-gray-100 text-gray-600"}`}>
            Par placettes
          </button>
        </div>
        {typeLot === "rang" && (
          <NumberField label="Nombre de rangs" value={nbLignes} onChange={v => setNbLignes(v ?? 7)} min={1} max={50} />
        )}
        {typeLot === "placette" && filteredPlacettes.length === 0 && (
          <div className="bg-amber-50 rounded-xl px-3 py-2 text-xs text-amber-700">
            ℹ️ Aucune placette pour cette parcelle. Créez-en dans Admin ou utilisez le mode rang.
          </div>
        )}
        <p className="text-xs text-gray-400">{lines.length} ligne(s) générées</p>
      </Section>

      {/* ===== Étape 3+4 — Tableau de saisie ===== */}
      <Section title={`3. Saisie (${lines.length} lignes)`} icon="📝" defaultOpen={true}>
        <div className="space-y-2">
          {lines.map((line, i) => {
            const isExpanded = expandedLine === i;
            const hasData = line.modalite_id !== "";
            return (
              <div key={line.key} className={`rounded-xl border transition-all ${hasData ? "border-emerald-200 bg-emerald-50/30" : "border-gray-200 bg-gray-50"}`}>
                {/* Header */}
                <div className="flex items-center gap-2 px-3 py-2.5">
                  <span className="text-xs font-bold text-emerald-700 bg-emerald-100 px-2 py-1 rounded-lg shrink-0">{line.identifiant}</span>
                  <select value={line.modalite_id} onChange={e => updateLine(i, "modalite_id", e.target.value)}
                    className={`flex-1 border rounded-lg px-2 py-1.5 text-xs ${!line.modalite_id ? "border-red-300" : "border-gray-200"}`}>
                    <option value="">Modalité *</option>
                    {modalites.map(m => <option key={m.id} value={m.code}>{m.code} — {m.label}</option>)}
                  </select>
                  <button type="button" onClick={() => setExpandedLine(isExpanded ? null : i)}
                    className={`text-xs px-2 py-1 rounded-lg ${isExpanded ? "bg-emerald-600 text-white" : "bg-gray-200 text-gray-600"}`}>
                    {isExpanded ? "▲" : "▼"}
                  </button>
                  <button type="button" onClick={() => duplicateLine(i)} className="text-xs bg-blue-50 text-blue-600 px-2 py-1 rounded-lg" title="Dupliquer">📋</button>
                  <button type="button" onClick={() => removeLine(i)} className="text-xs bg-red-50 text-red-600 px-2 py-1 rounded-lg" title="Supprimer">✕</button>
                </div>

                {/* Expanded detail */}
                {isExpanded && (
                  <div className="px-3 pb-3 space-y-3 border-t border-gray-100 pt-3 animate-fadeIn">
                    <div className="grid grid-cols-2 gap-2">
                      <input type="text" value={line.dose} onChange={e => updateLine(i, "dose", e.target.value)} placeholder="Dose" className="border border-gray-200 rounded-lg px-2 py-1.5 text-xs" />
                      <input type="text" value={line.commentaire} onChange={e => updateLine(i, "commentaire", e.target.value)} placeholder="Commentaire" className="border border-gray-200 rounded-lg px-2 py-1.5 text-xs" />
                    </div>

                    {/* État plante */}
                    <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider">État plante</div>
                    <SliderNote label="Vigueur" value={line.vigueur} onChange={v => updateLine(i, "vigueur", v)} />
                    <SliderNote label="Croissance" value={line.croissance} onChange={v => updateLine(i, "croissance", v)} />
                    <SliderNote label="Couleur feuilles" value={line.couleur_feuilles} onChange={v => updateLine(i, "couleur_feuilles", v)} />
                    <SliderNote label="Turgescence" value={line.turgescence} onChange={v => updateLine(i, "turgescence", v)} />

                    {/* Symptômes */}
                    <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Symptômes</div>
                    <SliderNote label="Brûlures" value={line.brulures} onChange={v => updateLine(i, "brulures", v)} />
                    <SliderNote label="Nécroses" value={line.necroses} onChange={v => updateLine(i, "necroses", v)} />
                    <div className="flex gap-4">
                      <label className="flex items-center gap-2 text-xs cursor-pointer">
                        <input type="checkbox" checked={line.escargots} onChange={e => updateLine(i, "escargots", e.target.checked)} className="w-4 h-4 rounded text-emerald-600" />
                        🐌 Escargots
                      </label>
                      <label className="flex items-center gap-2 text-xs cursor-pointer">
                        <input type="checkbox" checked={line.acariens} onChange={e => updateLine(i, "acariens", e.target.checked)} className="w-4 h-4 rounded text-emerald-600" />
                        🕷️ Acariens
                      </label>
                    </div>

                    {/* Maladie rapide */}
                    <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Maladie (rapide)</div>
                    <div className="grid grid-cols-3 gap-2">
                      <select value={line.maladie_type} onChange={e => updateLine(i, "maladie_type", e.target.value)} className="border border-gray-200 rounded-lg px-2 py-1.5 text-xs">
                        <option value="">Aucune</option>
                        <option value="mildiou">Mildiou</option>
                        <option value="oidium">Oïdium</option>
                        <option value="botrytis">Botrytis</option>
                        <option value="black_rot">Black Rot</option>
                      </select>
                      <NumberField label="Feuilles /20" value={line.maladie_nb_feuilles} onChange={v => updateLine(i, "maladie_nb_feuilles", v)} min={0} max={20} />
                      <NumberField label="Surface %" value={line.maladie_surface_pct} onChange={v => updateLine(i, "maladie_surface_pct", v)} min={0} max={100} />
                    </div>

                    {/* Rendement */}
                    <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Rendement</div>
                    <div className="grid grid-cols-3 gap-2">
                      <NumberField label="Grappes" value={line.nb_grappes} onChange={v => updateLine(i, "nb_grappes", v)} />
                      <NumberField label="Poids moy. (g)" value={line.poids_moyen_grappe} onChange={v => updateLine(i, "poids_moyen_grappe", v)} />
                      <NumberField label="100 baies (g)" value={line.poids_100_baies} onChange={v => updateLine(i, "poids_100_baies", v)} />
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Actions */}
        <button type="button" onClick={addLine}
          className="w-full border-2 border-dashed border-gray-300 rounded-xl py-3 text-sm text-gray-500 hover:border-emerald-400 hover:text-emerald-600 transition-colors mt-2">
          + Ajouter une ligne
        </button>
      </Section>

      {/* Résumé */}
      {lines.length > 0 && (
        <div className="glass rounded-2xl p-4">
          <div className="text-xs font-semibold text-gray-600 mb-2">📊 Résumé</div>
          <div className="flex flex-wrap gap-1.5">
            {lines.map((l, i) => (
              <span key={i} className={`text-xs px-2 py-1 rounded-lg ${l.modalite_id ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-600"}`}>
                {l.identifiant} → {l.modalite_id || "?"}
              </span>
            ))}
          </div>
          <p className="text-xs text-gray-400 mt-2">{lines.filter(l => l.modalite_id).length} / {lines.length} lignes avec modalité</p>
        </div>
      )}

      <button type="submit" disabled={saving} className="w-full btn-primary">
        {saving ? (
          <span className="flex items-center justify-center gap-2">
            <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            Enregistrement...
          </span>
        ) : (
          `💾 Enregistrer ${lines.filter(l => l.modalite_id).length} observations`
        )}
      </button>
    </form>
  );
}
