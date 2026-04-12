"use client";

import { useCallback, useState } from "react";
import { Section } from "@/components/ui/Section";
import { SliderNote } from "@/components/ui/SliderNote";
import { SelectField } from "@/components/ui/SelectField";
import { NumberField } from "@/components/ui/NumberField";
import { Toast } from "@/components/Toast";
import { PhotoUpload, UploadedPhoto, uploadPhotos } from "@/components/ui/PhotoUpload";
import {
  MODALITES_REF,
  VIGNOBLES,
  METEO_OPTIONS,
  VENT_OPTIONS,
  HUMIDITE_SOL_OPTIONS,
  LOCALISATION_OPTIONS,
  PROGRESSION_OPTIONS,
} from "@/lib/constants";
import { calcScorePlante, calcScoreSanitaire } from "@/lib/scoring";
import { supabase } from "@/lib/supabase/client";

const PARCELLES: Record<string, { id: string; nom: string }[]> = {
  Piotte: [{ id: "b1000000-0000-0000-0000-000000000001", nom: "Parcelle principale" }],
  "Pape Clément": [{ id: "b1000000-0000-0000-0000-000000000002", nom: "Parcelle test" }],
};

const RANGS = [1, 2, 3, 4, 5, 6, 7] as const;

export function ObservationForm() {
  const today = new Date().toISOString().split("T")[0];
  const now = new Date().toTimeString().slice(0, 5);

  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error"; visible: boolean }>({ message: "", type: "success", visible: false });
  const hideToast = useCallback(() => setToast((t) => ({ ...t, visible: false })), []);
  const [vignoble, setVignoble] = useState("");
  const [parcelleId, setParcelleId] = useState("");
  const [rang, setRang] = useState<number>(0);
  const [date, setDate] = useState(today);
  const [heure, setHeure] = useState(now);

  // Météo
  const [meteo, setMeteo] = useState("");
  const [temperature, setTemperature] = useState<number | null>(null);
  const [humidite, setHumidite] = useState<number | null>(null);
  const [vent, setVent] = useState("");
  const [pluieRecente, setPluieRecente] = useState("");
  const [dernierePluie, setDernierePluie] = useState("");
  const [humiditeSol, setHumiditeSol] = useState("");

  // Traitement
  const [volumeApplique, setVolumeApplique] = useState<number | null>(null);
  const [phSurnageant, setPhSurnageant] = useState<number | null>(null);
  const [surnageantL, setSurnageantL] = useState<number | null>(null);
  const [eauL, setEauL] = useState<number | null>(null);
  const [cuivre, setCuivre] = useState("");
  const [dateSurnageant, setDateSurnageant] = useState("");
  const [dateCuivre, setDateCuivre] = useState("");

  // État plante
  const [vigueur, setVigueur] = useState<number | null>(null);
  const [croissance, setCroissance] = useState<number | null>(null);
  const [homogeneite, setHomogeneite] = useState<number | null>(null);
  const [couleurFeuilles, setCouleurFeuilles] = useState<number | null>(null);
  const [epaisseurFeuilles, setEpaisseurFeuilles] = useState<number | null>(null);
  const [turgescence, setTurgescence] = useState<number | null>(null);

  // Symptômes
  const [brulures, setBrulures] = useState<number | null>(null);
  const [necroses, setNecroses] = useState<number | null>(null);
  const [deformations, setDeformations] = useState<number | null>(null);

  // Maladies
  const [mildiouPresence, setMildiouPresence] = useState<number | null>(null);
  const [mildiouIntensite, setMildiouIntensite] = useState<number | null>(null);
  const [localisationMildiou, setLocalisationMildiou] = useState("");
  const [progression, setProgression] = useState("");
  const [pressionMildiou, setPressionMildiou] = useState<number | null>(null);

  // Grappes
  const [nbGrappes, setNbGrappes] = useState<number | null>(null);
  const [tailleGrappes, setTailleGrappes] = useState<number | null>(null);
  const [homogeneiteGrappes, setHomogeneiteGrappes] = useState<number | null>(null);

  // Notes
  const [commentaires, setCommentaires] = useState("");

  // Photos
  const [photos, setPhotos] = useState<UploadedPhoto[]>([]);

  // Modalité auto-remplie selon le rang
  const modaliteRef = rang > 0 ? MODALITES_REF.find((m) => m.rang === rang) : null;
  const modalite = modaliteRef?.modalite ?? "";

  // Parcelles disponibles selon le vignoble sélectionné
  const parcelles = vignoble ? PARCELLES[vignoble] ?? [] : [];

  // Auto-fill volumes quand on sélectionne un rang
  function handleRangChange(r: number) {
    setRang(r);
    const ref = MODALITES_REF.find((m) => m.rang === r);
    if (ref) {
      setSurnageantL(ref.surnageant_l || null);
      setEauL(ref.eau_l || null);
      setVolumeApplique(ref.volume_l || null);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!parcelleId || !rang || !date) {
      setToast({ message: "Remplis au moins : parcelle, rang et date", type: "error", visible: true });
      return;
    }

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
        <SelectField label="Vignoble" value={vignoble} onChange={(v) => { setVignoble(v); setParcelleId(""); }} options={VIGNOBLES} />
        {parcelles.length > 0 && (
          <SelectField label="Parcelle" value={parcelleId} onChange={setParcelleId} options={parcelles.map(p => p.id)} />
        )}
        {parcelles.length > 0 && (
          <p className="text-xs text-gray-400">
            {parcelles.find(p => p.id === parcelleId)?.nom ?? ""}
          </p>
        )}
        <SelectField label="Rang" value={rang ? String(rang) : ""} onChange={(v) => handleRangChange(Number(v))} options={RANGS.map(String)} />
        {modalite && (
          <div className="bg-[#2d5016]/5 rounded-lg px-3 py-2 text-sm">
            <span className="font-medium text-[#2d5016]">Modalité :</span> {modalite}
            {modaliteRef && <span className="text-gray-500 ml-2">— {modaliteRef.description}</span>}
          </div>
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

      {/* Météo */}
      <Section title="Météo" icon="🌤️">
        <SelectField label="Météo" value={meteo} onChange={setMeteo} options={METEO_OPTIONS} />
        <div className="grid grid-cols-2 gap-3">
          <NumberField label="Température" value={temperature} onChange={setTemperature} unit="°C" step={0.5} />
          <NumberField label="Humidité" value={humidite} onChange={setHumidite} unit="%" />
        </div>
        <SelectField label="Vent" value={vent} onChange={setVent} options={VENT_OPTIONS} />
        <SelectField label="Pluie récente" value={pluieRecente} onChange={setPluieRecente} options={["Oui", "Non"]} />
        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-gray-700">Dernière pluie</label>
          <input type="date" value={dernierePluie} onChange={(e) => setDernierePluie(e.target.value)} className="border border-gray-200 rounded-lg px-3 py-2 text-sm" />
        </div>
        <SelectField label="Humidité sol" value={humiditeSol} onChange={setHumiditeSol} options={HUMIDITE_SOL_OPTIONS} />
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
        <SliderNote label="Vigueur" value={vigueur} onChange={setVigueur} />
        <SliderNote label="Croissance" value={croissance} onChange={setCroissance} />
        <SliderNote label="Homogénéité" value={homogeneite} onChange={setHomogeneite} />
        <SliderNote label="Couleur feuilles" value={couleurFeuilles} onChange={setCouleurFeuilles} />
        <SliderNote label="Épaisseur feuilles" value={epaisseurFeuilles} onChange={setEpaisseurFeuilles} />
        <SliderNote label="Turgescence" value={turgescence} onChange={setTurgescence} />
      </Section>

      {/* Symptômes */}
      <Section title="Symptômes négatifs" icon="⚠️">
        <p className="text-xs text-gray-400">0 = aucun symptôme, 5 = très sévère</p>
        <SliderNote label="Brûlures" value={brulures} onChange={setBrulures} />
        <SliderNote label="Nécroses" value={necroses} onChange={setNecroses} />
        <SliderNote label="Déformations" value={deformations} onChange={setDeformations} />
      </Section>

      {/* Maladies */}
      <Section title="Maladies" icon="🦠">
        <SliderNote label="Mildiou présence" value={mildiouPresence} onChange={setMildiouPresence} />
        <NumberField label="Mildiou intensité" value={mildiouIntensite} onChange={setMildiouIntensite} unit="%" max={100} />
        <SelectField label="Localisation" value={localisationMildiou} onChange={setLocalisationMildiou} options={LOCALISATION_OPTIONS} />
        <SelectField label="Progression" value={progression} onChange={setProgression} options={PROGRESSION_OPTIONS} />
        <SliderNote label="Pression mildiou" value={pressionMildiou} onChange={setPressionMildiou} max={3} />
      </Section>

      {/* Grappes */}
      <Section title="Grappes" icon="🍇">
        <NumberField label="Nb grappes / cep" value={nbGrappes} onChange={setNbGrappes} />
        <SliderNote label="Taille grappes" value={tailleGrappes} onChange={setTailleGrappes} />
        <SliderNote label="Homogénéité grappes" value={homogeneiteGrappes} onChange={setHomogeneiteGrappes} />
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
