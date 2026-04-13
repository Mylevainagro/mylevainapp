"use client";

import { useParams } from "next/navigation";
import Link from "next/link";
import { MODALITES_REF } from "@/lib/constants";
import { DernierTraitementCard } from "@/components/traitements/DernierTraitementCard";

const VIGNOBLES_DATA: Record<string, { nom: string; localisation: string; parcelles: { id: string; nom: string }[] }> = {
  "a1000000-0000-0000-0000-000000000001": {
    nom: "Piotte",
    localisation: "Bordeaux",
    parcelles: [{ id: "b1000000-0000-0000-0000-000000000001", nom: "Parcelle principale" }],
  },
  "a1000000-0000-0000-0000-000000000002": {
    nom: "Pape Clément",
    localisation: "Pessac-Léognan",
    parcelles: [{ id: "b1000000-0000-0000-0000-000000000002", nom: "Parcelle test" }],
  },
};

export default function VignoblePage() {
  const { id } = useParams<{ id: string }>();
  const vignoble = VIGNOBLES_DATA[id];

  if (!vignoble) {
    return <p className="text-center text-gray-400 py-8">Vignoble non trouvé</p>;
  }

  return (
    <div>
      <Link href="/" className="text-sm text-gray-500 hover:text-[#2d5016]">← Retour</Link>
      <h1 className="text-xl font-bold text-[#2d5016] mt-2 mb-1">{vignoble.nom}</h1>
      <p className="text-sm text-gray-500 mb-6">{vignoble.localisation}</p>

      {/* Parcelles */}
      <h2 className="text-lg font-semibold mb-3">Parcelles</h2>
      <div className="space-y-3 mb-6">
        {vignoble.parcelles.map((p) => (
          <div key={p.id} className="space-y-2">
            <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
              <div className="font-medium">{p.nom}</div>
              <div className="text-xs text-gray-500 mt-1">7 rangs — Protocole MyLevain</div>
            </div>
            <DernierTraitementCard parcelleId={p.id} />
          </div>
        ))}
      </div>

      {/* Référentiel rangs */}
      <h2 className="text-lg font-semibold mb-3">Protocole — 7 rangs</h2>
      <div className="space-y-2">
        {MODALITES_REF.map((m) => (
          <div key={m.rang} className="bg-white rounded-xl p-3 shadow-sm border border-gray-100 flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-[#2d5016] text-white flex items-center justify-center text-sm font-bold">
              {m.rang}
            </div>
            <div className="flex-1">
              <div className="font-medium text-sm">{m.modalite}</div>
              <div className="text-xs text-gray-500">{m.description}</div>
            </div>
            <div className="text-xs text-gray-400">
              {m.volume_l > 0 ? `${m.volume_l}L` : "—"}
            </div>
          </div>
        ))}
      </div>

      {/* Actions */}
      <div className="grid grid-cols-2 gap-3 mt-6">
        <Link href="/observations/new" className="bg-[#2d5016] text-white rounded-xl p-3 text-center text-sm font-medium">
          📝 Observation
        </Link>
        <Link href="/traitements/new" className="bg-[#8b5e3c] text-white rounded-xl p-3 text-center text-sm font-medium">
          💧 Traitement
        </Link>
        <Link href={`/vignobles/${id}/galerie`} className="bg-white text-[#2d5016] border border-[#2d5016] rounded-xl p-3 text-center text-sm font-medium">
          📷 Galerie photos
        </Link>
        <Link href={`/vignobles/${id}/timeline`} className="bg-white text-[#2d5016] border border-[#2d5016] rounded-xl p-3 text-center text-sm font-medium">
          📅 Timeline
        </Link>
      </div>
    </div>
  );
}
