"use client";

import { useCallback, useEffect, useState } from "react";
import { Section } from "@/components/ui/Section";
import { SliderNote } from "@/components/ui/SliderNote";
import { SelectField } from "@/components/ui/SelectField";
import { NumberField } from "@/components/ui/NumberField";
import { Toast } from "@/components/Toast";
import { PhotoUpload, UploadedPhoto, uploadPhotos } from "@/components/ui/PhotoUpload";
import { HelpIcon } from "@/components/ui/HelpIcon";
import { ValidationMessage } from "@/components/ui/ValidationMessage";
import { validateObservation } from "@/lib/validation";
import { INDICATEUR_MAPPING } from "@/lib/guide-notation";
import type { ValidationError, ObservationFormData, TypeMaladie, ZoneMaladie } from "@/lib/types";
import {
  STADES_BBCH,
  TYPES_MALADIE,
  ZONES_MALADIE,
  NB_FEUILLES_ECHANTILLON,
  MODALITES_REF,
} from "@/lib/constants";
import { RendementFields } from "@/components/forms/RendementFields";
import { supabase } from "@/lib/supabase/client";

interface VignobleItem { id: string; nom: string; }
interface ParcelleItem { id: string; vignoble_id: string; nom: string; }
interface ModaliteItem { rang: number; modalite: string; description: string | null; surnageant_l: number; eau_l: number; volume_l: number; }
interface PlacetteItem { id: string; parcelle_id: string; modalite_id: string | null; nom: string; nb_ceps: number; description_position: string | null; pieds_marques: string | null; }

// Structure maladie v2 (Wilfried — 20 feuilles)
interface MaladieEntry {
  type: TypeMaladie;
  zone: ZoneMaladie;
  nb_feuilles_atteintes: number;
  surface_atteinte_pct: number;
}

interface ObservationFormProps {
  initialData?: ObservationFormData;
}

