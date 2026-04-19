"use client";

import { useParams } from "next/navigation";
import Link from "next/link";
import { useDemo } from "@/components/DemoProvider";
import { DEMO_VIGNOBLES, DEMO_PARCELLES, DEMO_ANALYSES, DEMO_PLACETTES, DEMO_OBSERVATIONS, DEMO_TRAITEMENTS } from "@/lib/demo-data";
import { DernierTraitementCard } from "@/components/traitements/DernierTraitementCard";

function AnalyseSolCard({ analyse }: { analyse: typeof DEMO_ANALYSES[0] }) {
  return (
    <div className="glass rounded-2xl p-4 space-y-2">
      <div className="flex justify-between items-center">
        <span className="text-sm font-semibold text-gray-700">🧪 Analyse sol — {analyse.phase}</span>
        <span className="text-xs text-gray-400">{analyse.date_prelevement}</span>
      </div>
      <div className="grid grid-cols-3 gap-2 text-xs">
        <div className="bg-emerald-50 rounded-lg p-2 text-center">
          <div className="font-bold text-emerald-700">{analyse.ph}</div>
          <div className="text-emerald-600">pH</div>
        </div>
        <div className="bg-amber-50 rounded-lg p-2 text-center">
          <div className="font-bold text-amber-700">{analyse.matiere_organique_pct}%</div>
          <div className="text-amber-600">MO</div>
        </div>
        <div className="bg-blue-50 rounded-lg p-2 text-center">
          <div className="font-bold text-blue-700">{analyse.score_sante_sol}/5</div>
          <div className="text-blue-600">Score sol</div>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2 text-xs">
        {analyse.cuivre_total != null && (
          <div className="flex justify-between py-1 border-b border-gray-50">
            <span className="text-gray-500">Cu total</span>
            <span className="font-medium">{analyse.cuivre_total} mg/kg</span>
          </div>
        )}
        {analyse.biomasse_microbienne != null && (
          <div className="flex justify-between py-1 border-b border-gray-50">
            <span className="text-gray-500">Biomasse</span>
            <span className="font-medium">{analyse.biomasse_microbienne}</span>
          </div>
        )}
      </div>
    </div>
  );
}

function formatDate(d: string | null): string {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("fr-FR", { day: "numeric", month: "short" });
}

export default function VignoblePage() {
  const { id } = useParams<{ id: string }>();
  const { isDemo } = useDemo();

  const demoSite = isDemo ? DEMO_VIGNOBLES.find((v) => v.id === id) : null;
  const demoParcelles = isDemo ? DEMO_PARCELLES.filter((p) => p.vignoble_id === id) : [];
  const demoAnalyses = isDemo ? DEMO_ANALYSES.filter((a) => demoParcelles.some(p => p.id === a.parcelle_id)) : [];
  const demoPlacettes = isDemo ? (DEMO_PLACETTES ?? []).filter((pl) => demoParcelles.some(p => p.id === pl.parcelle_id)) : [];

  // Last obs/trait dates per parcelle
  const lastObsDates: Record<string, string> = {};
  const lastTraitDates: Record<string, string> = {};
  if (isDemo) {
    for (const o of DEMO_OBSERVATIONS) {
      if (!lastObsDates[o.parcelle_id] || o.date > lastObsDates[o.parcelle_id]) lastObsDates[o.parcelle_id] = o.date;
    }
    for (const t of DEMO_TRAITEMENTS) {
      if (!lastTraitDates[t.parcelle_id] || t.date > lastTraitDates[t.parcelle_id]) lastTraitDates[t.parcelle_id] = t.date;
    }
  }

  const siteName = demoSite?.nom;
  const siteLocation = demoSite?.localisation;
  const siteType = demoSite?.appellation;

  if (!siteName) {
    return (
      <div className="text-center py-16">
        <div className="text-4xl mb-3">🔍</div>
        <p className="text-gray-400 mb-4">Site non trouvé</p>
        <Link href="/" className="text-sm text-emerald-600 font-medium hover:underline">← Retour</Link>
      </div>
    );
  }

  return (
    <div>
      <Link href="/" className="text-sm text-gray-500 hover:text-emerald-600">← Retour</Link>
      <h1 className="text-xl font-bold gradient-text mt-2 mb-1">{siteName}</h1>
      <p className="text-sm text-gray-500">{siteLocation}</p>
      {siteType && <p className="text-xs text-amber-600 font-medium mt-0.5">{siteType}</p>}

      {/* Parcelles */}
      <h2 className="text-lg font-bold text-gray-800 mt-6 mb-3">🌿 Parcelles</h2>
      <div className="space-y-3 mb-6">
        {demoParcelles.map((p) => {
          const parcellePlacettes = demoPlacettes.filter(pl => pl.parcelle_id === p.id);
          return (
            <div key={p.id} className="glass rounded-2xl p-4 space-y-2">
              <div className="flex justify-between items-start">
                <div>
                  <div className="font-medium text-gray-800">{p.nom}</div>
                  <div className="text-xs text-gray-500">
                    {p.cepage || p.variete || "—"}
                    {p.surface && ` · ${p.surface} ha`}
                    {p.sol && ` · ${p.sol}`}
                  </div>
                </div>
              </div>
              {/* Dernières dates */}
              <div className="flex gap-4 text-xs text-gray-500">
                <span>📝 Obs : <strong className="text-gray-700">{formatDate(lastObsDates[p.id])}</strong></span>
                <span>💧 Trait : <strong className="text-gray-700">{formatDate(lastTraitDates[p.id])}</strong></span>
              </div>
              {/* Placettes */}
              {parcellePlacettes.length > 0 && (
                <div className="mt-2 pt-2 border-t border-gray-100">
                  <div className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1">📌 Placettes</div>
                  <div className="flex flex-wrap gap-1.5">
                    {parcellePlacettes.map(pl => (
                      <span key={pl.id} className="text-[10px] bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-full">
                        {pl.nom} · {pl.nb_ceps} ceps{pl.modalite_id && ` · ${pl.modalite_id}`}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              {!isDemo && <DernierTraitementCard parcelleId={p.id} />}
            </div>
          );
        })}
        {demoParcelles.length === 0 && (
          <p className="text-sm text-gray-400">Aucune parcelle pour ce site</p>
        )}
      </div>

      {/* Analyses sol */}
      {demoAnalyses.length > 0 && (
        <>
          <h2 className="text-lg font-bold text-gray-800 mb-3">🧪 Analyses de sol</h2>
          <div className="space-y-3 mb-6">
            {demoAnalyses.map((a) => (
              <AnalyseSolCard key={a.id} analyse={a} />
            ))}
          </div>
        </>
      )}

      {/* Actions */}
      <div className="grid grid-cols-2 gap-3">
        <Link href="/observations/new" className="btn-primary text-center !py-3 !text-sm">📝 Observation</Link>
        <Link href="/traitements/new" className="btn-secondary text-center !py-3 !text-sm">💧 Traitement</Link>
        <Link href={`/vignobles/${id}/galerie`} className="glass rounded-2xl p-3 text-center text-sm font-medium text-emerald-700">📷 Galerie</Link>
        <Link href={`/vignobles/${id}/timeline`} className="glass rounded-2xl p-3 text-center text-sm font-medium text-emerald-700">📅 Timeline</Link>
      </div>
    </div>
  );
}
