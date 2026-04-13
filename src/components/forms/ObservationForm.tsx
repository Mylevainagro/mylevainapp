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
import type { ValidationError, ObservationFormData } from "@/lib/types";
import {
  METEO_OPTIONS,
  VENT_OPTIONS,
  HUMIDITE_SOL_OPTIONS,
  LOCALISATION_OPTIONS,
  PROGRESSION_OPTIONS,
} from "@/lib/constants";
import { calcScorePlante, calcScoreSanitaire, calcScoreRendement } from "@/lib/scoring";
import { RendementFields } from "@/components/forms/RendementFields";
import { supabase } from "@/lib/supabase/client";

interface VignobleItem { id: string; nom: string; }
interface ParcelleItem { id: string; vignoble_id: string; nom: string; }
interface ModaliteItem { rang: number; modalite: string; description: string | null; surnageant_l: number; eau_l: number; volume_l: number; }

interface ObservationFormProps {
  initialData?: ObservationFormData;
}

export function ObservationForm({ initialData }: ObservationFormProps) {
  const today = new Date().toISOString().split("T")[0];
  const now = new Date().toTimeString().slice(0, 5);

  // Données dynamiques depuis Supabase
  const [vignoblesList, setVignoblesList] = useState<VignobleItem[]>([]);
  const [parcellesList, setParcellesList] = useState<ParcelleItem[]>([]);
  const [modalitesList, setModalitesList] = useState<ModaliteItem[]>([]);

  useEffect(() => {
    async function load() {
      const [v, p, m] = await Promise.all([
        supabase.from("vignobles").select("id, nom").order("nom"),
        supabase.from("parcelles").select("id, vignoble_id, nom").order("nom"),
        supabase.from("referentiel_modalites").select("*").eq("actif", true).order("rang"),
      ]);
      if (v.data) setVignoblesList(v.data);
      if (p.data) setParcellesList(p.data);
      if (m.data) setModalitesList(m.data);
    }
    load();
  }, []);

  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error"; visible: boolean }>({ message: "", type: "success", visible: false });
  const hideToast = useCallback(() => setToast((t) => ({ ...t, visible: false })), []);
  const [vignoble, setVignoble] = useState("");
  const [parcelleId, setParcelleId] = useState(initialData?.parcelle_id ?? "");
  const [rang, setRang] = useState<number>(initialData?.rang ?? 0);
  const [date, setDate] = useState(initialData?.date ?? today);
  const [heure, setHeure] = useState(initialData?.heure ?? now);

  // Météo
  const [meteo, setMeteo] = useState(initialData?.meteo ?? "");
  const [temperature, setTemperature] = useState<number | null>(initialData?.temperature ?? null);
  const [humidite, setHumidite] = useState<number | null>(initialData?.humidite ?? null);
  const [vent, setVent] = useState(initialData?.vent ?? "");
  const [pluieRecente, setPluieRecente] = useState(initialData?.pluie_recente === true ? "Oui" : initialData?.pluie_recente === false ? "Non" : "");
  const [dernierePluie, setDernierePluie] = useState(initialData?.derniere_pluie ?? "");
  const [humiditeSol, setHumiditeSol] = useState(initialData?.humidite_sol ?? "");

  // Traitement
  const [volumeApplique, setVolumeApplique] = useState<number | null>(initialData?.volume_applique_l ?? null);
  const [phSurnageant, setPhSurnageant] = useState<number | null>(initialData?.ph_surnageant ?? null);
  const [surnageantL, setSurnageantL] = useState<number | null>(initialData?.surnageant_l ?? null);
  const [eauL, setEauL] = useState<number | null>(initialData?.eau_l ?? null);
  const [cuivre, setCuivre] = useState(initialData?.cuivre === true ? "Oui" : initialData?.cuivre === false ? "Non" : "");
  const [dateSurnageant, setDateSurnageant] = useState(initialData?.date_surnageant ?? "");
  const [dateCuivre, setDateCuivre] = useState(initialData?.date_cuivre ?? "");

  // État plante
  const [vigueur, setVigueur] = useState<number | null>(initialData?.vigueur ?? null);
  const [croissance, setCroissance] = useState<number | null>(initialData?.croissance ?? null);
  const [homogeneite, setHomogeneite] = useState<number | null>(initialData?.homogeneite ?? null);
  const [couleurFeuilles, setCouleurFeuilles] = useState<number | null>(initialData?.couleur_feuilles ?? null);
  const [epaisseurFeuilles, setEpaisseurFeuilles] = useState<number | null>(initialData?.epaisseur_feuilles ?? null);
  const [turgescence, setTurgescence] = useState<number | null>(initialData?.turgescence ?? null);

  // Symptômes
  const [brulures, setBrulures] = useState<number | null>(initialData?.brulures ?? null);
  const [necroses, setNecroses] = useState<number | null>(initialData?.necroses ?? null);
  const [deformations, setDeformations] = useState<number | null>(initialData?.deformations ?? null);

  // Maladies
  const [mildiouPresence, setMildiouPresence] = useState<number | null>(initialData?.mildiou_presence ?? null);
  const [mildiouIntensite, setMildiouIntensite] = useState<number | null>(initialData?.mildiou_intensite ?? null);
  const [localisationMildiou, setLocalisationMildiou] = useState(initialData?.localisation_mildiou ?? "");
  const [progression, setProgression] = useState(initialData?.progression ?? "");
  const [pressionMildiou, setPressionMildiou] = useState<number | null>(initialData?.pression_mildiou ?? null);

  // Grappes
  const [nbGrappes, setNbGrappes] = useState<number | null>(initialData?.nb_grappes_par_cep ?? null);
  const [tailleGrappes, setTailleGrappes] = useState<number | null>(initialData?.taille_grappes ?? null);
  const [homogeneiteGrappes, setHomogeneiteGrappes] = useState<number | null>(initialData?.homogeneite_grappes ?? null);

  // Rendement
  const [nombreGrappes, setNombreGrappes] = useState<number | null>(initialData?.nombre_grappes ?? null);
  const [poidsMoyenGrappe, setPoidsMoyenGrappe] = useState<number | null>(initialData?.poids_moyen_grappe ?? null);
  const [rendementEstime, setRendementEstime] = useState<number | null>(initialData?.rendement_estime ?? null);
  const [rendementReel, setRendementReel] = useState<number | null>(initialData?.rendement_reel ?? null);

  // Notes
  const [commentaires, setCommentaires] = useState(initialData?.commentaires ?? "");

  // Photos
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

  // Parcelles disponibles selon le vignoble sélectionné
  const parcelles = vignoble ? parcellesList.filter(p => {
    const v = vignoblesList.find(vv => vv.nom === vignoble);
    return v && p.vignoble_id === v.id;
  }) : [];

  // Rangs disponibles
  const rangs = modalitesList.map(m => m.rang);

  // Auto-fill volumes quand on sélectionne un rang
  function handleRangChange(r: number) {
    setRang(r);
    const ref = modalitesList.find((m) => m.rang === r);
    if (ref) {
      setSurnageantL(ref.surnageant_l || null);
      setEauL(ref.eau_l || null);
      setVolumeApplique(ref.volume_l || null);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    // Validation via validateObservation
    const obsPartial = {
      parcelle_id: parcelleId,
      rang,
      date,
      temperature,
      humidite,
      vigueur,
      croissance,
      homogeneite,
      couleur_feuilles: couleurFeuilles,
      epaisseur_feuilles: epaisseurFeuilles,
      turgescence,
      brulures,
      necroses,
      deformations,
      mildiou_presence: mildiouPresence,
      mildiou_intensite: mildiouIntensite,
      pression_mildiou: pressionMildiou,
      taille_grappes: tailleGrappes,
      homogeneite_grappes: homogeneiteGrappes,
    } as Record<string, unknown>;

    const errors = validateObservation(obsPartial);
    if (errors.length > 0) {
      setValidationErrors(errors);
      // Scroll vers la première erreur
      const firstField = errors[0].champ;
      const el = document.querySelector(`[data-field="${firstField}"]`);
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "center" });
      }
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
      meteo: meteo || null,
      temperature,
      humidite,
      vent: vent || null,
      pluie_recente: pluieRecente === "Oui" ? true : pluieRecente === "Non" ? false : null,
      derniere_pluie: dernierePluie || null,
      humidite_sol: humiditeSol || null,
      volume_applique_l: volumeApplique,
      ph_surnageant: phSurnageant,
      surnageant_l: surnageantL,
      eau_l: eauL,
      cuivre: cuivre === "Oui" ? true : cuivre === "Non" ? false : null,
      date_surnageant: dateSurnageant || null,
      date_cuivre: dateCuivre || null,
      vigueur,
      croissance,
      homogeneite,
      couleur_feuilles: couleurFeuilles,
      epaisseur_feuilles: epaisseurFeuilles,
      turgescence,
      brulures,
      necroses,
      deformations,
      mildiou_presence: mildiouPresence,
      mildiou_intensite: mildiouIntensite,
      localisation_mildiou: localisationMildiou || null,
      progression: progression || null,
      pression_mildiou: pressionMildiou,
      nb_grappes_par_cep: nbGrappes,
      taille_grappes: tailleGrappes,
      homogeneite_grappes: homogeneiteGrappes,
      nombre_grappes: nombreGrappes,
      poids_moyen_grappe: poidsMoyenGrappe,
      rendement_estime: rendementEstime,
      rendement_reel: rendementReel,
      score_plante: calcScorePlante({ vigueur, croissance, homogeneite, couleur_feuilles: couleurFeuilles, epaisseur_feuilles: epaisseurFeuilles, turgescence } as any),
      score_sanitaire: calcScoreSanitaire({ brulures, necroses, deformations, mildiou_presence: mildiouPresence, pression_mildiou: pressionMildiou } as any),
      commentaires: commentaires || null,
    };

    const { data, error } = await supabase.from("observations").insert(obsData).select("id").single();

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

      {/* Identification */}
      <Section title="Identification" icon="📍" defaultOpen={true}>
        <SelectField label="Vignoble" value={vignoble} onChange={(v) => { setVignoble(v); setParcelleId(""); }} options={vignoblesList.map(v => v.nom)} />
        {parcelles.length > 0 && (
          <div data-field="parcelle_id">
            <SelectField label="Parcelle" value={parcelleId} onChange={(v) => { setParcelleId(v); clearError("parcelle_id"); }} options={parcelles.map(p => p.id)} />
            <ValidationMessage message={errorFor("parcelle_id")} />
          </div>
        )}
        {parcelles.length > 0 && (
          <p className="text-xs text-gray-400">
            {parcelles.find(p => p.id === parcelleId)?.nom ?? ""}
          </p>
        )}
        <div data-field="rang">
          <SelectField label="Rang" value={rang ? String(rang) : ""} onChange={(v) => { handleRangChange(Number(v)); clearError("rang"); }} options={rangs.map(String)} />
          <ValidationMessage message={errorFor("rang")} />
        </div>
        {modalite && (
          <div className="bg-[#2d5016]/5 rounded-lg px-3 py-2 text-sm">
            <span className="font-medium text-[#2d5016]">Modalité :</span> {modalite}
            {modaliteRef && <span className="text-gray-500 ml-2">— {modaliteRef.description}</span>}
          </div>
        )}
        <div className="grid grid-cols-2 gap-3">
          <div className="flex flex-col gap-1" data-field="date">
            <label className="text-sm font-medium text-gray-700">Date</label>
            <input type="date" value={date} onChange={(e) => { setDate(e.target.value); clearError("date"); }} className={`border rounded-lg px-3 py-2 text-sm ${errorFor("date") ? "border-red-400" : "border-gray-200"}`} />
            <ValidationMessage message={errorFor("date")} />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-gray-700">Heure</label>
            <input type="time" value={heure} onChange={(e) => setHeure(e.target.value)} className="border border-gray-200 rounded-lg px-3 py-2 text-sm" />
          </div>
        </div>
      </Section>

      {/* Météo */}
      <Section title="Météo" icon="🌤️">
        <SelectField label="Météo" value={meteo} onChange={setMeteo} options={METEO_OPTIONS} />
        <div className="grid grid-cols-2 gap-3">
          <div data-field="temperature">
            <NumberField label="Température" value={temperature} onChange={(v) => { setTemperature(v); clearError("temperature"); }} unit="°C" step={0.5} />
            <ValidationMessage message={errorFor("temperature")} />
          </div>
          <div data-field="humidite">
            <NumberField label="Humidité" value={humidite} onChange={(v) => { setHumidite(v); clearError("humidite"); }} unit="%" />
            <ValidationMessage message={errorFor("humidite")} />
          </div>
        </div>
        <SelectField label="Vent" value={vent} onChange={setVent} options={VENT_OPTIONS} />
        <SelectField label="Pluie récente" value={pluieRecente} onChange={setPluieRecente} options={["Oui", "Non"]} />
        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-gray-700">Dernière pluie</label>
          <input type="date" value={dernierePluie} onChange={(e) => setDernierePluie(e.target.value)} className="border border-gray-200 rounded-lg px-3 py-2 text-sm" />
        </div>
        <div className="flex items-center gap-1">
          <SelectField label="Humidité sol" value={humiditeSol} onChange={setHumiditeSol} options={HUMIDITE_SOL_OPTIONS} />
          <HelpIcon codeIndicateur={INDICATEUR_MAPPING.humidite_sol} />
        </div>
      </Section>

      {/* Traitement */}
      <Section title="Traitement appliqué" icon="💧">
        <div className="grid grid-cols-3 gap-3">
          <NumberField label="Surnageant" value={surnageantL} onChange={setSurnageantL} unit="L" step={0.5} />
          <NumberField label="Eau" value={eauL} onChange={setEauL} unit="L" step={0.5} />
          <NumberField label="Volume total" value={volumeApplique} onChange={setVolumeApplique} unit="L" step={0.5} />
        </div>
        <NumberField label="pH surnageant" value={phSurnageant} onChange={setPhSurnageant} step={0.1} />
        <SelectField label="Cuivre" value={cuivre} onChange={setCuivre} options={["Oui", "Non"]} />
        <div className="grid grid-cols-2 gap-3">
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-gray-700">Date surnageant</label>
            <input type="date" value={dateSurnageant} onChange={(e) => setDateSurnageant(e.target.value)} className="border border-gray-200 rounded-lg px-3 py-2 text-sm" />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-gray-700">Date cuivre</label>
            <input type="date" value={dateCuivre} onChange={(e) => setDateCuivre(e.target.value)} className="border border-gray-200 rounded-lg px-3 py-2 text-sm" />
          </div>
        </div>
      </Section>

      {/* État plante */}
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
        <SliderNote label="Épaisseur feuilles" value={epaisseurFeuilles} onChange={(v) => { setEpaisseurFeuilles(v); clearError("epaisseur_feuilles"); }} />
        <ValidationMessage message={errorFor("epaisseur_feuilles")} />
        <SliderNote label="Turgescence" value={turgescence} onChange={(v) => { setTurgescence(v); clearError("turgescence"); }} />
        <ValidationMessage message={errorFor("turgescence")} />
      </Section>

      {/* Symptômes */}
      <Section title="Symptômes négatifs" icon="⚠️">
        <p className="text-xs text-gray-400">0 = aucun symptôme, 5 = très sévère</p>
        <SliderNote label="Brûlures" value={brulures} onChange={(v) => { setBrulures(v); clearError("brulures"); }} />
        <ValidationMessage message={errorFor("brulures")} />
        <SliderNote label="Nécroses" value={necroses} onChange={(v) => { setNecroses(v); clearError("necroses"); }} />
        <ValidationMessage message={errorFor("necroses")} />
        <SliderNote label="Déformations" value={deformations} onChange={(v) => { setDeformations(v); clearError("deformations"); }} />
        <ValidationMessage message={errorFor("deformations")} />
      </Section>

      {/* Maladies */}
      <Section title="Maladies" icon="🦠">
        <div className="flex items-center gap-1" data-field="mildiou_presence">
          <SliderNote label="Mildiou présence" value={mildiouPresence} onChange={(v) => { setMildiouPresence(v); clearError("mildiou_presence"); }} />
          <HelpIcon codeIndicateur={INDICATEUR_MAPPING.mildiou_presence} />
        </div>
        <ValidationMessage message={errorFor("mildiou_presence")} />
        <div className="flex items-center gap-1" data-field="mildiou_intensite">
          <NumberField label="Mildiou intensité" value={mildiouIntensite} onChange={(v) => { setMildiouIntensite(v); clearError("mildiou_intensite"); }} unit="%" max={100} />
          <HelpIcon codeIndicateur={INDICATEUR_MAPPING.mildiou_intensite} />
        </div>
        <ValidationMessage message={errorFor("mildiou_intensite")} />
        <SelectField label="Localisation" value={localisationMildiou} onChange={setLocalisationMildiou} options={LOCALISATION_OPTIONS} />
        <SelectField label="Progression" value={progression} onChange={setProgression} options={PROGRESSION_OPTIONS} />
        <div data-field="pression_mildiou">
          <SliderNote label="Pression mildiou" value={pressionMildiou} onChange={(v) => { setPressionMildiou(v); clearError("pression_mildiou"); }} max={3} />
          <ValidationMessage message={errorFor("pression_mildiou")} />
        </div>
      </Section>

      {/* Grappes */}
      <Section title="Grappes" icon="🍇">
        <NumberField label="Nb grappes / cep" value={nbGrappes} onChange={setNbGrappes} />
        <SliderNote label="Taille grappes" value={tailleGrappes} onChange={(v) => { setTailleGrappes(v); clearError("taille_grappes"); }} />
        <ValidationMessage message={errorFor("taille_grappes")} />
        <SliderNote label="Homogénéité grappes" value={homogeneiteGrappes} onChange={(v) => { setHomogeneiteGrappes(v); clearError("homogeneite_grappes"); }} />
        <ValidationMessage message={errorFor("homogeneite_grappes")} />
      </Section>

      {/* Rendement */}
      <Section title="Rendement" icon="📈">
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
      </Section>

      {/* Photos */}
      <Section title="Photos" icon="📸">
        <PhotoUpload photos={photos} onPhotosChange={setPhotos} />
      </Section>

      {/* Commentaires */}
      <Section title="Commentaires" icon="💬">
        <textarea
          value={commentaires}
          onChange={(e) => setCommentaires(e.target.value)}
          rows={3}
          placeholder="Notes libres, observations particulières..."
          className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#2d5016]/30"
        />
      </Section>

      {/* Scores calculés */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 px-4 py-3">
        <div className="text-sm font-medium mb-2">📊 Scores calculés</div>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="text-gray-500">Score plante :</span>{" "}
            <span className="font-bold text-[#2d5016]">
              {calcScorePlante({ vigueur, croissance, homogeneite, couleur_feuilles: couleurFeuilles, epaisseur_feuilles: epaisseurFeuilles, turgescence } as any) ?? "—"}
            </span>
            <span className="text-gray-400"> /5</span>
          </div>
          <div>
            <span className="text-gray-500">Score sanitaire :</span>{" "}
            <span className="font-bold text-[#2d5016]">
              {calcScoreSanitaire({ brulures, necroses, deformations, mildiou_presence: mildiouPresence, pression_mildiou: pressionMildiou } as any) ?? "—"}
            </span>
            <span className="text-gray-400"> /5</span>
          </div>
          <div>
            <span className="text-gray-500">Score rendement :</span>{" "}
            <span className="font-bold text-[#2d5016]">
              {calcScoreRendement({ rendement_estime: rendementEstime, rendement_reel: rendementReel }) ?? "—"}
            </span>
            <span className="text-gray-400"> /5</span>
          </div>
        </div>
      </div>

      {/* Submit */}
      <button
        type="submit"
        disabled={saving}
        className="w-full bg-[#2d5016] text-white rounded-xl py-4 font-semibold text-lg shadow-md hover:bg-[#4a7c28] disabled:opacity-50 transition-colors"
      >
        {saving ? "Enregistrement..." : "💾 Sauvegarder l'observation"}
      </button>
    </form>
  );
}