export function ObservationForm({ initialData }: ObservationFormProps) {
  const today = new Date().toISOString().split("T")[0];
  const now = new Date().toTimeString().slice(0, 5);

  // Données dynamiques
  const [vignoblesList, setVignoblesList] = useState<VignobleItem[]>([]);
  const [parcellesList, setParcellesList] = useState<ParcelleItem[]>([]);
  const [placettesList, setPlacettesList] = useState<PlacetteItem[]>([]);
  const [modalitesList, setModalitesList] = useState<ModaliteItem[]>(
    MODALITES_REF.map((m) => ({ ...m }))
  );

  useEffect(() => {
    async function load() {
      const [v, p, m, pl] = await Promise.all([
        supabase.from("sites").select("id, nom").order("nom"),
        supabase.from("parcelles").select("id, vignoble_id, site_id, nom").order("nom"),
        supabase.from("referentiel_modalites").select("*").eq("actif", true).order("rang"),
        supabase.from("placettes").select("*").eq("actif", true).order("nom"),
      ]);
      if (v.data) setVignoblesList(v.data);
      if (p.data) setParcellesList(p.data);
      if (m.data && m.data.length > 0) setModalitesList(m.data);
      if (pl.data) setPlacettesList(pl.data);
    }
    load();
  }, []);

  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error"; visible: boolean }>({ message: "", type: "success", visible: false });
  const hideToast = useCallback(() => setToast((t) => ({ ...t, visible: false })), []);

  // 1. Identification
  const [vignoble, setVignoble] = useState("");
  const [parcelleId, setParcelleId] = useState(initialData?.parcelle_id ?? "");
  const [rang, setRang] = useState<number>(initialData?.rang ?? 0);
  const [placetteId, setPlacetteId] = useState(initialData?.placette_id ?? "");
  const [date, setDate] = useState(initialData?.date ?? today);
  const [heure, setHeure] = useState(initialData?.heure ?? now);
  const [stadeBbch, setStadeBbch] = useState(initialData?.stade_bbch ?? "");
  const [repetition, setRepetition] = useState<number | null>(initialData?.repetition ?? null);

  // 2. État plante (sans épaisseur feuilles)
  const [vigueur, setVigueur] = useState<number | null>(initialData?.vigueur ?? null);
  const [croissance, setCroissance] = useState<number | null>(initialData?.croissance ?? null);
  const [homogeneite, setHomogeneite] = useState<number | null>(initialData?.homogeneite ?? null);
  const [couleurFeuilles, setCouleurFeuilles] = useState<number | null>(initialData?.couleur_feuilles ?? null);
  const [turgescence, setTurgescence] = useState<number | null>(initialData?.turgescence ?? null);

  // 3. Symptômes + ravageurs
  const [brulures, setBrulures] = useState<number | null>(initialData?.brulures ?? null);
  const [necroses, setNecroses] = useState<number | null>(initialData?.necroses ?? null);
  const [deformations, setDeformations] = useState<number | null>(initialData?.deformations ?? null);
  const [escargots, setEscargots] = useState<boolean>(initialData?.escargots ?? false);
  const [acariens, setAcariens] = useState<boolean>(initialData?.acariens ?? false);

  // 4. Maladies v2 (multi-maladie, 20 feuilles)
  const [maladies, setMaladies] = useState<MaladieEntry[]>([]);

  // 5. Grappes
  const [nbGrappes, setNbGrappes] = useState<number | null>(initialData?.nb_grappes_par_cep ?? null);
  const [tailleGrappes, setTailleGrappes] = useState<number | null>(initialData?.taille_grappes ?? null);
  const [homogeneiteGrappes, setHomogeneiteGrappes] = useState<number | null>(initialData?.homogeneite_grappes ?? null);

  // 6. Rendement (10 ceps marqués)
  const [nombreGrappes, setNombreGrappes] = useState<number | null>(initialData?.nombre_grappes ?? null);
  const [poidsMoyenGrappe, setPoidsMoyenGrappe] = useState<number | null>(initialData?.poids_moyen_grappe ?? null);
  const [poids100Baies, setPoids100Baies] = useState<number | null>(initialData?.poids_100_baies ?? null);
  const [rendementEstime, setRendementEstime] = useState<number | null>(initialData?.rendement_estime ?? null);
  const [rendementReel, setRendementReel] = useState<number | null>(initialData?.rendement_reel ?? null);

  // 7. Notes
  const [commentaires, setCommentaires] = useState(initialData?.commentaires ?? "");

  // 8. Photos
  const [photos, setPhotos] = useState<UploadedPhoto[]>([]);

  // Validation
  const [validationErrors, setValidationErrors] = useState<ValidationError[]>([]);
  const errorFor = (champ: string) => validationErrors.find(e => e.champ === champ)?.message;
  const clearError = (champ: string) => {
    setValidationErrors(prev => prev.filter(e => e.champ !== champ));
  };

  // Modalité auto-remplie selon le rang
  const modaliteRef = rang > 0 ? modalitesList.find((m) => m.rang === rang) : null;
  const modalite = modaliteRef?.modalite ?? "";

  // Parcelles filtrées par site
  const parcelles = vignoble ? parcellesList.filter(p => {
    const v = vignoblesList.find(vv => vv.nom === vignoble);
    return v && ((p as any).site_id === v.id || p.vignoble_id === v.id);
  }) : [];

  // Placettes filtrées par parcelle (et optionnellement par modalité)
  const placettes = parcelleId ? placettesList.filter(pl => pl.parcelle_id === parcelleId) : [];

  const rangs = modalitesList.map(m => m.rang);

  // ---- Maladies helpers ----
  function addMaladie() {
    setMaladies(prev => [...prev, { type: "mildiou", zone: "feuille", nb_feuilles_atteintes: 0, surface_atteinte_pct: 0 }]);
  }

  function updateMaladie(index: number, field: keyof MaladieEntry, value: string | number) {
    setMaladies(prev => prev.map((m, i) => i === index ? { ...m, [field]: value } : m));
  }

  function removeMaladie(index: number) {
    setMaladies(prev => prev.filter((_, i) => i !== index));
  }

  // ---- Submit ----
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    const obsPartial = {
      parcelle_id: parcelleId,
      rang,
      date,
      vigueur,
      croissance,
      homogeneite,
      couleur_feuilles: couleurFeuilles,
      turgescence,
      brulures,
      necroses,
      deformations,
      taille_grappes: tailleGrappes,
      homogeneite_grappes: homogeneiteGrappes,
    } as Record<string, unknown>;

    const errors = validateObservation(obsPartial);
    if (errors.length > 0) {
      setValidationErrors(errors);
      const firstField = errors[0].champ;
      const el = document.querySelector(`[data-field="${firstField}"]`);
      if (el) el.scrollIntoView({ behavior: "smooth", block: "center" });
      setToast({ message: "Corrige les erreurs avant de sauvegarder", type: "error", visible: true });
      return;
    }
    setValidationErrors([]);
    setSaving(true);

    const obsData = {
      parcelle_id: parcelleId,
      rang,
      modalite,
      date,
      heure,
      mois: new Date(date).toLocaleString("fr-FR", { month: "long" }),
      stade_bbch: stadeBbch || null,
      repetition,
      placette_id: placetteId || null,
      vigueur,
      croissance,
      homogeneite,
      couleur_feuilles: couleurFeuilles,
      turgescence,
      brulures,
      necroses,
      deformations,
      escargots: escargots || null,
      acariens: acariens || null,
      nb_grappes_par_cep: nbGrappes,
      taille_grappes: tailleGrappes,
      homogeneite_grappes: homogeneiteGrappes,
      nombre_grappes: nombreGrappes,
      poids_moyen_grappe: poidsMoyenGrappe,
      poids_100_baies: poids100Baies,
      rendement_estime: rendementEstime,
      rendement_reel: rendementReel,
      commentaires: commentaires || null,
    };

    const { data, error } = await supabase.from("observations").insert(obsData).select("id").single();

    // Insérer les maladies dans la table séparée
    if (!error && data && maladies.length > 0) {
      const maladiesData = maladies.map(m => ({
        observation_id: data.id,
        type: m.type,
        zone: m.zone,
        nb_feuilles_atteintes: m.nb_feuilles_atteintes,
        surface_atteinte_pct: m.surface_atteinte_pct,
      }));
      await supabase.from("maladies_observations").insert(maladiesData);
    }

    // Upload photos
    if (!error && data && photos.length > 0) {
      await uploadPhotos(photos, data.id);
    }

    setSaving(false);

    if (error) {
      setToast({ message: "Erreur : " + error.message, type: "error", visible: true });
    } else {
      setToast({ message: "Observation enregistrée ✓", type: "success", visible: true });
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <Toast message={toast.message} type={toast.type} visible={toast.visible} onClose={hideToast} />

      {/* ===== 1. Identification ===== */}
      <Section title="Identification" icon="📍" defaultOpen={true}>
        <SelectField label="Site" value={vignoble} onChange={(v) => { setVignoble(v); setParcelleId(""); setPlacetteId(""); }} options={vignoblesList.map(v => v.nom)} />
        {parcelles.length > 0 && (
          <div data-field="parcelle_id">
            <SelectField label="Parcelle" value={parcelleId} onChange={(v) => { setParcelleId(v); setPlacetteId(""); clearError("parcelle_id"); }} options={parcelles.map(p => ({ value: p.id, label: p.nom }))} />
            <ValidationMessage message={errorFor("parcelle_id")} />
          </div>
        )}
        <div data-field="rang">
          <SelectField label="Modalité (rang)" value={rang ? String(rang) : ""} onChange={(v) => { setRang(Number(v)); clearError("rang"); }} options={rangs.map(String)} />
          <ValidationMessage message={errorFor("rang")} />
        </div>
        {modalite && (
          <div className="bg-emerald-50 rounded-xl px-3 py-2 text-sm">
            <span className="font-medium text-emerald-700">Modalité :</span> {modalite}
            {modaliteRef && <span className="text-gray-500 ml-2">— {modaliteRef.description}</span>}
          </div>
        )}

        {/* Placette */}
        {placettes.length > 0 ? (
          <SelectField
            label="Placette"
            value={placetteId}
            onChange={setPlacetteId}
            options={placettes.map(pl => ({ value: pl.id, label: `${pl.nom} (${pl.nb_ceps} ceps)` }))}
            placeholder="Sélectionner une placette"
          />
        ) : parcelleId ? (
          <div className="bg-amber-50 rounded-xl px-3 py-2 text-xs text-amber-700">
            ℹ️ Aucune placette définie pour cette parcelle. Créez-en dans Admin.
          </div>
        ) : null}
        {placetteId && (() => {
          const pl = placettesList.find(p => p.id === placetteId);
          return pl ? (
            <div className="bg-blue-50 rounded-xl px-3 py-2 text-xs text-blue-700 space-y-0.5">
              <div><strong>{pl.nom}</strong> — {pl.nb_ceps} ceps</div>
              {pl.description_position && <div>📍 {pl.description_position}</div>}
              {pl.pieds_marques && <div>🏷️ Pieds : {pl.pieds_marques}</div>}
            </div>
          ) : null;
        })()}

        <NumberField label="Répétition (placette)" value={repetition} onChange={setRepetition} min={1} max={10} />
        <div className="grid grid-cols-2 gap-3">
          <div className="flex flex-col gap-1" data-field="date">
            <label className="text-sm font-medium text-gray-700">Date</label>
            <input type="date" value={date} onChange={(e) => { setDate(e.target.value); clearError("date"); }} className={`border rounded-xl px-3 py-2.5 text-sm ${errorFor("date") ? "border-red-400" : "border-gray-200"}`} />
            <ValidationMessage message={errorFor("date")} />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-gray-700">Heure</label>
            <input type="time" value={heure} onChange={(e) => setHeure(e.target.value)} className="border border-gray-200 rounded-xl px-3 py-2.5 text-sm" />
          </div>
        </div>
      </Section>

      {/* ===== 2. Stade BBCH ===== */}
      <Section title="Stade phénologique (BBCH)" icon="🌱">
        <p className="text-xs text-gray-400 mb-2">Sélectionnez le stade de développement de la vigne</p>
        <div className="grid grid-cols-1 gap-2">
          {STADES_BBCH.map((s) => (
            <button
              key={s.code}
              type="button"
              onClick={() => setStadeBbch(s.code)}
              className={`text-left px-4 py-3 rounded-xl border transition-all ${
                stadeBbch === s.code
                  ? "border-emerald-500 bg-emerald-50 ring-2 ring-emerald-500/20"
                  : "border-gray-200 hover:border-emerald-300 hover:bg-emerald-50/50"
              }`}
            >
              <div className="flex items-center gap-3">
                <span className={`text-xs font-bold px-2 py-1 rounded-lg ${
                  stadeBbch === s.code ? "bg-emerald-600 text-white" : "bg-gray-100 text-gray-600"
                }`}>
                  {s.code}
                </span>
                <div>
                  <div className="text-sm font-medium text-gray-800">{s.label}</div>
                  <div className="text-xs text-gray-500">{s.description}</div>
                </div>
              </div>
            </button>
          ))}
        </div>
      </Section>

      {/* ===== 3. État de la plante ===== */}
      <Section title="État de la plante" icon="🌿">
        <div className="flex items-center gap-1" data-field="vigueur">
          <SliderNote label="Vigueur" value={vigueur} onChange={(v) => { setVigueur(v); clearError("vigueur"); }} />
          <HelpIcon codeIndicateur={INDICATEUR_MAPPING.vigueur} />
        </div>
        <ValidationMessage message={errorFor("vigueur")} />
        <SliderNote label="Croissance" value={croissance} onChange={(v) => { setCroissance(v); clearError("croissance"); }} />
        <ValidationMessage message={errorFor("croissance")} />
        <SliderNote label="Homogénéité" value={homogeneite} onChange={(v) => { setHomogeneite(v); clearError("homogeneite"); }} />
        <ValidationMessage message={errorFor("homogeneite")} />
        <SliderNote label="Couleur feuilles" value={couleurFeuilles} onChange={(v) => { setCouleurFeuilles(v); clearError("couleur_feuilles"); }} />
        <ValidationMessage message={errorFor("couleur_feuilles")} />
        <SliderNote label="Turgescence" value={turgescence} onChange={(v) => { setTurgescence(v); clearError("turgescence"); }} />
        <ValidationMessage message={errorFor("turgescence")} />
      </Section>

      {/* ===== 4. Symptômes négatifs + ravageurs ===== */}
      <Section title="Symptômes négatifs" icon="⚠️">
        <p className="text-xs text-gray-400">0 = aucun symptôme, 5 = très sévère</p>
        <SliderNote label="Brûlures" value={brulures} onChange={(v) => { setBrulures(v); clearError("brulures"); }} />
        <ValidationMessage message={errorFor("brulures")} />
        <SliderNote label="Nécroses" value={necroses} onChange={(v) => { setNecroses(v); clearError("necroses"); }} />
        <ValidationMessage message={errorFor("necroses")} />
        <SliderNote label="Déformations" value={deformations} onChange={(v) => { setDeformations(v); clearError("deformations"); }} />
        <ValidationMessage message={errorFor("deformations")} />

        <div className="border-t border-gray-100 pt-3 mt-2">
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-2">Ravageurs</p>
          <div className="flex gap-4">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={escargots}
                onChange={(e) => setEscargots(e.target.checked)}
                className="w-5 h-5 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
              />
              <span className="text-sm">🐌 Escargots</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={acariens}
                onChange={(e) => setAcariens(e.target.checked)}
                className="w-5 h-5 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
              />
              <span className="text-sm">🕷️ Acariens</span>
            </label>
          </div>
        </div>
      </Section>

      {/* ===== 5. Maladies v2 (structure Wilfried — 20 feuilles) ===== */}
      <Section title="Maladies (sur 20 feuilles)" icon="🦠">
        <p className="text-xs text-gray-400 mb-2">
          Comptez sur {NB_FEUILLES_ECHANTILLON} feuilles. La fréquence (%) est calculée automatiquement.
        </p>

        {maladies.map((m, i) => (
          <div key={i} className="bg-gray-50 rounded-xl p-4 space-y-3 relative">
            <button
              type="button"
              onClick={() => removeMaladie(i)}
              className="absolute top-2 right-2 text-gray-400 hover:text-red-500 text-lg"
              aria-label="Supprimer cette maladie"
            >
              ✕
            </button>

            <div className="grid grid-cols-2 gap-3">
              <SelectField
                label="Type"
                value={m.type}
                onChange={(v) => updateMaladie(i, "type", v)}
                options={TYPES_MALADIE.map(t => ({ value: t.code, label: t.label }))}
              />
              <SelectField
                label="Zone"
                value={m.zone}
                onChange={(v) => updateMaladie(i, "zone", v)}
                options={ZONES_MALADIE.map(z => ({ value: z.code, label: z.label }))}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <NumberField
                label={`Feuilles atteintes (/${NB_FEUILLES_ECHANTILLON})`}
                value={m.nb_feuilles_atteintes}
                onChange={(v) => updateMaladie(i, "nb_feuilles_atteintes", v ?? 0)}
                min={0}
                max={NB_FEUILLES_ECHANTILLON}
              />
              <NumberField
                label="Surface atteinte (%)"
                value={m.surface_atteinte_pct}
                onChange={(v) => updateMaladie(i, "surface_atteinte_pct", v ?? 0)}
                min={0}
                max={100}
                unit="%"
              />
            </div>

            {/* Résultats auto-calculés */}
            <div className="flex gap-4 text-xs">
              <span className="bg-amber-50 text-amber-700 px-2 py-1 rounded-lg">
                Fréquence : <strong>{((m.nb_feuilles_atteintes / NB_FEUILLES_ECHANTILLON) * 100).toFixed(1)}%</strong>
              </span>
              <span className="bg-red-50 text-red-700 px-2 py-1 rounded-lg">
                Intensité : <strong>{((m.nb_feuilles_atteintes / NB_FEUILLES_ECHANTILLON) * m.surface_atteinte_pct / 100 * 100).toFixed(1)}%</strong>
              </span>
            </div>
          </div>
        ))}

        <button
          type="button"
          onClick={addMaladie}
          className="w-full border-2 border-dashed border-gray-300 rounded-xl py-3 text-sm text-gray-500 hover:border-emerald-400 hover:text-emerald-600 transition-colors"
        >
          + Ajouter une maladie
        </button>
      </Section>

      {/* ===== 6. Grappes ===== */}
      <Section title="Grappes" icon="🍇">
        <NumberField label="Nb grappes / cep" value={nbGrappes} onChange={setNbGrappes} />
        <SliderNote label="Taille grappes" value={tailleGrappes} onChange={(v) => { setTailleGrappes(v); clearError("taille_grappes"); }} />
        <ValidationMessage message={errorFor("taille_grappes")} />
        <SliderNote label="Homogénéité grappes" value={homogeneiteGrappes} onChange={(v) => { setHomogeneiteGrappes(v); clearError("homogeneite_grappes"); }} />
        <ValidationMessage message={errorFor("homogeneite_grappes")} />
      </Section>

      {/* ===== 7. Rendement (10 ceps marqués) ===== */}
      <Section title="Rendement (10 ceps)" icon="📈">
        <p className="text-xs text-gray-400 mb-2">Mesures sur les 10 ceps marqués de la placette</p>
        <RendementFields
          nombre_grappes={nombreGrappes}
          poids_moyen_grappe={poidsMoyenGrappe}
          rendement_estime={rendementEstime}
          rendement_reel={rendementReel}
          onChangeNombreGrappes={setNombreGrappes}
          onChangePoidsMoyenGrappe={setPoidsMoyenGrappe}
          onChangeRendementEstime={setRendementEstime}
          onChangeRendementReel={setRendementReel}
        />
        <NumberField label="Poids 100 baies" value={poids100Baies} onChange={setPoids100Baies} unit="g" step={0.1} />
      </Section>

      {/* ===== 8. Photos ===== */}
      <Section title="Photos" icon="📸">
        <PhotoUpload photos={photos} onPhotosChange={setPhotos} />
      </Section>

      {/* ===== 9. Commentaires ===== */}
      <Section title="Commentaires" icon="💬">
        <textarea
          value={commentaires}
          onChange={(e) => setCommentaires(e.target.value)}
          rows={3}
          placeholder="Notes libres, observations particulières..."
          className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-400"
        />
      </Section>

      {/* ===== Submit ===== */}
      <button
        type="submit"
        disabled={saving}
        className="w-full btn-primary"
      >
        {saving ? (
          <span className="flex items-center justify-center gap-2">
            <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            Enregistrement...
          </span>
        ) : (
          "💾 Sauvegarder l'observation"
        )}
      </button>
    </form>
  );
}
