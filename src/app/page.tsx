import Link from "next/link";
import { MODALITES_REF } from "@/lib/constants";

const VIGNOBLES = [
  { id: "a1000000-0000-0000-0000-000000000001", nom: "Piotte", localisation: "Bordeaux", appellation: null, emoji: "🍇" },
  { id: "a1000000-0000-0000-0000-000000000002", nom: "Pape Clément", localisation: "Pessac-Léognan", appellation: "Grand Cru Classé de Graves", emoji: "🏰" },
];

export default function HomePage() {
  return (
    <div>
      {/* Header */}
      <div className="text-center mb-6">
        <h1 className="text-2xl font-bold text-[#2d5016]">🍇 MyLevain Agro</h1>
        <p className="text-sm text-gray-500 mt-1">Campagne 2026 — Suivi terrain</p>
      </div>

      {/* Actions rapides */}
      <div className="grid grid-cols-2 gap-3 mb-6">
        <Link
          href="/observations/new"
          className="bg-[#2d5016] text-white rounded-2xl p-4 text-center font-medium shadow-sm active:scale-95 transition-transform"
        >
          <div className="text-2xl mb-1">📝</div>
          <div className="text-sm">Nouvelle observation</div>
        </Link>
        <Link
          href="/traitements/new"
          className="bg-[#8b5e3c] text-white rounded-2xl p-4 text-center font-medium shadow-sm active:scale-95 transition-transform"
        >
          <div className="text-2xl mb-1">💧</div>
          <div className="text-sm">Nouveau traitement</div>
        </Link>
      </div>

      {/* Vignobles */}
      <h2 className="text-lg font-semibold mb-3">Vignobles</h2>
      <div className="space-y-3 mb-6">
        {VIGNOBLES.map((v) => (
          <Link
            key={v.id}
            href={`/vignobles/${v.id}`}
            className="flex items-center gap-4 bg-white rounded-2xl p-4 shadow-sm border border-gray-100 active:bg-gray-50 transition-colors"
          >
            <div className="text-3xl">{v.emoji}</div>
            <div className="flex-1">
              <div className="font-semibold text-[#2d5016]">{v.nom}</div>
              <div className="text-sm text-gray-500">{v.localisation}</div>
              {v.appellation && (
                <div className="text-xs text-[#8b5e3c] mt-0.5">{v.appellation}</div>
              )}
            </div>
            <div className="text-gray-300 text-lg">›</div>
          </Link>
        ))}
      </div>

      {/* Protocole résumé */}
      <h2 className="text-lg font-semibold mb-3">Protocole — 7 rangs</h2>
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-[#2d5016]/5">
            <tr>
              <th className="text-left px-3 py-2.5 font-medium text-[#2d5016]">Rang</th>
              <th className="text-left px-3 py-2.5 font-medium text-[#2d5016]">Modalité</th>
              <th className="text-right px-3 py-2.5 font-medium text-[#2d5016]">Vol.</th>
            </tr>
          </thead>
          <tbody>
            {MODALITES_REF.map((m, i) => (
              <tr key={m.rang} className={i % 2 === 0 ? "bg-white" : "bg-gray-50/50"}>
                <td className="px-3 py-2.5">
                  <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-[#2d5016]/10 text-[#2d5016] text-xs font-bold">
                    {m.rang}
                  </span>
                </td>
                <td className="px-3 py-2.5">
                  <div className="font-medium text-xs">{m.modalite}</div>
                  <div className="text-[10px] text-gray-400">{m.description}</div>
                </td>
                <td className="px-3 py-2.5 text-right text-xs text-gray-500">
                  {m.volume_l > 0 ? `${m.volume_l}L` : "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Footer info */}
      <div className="text-center text-xs text-gray-400 mt-6 mb-4">
        Stock : 10L surnageant — 24L / passage
      </div>
    </div>
  );
}
