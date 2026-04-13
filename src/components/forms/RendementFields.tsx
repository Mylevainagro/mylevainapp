"use client";

import { NumberField } from "@/components/ui/NumberField";

interface RendementFieldsProps {
  nombre_grappes: number | null;
  poids_moyen_grappe: number | null;
  rendement_estime: number | null;
  rendement_reel: number | null;
  onChangeNombreGrappes: (val: number | null) => void;
  onChangePoidsMoyenGrappe: (val: number | null) => void;
  onChangeRendementEstime: (val: number | null) => void;
  onChangeRendementReel: (val: number | null) => void;
}

export function RendementFields({
  nombre_grappes,
  poids_moyen_grappe,
  rendement_estime,
  rendement_reel,
  onChangeNombreGrappes,
  onChangePoidsMoyenGrappe,
  onChangeRendementEstime,
  onChangeRendementReel,
}: RendementFieldsProps) {
  return (
    <>
      <div className="grid grid-cols-2 gap-3">
        <NumberField
          label="Nb grappes"
          value={nombre_grappes}
          onChange={onChangeNombreGrappes}
          min={0}
        />
        <NumberField
          label="Poids moyen grappe"
          value={poids_moyen_grappe}
          onChange={onChangePoidsMoyenGrappe}
          unit="g"
          min={0}
          step={1}
        />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <NumberField
          label="Rendement estimé"
          value={rendement_estime}
          onChange={onChangeRendementEstime}
          unit="kg/ha"
          min={0}
          step={100}
        />
        <NumberField
          label="Rendement réel"
          value={rendement_reel}
          onChange={onChangeRendementReel}
          unit="kg/ha"
          min={0}
          step={100}
        />
      </div>
    </>
  );
}
