"use client";

import Link from "next/link";
import { useAuth } from "@/components/AuthProvider";
import { MODALITES_REF } from "@/lib/constants";

const VIGNOBLES = [
  { id: "a1000000-0000-0000-0000-000000000001", nom: "Piotte", localisation: "Bordeaux", appellation: null, emoji: "🍇" },
  { id: "a1000000-0000-0000-0000-000000000002", nom: "Pape Clément", localisation: "Pessac-Léognan", appellation: "Grand Cru Classé de Graves", emoji: "🏰" },
];

export default function HomePage() {
  const { user, logout } = useAuth();

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold gradient-text">MyLevain Agro</h1>
          <p className="text-sm text-gray-500 mt-0.5">Campagne 2026 — Suivi terrain</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="text-right">
            <p className="text-xs font-medium text-gray-700">{user?.nom}</p>
            <p className="text-[10px] text-gray-400">{user?.role === 'admin' ? '👑 Admin' : '👤 Opérateur'}</p>
          </div>
          <button
            onClick={logout}
            className="w-9 h-9 rounded-xl bg-gray-100 hover:bg-red-50 hover:text-red-600 flex items-center justify-center text-sm transition-colors"
            title="Déconnexion"
          >
            🚪
          </button>
        </div>
      </div>

      {/* Actions rapides */}
      <div className="grid grid-cols-2 gap-3 mb-6">
        <Link
          href="/observations/new"
          className="bg-gradient-to-br from-emerald-500 to-emerald-700 text-white rounded-2xl p-5 text-center font-medium shadow-lg shadow-emerald-200/40 active:scale-95 transition-all"
        >
          <div className="text-3xl mb-2">📝</div>
          <div className="text-sm font-semibold">Nouvelle observation</div>
        </Link>
        <Link
          href="/traitements/new"
          className="bg-gradient-to-br from-amber-500 to-amber-700 text-white rounded-2xl p-5 text-center font-medium shadow-lg shadow-amber-200/40 active:scale-95 transition-all"
        >
          <div className="text-3xl mb-2">💧</div>
          <div className="text-sm font-semibold">Nouveau traitement</div>
        </Link>
      </div>

      {/* Quick links */}
      <div className="grid grid-cols-3 gap-2 mb-6">
        <Link href="/observations/batch" className="glass rounded-2xl p-3 text-center active:scale-95 transition-all">
          <div className="text-xl mb-1">📋</div>
          <div className="text-[10px] font-medium text-gray-600">Saisie lot</div>
        </Link>
        <Link href="/export" className="glass rounded-2xl p-3 text-center active:scale-95 transition-all">
          <div className="text-xl mb-1">📥</div>
          <div className="text-[10px] font-medium text-gray-600">Export</div>
        </Link>
        <Link href="/rapport" className="glass rounded-2xl p-3 text-center active:scale-95 transition-all">
          <div className="text-xl mb-1">📄</div>
          <div className="text-[10px] font-medium text-gray-600">Rapport PDF</div>
        </Link>
      </div>

      {/* Vignobles */}
      <h2 className="text-lg font-bold text-gray-800 mb-3">Vignobles</h2>
      <div className="space-y-3 mb-6">
        {VIGNOBLES.map((v) => (
          <Link
            key={v.id}
            href={`/vignobles/${v.id}`}
            className="flex items-center gap-4 glass rounded-2xl p-4 active:scale-[0.98] transition-all"
          >
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-emerald-100 to-emerald-200 flex items-center justify-center text-2xl shadow-sm">
              {v.emoji}
            </div>
            <div className="flex-1">
              <div className="font-semibold text-gray-800">{v.nom}</div>
              <div className="text-sm text-gray-500">{v.localisation}</div>
              {v.appellation && (
                <div className="text-xs text-amber-600 mt-0.5 font-medium">{v.appellation}</div>
              )}
            </div>
            <div className="text-gray-300 text-lg">›</div>
          </Link>
        ))}
      </div>

      {/* Protocole résumé */}
      <h2 className="text-lg font-bold text-gray-800 mb-3">Protocole — 7 rangs</h2>
      <div className="glass rounded-2xl overflow-hidden mb-6">
        <table className="w-full text-sm">
          <thead className="bg-emerald-50/80">
            <tr>
              <th className="text-left px-4 py-3 font-semibold text-emerald-800 text-xs uppercase tracking-wide">Rang</th>
              <th className="text-left px-4 py-3 font-semibold text-emerald-800 text-xs uppercase tracking-wide">Modalité</th>
              <th className="text-right px-4 py-3 font-semibold text-emerald-800 text-xs uppercase tracking-wide">Vol.</th>
            </tr>
          </thead>
          <tbody>
            {MODALITES_REF.map((m, i) => (
              <tr key={m.rang} className={i % 2 === 0 ? "bg-white/40" : "bg-gray-50/40"}>
                <td className="px-4 py-3">
                  <span className="inline-flex items-center justify-center w-7 h-7 rounded-lg bg-emerald-100 text-emerald-700 text-xs font-bold">
                    {m.rang}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <div className="font-medium text-xs text-gray-800">{m.modalite}</div>
                  <div className="text-[10px] text-gray-400">{m.description}</div>
                </td>
                <td className="px-4 py-3 text-right text-xs text-gray-500 font-mono">
                  {m.volume_l > 0 ? `${m.volume_l}L` : "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Footer */}
      <div className="text-center text-xs text-gray-400 mb-4">
        MyLevain Agro Intelligence © 2026
      </div>
    </div>
  );
}
