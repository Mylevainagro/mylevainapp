"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { useDemo } from "@/components/DemoProvider";
import { DEMO_VIGNOBLES, DEMO_PARCELLES, DEMO_ANALYSES, DEMO_PLACETTES, DEMO_OBSERVATIONS, DEMO_TRAITEMENTS } from "@/lib/demo-data";
import { DernierTraitementCard } from "@/components/traitements/DernierTraitementCard";
import { supabase } from "@/lib/supabase/client";
import { ListSkeleton } from "@/components/Skeleton";

interface SiteData { id: string; nom: string; localisation: string | null; type_exploitation: string | null; adresse: string | null; }
interface ParcelleData { id: string; nom: string; variete: string | null; surface: number | null; sol: string | null; type_culture: string | null; }
interface PlacetteData { id: string; parcelle_id: string; nom: string; nb_ceps: number; modalite_id: string | null; }
interface AnalyseData { id: string; parcelle_id: string; date_prelevement: string; phase: string; ph: number | null; matiere_organique_pct: number | null; score_sante_sol: number | null; cuivre_total: number | null; biomasse_microbienne: number | null; }

function AnalyseSolCard({ analyse }: { analyse: AnalyseData }) {
  return (
    <div className="glass rounded-2xl p-4 space-y-2">
      <div className="flex justify-between items-center">
        <span className="text-sm font-semibold text-gray-700">🧪 {analyse.phase}</span>
        <span className="text-xs text-gray-400">{new Date(analyse.date_prelevement).toLocaleDateString("fr-FR")}</span>
      </div>
      <div className="grid grid-cols-3 gap-2 text-xs">
        {analyse.ph != null && <div className="bg-emerald-50 rounded-lg p-2 text-center"><div className="font-bold text-emerald-700">{analyse.ph}</div><div className="text-emerald-600">pH</div></div>}
        {analyse.matiere_organique_pct != null && <div className="bg-amber-50 rounded-lg p-2 text-center"><div className="font-bold text-amber-700">{analyse.matiere_organique_pct}%</div><div className="text-amber-600">MO</div></div>}
        {analyse.score_sante_sol != null && <div className="bg-blue-50 rounded-lg p-2 text-center"><div className="font-bold text-blue-700">{analyse.score_sante_sol}/5</div><div className="text-blue-600">Score sol</div></div>}
      </div>
    </div>
  );
}

function formatDate(d: string | null): string {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("fr-FR", { day: "numeric", month: "short" });
}

const TYPE_LABELS: Record<string, string> = { vignoble: "Vignoble", maraichage: "Maraîchage", grande_culture: "Grande culture", verger: "Verger", serre: "Serre", mixte: "Mixte" };

export default function VignoblePage() {
  const { id } = useParams<{ id: string }>();
  const { isDemo } = useDemo();
  const [loading, setLoading] = useState(!isDemo);
  const [site, setSite] = useState<SiteData | null>(null);
  const [parcelles, setParcelles] = useState<ParcelleData[]>([]);
  const [placettes, setPlacettes] = useState<PlacetteData[]>([]);
  const [analyses, setAnalyses] = useState<AnalyseData[]>([]);
  const [lastObsDates, setLastObsDates] = useState<Record<string, string>>({});
  const [lastTraitDates, setLastTraitDates] = useState<Record<string, string>>({});

  useEffect(() => {
    if (isDemo) {
      // Demo mode
      const demoSite = DEMO_VIGNOBLES.find((v) => v.id === id);
      if (demoSite) {
        setSite({ id: demoSite.id, nom: demoSite.nom, localisation: demoSite.localisation, type_exploitation: demoSite.type_site, adresse: null });
        const dp = DEMO_PARCELLES.filter((p) => p.vignoble_id === id);
        setParcelles(dp.map(p => ({ id: p.id, nom: p.nom, variete: (p as any).variete || p.cepage, surface: (p as any).surface || null, sol: (p as any).sol || null, type_culture: (p as any).type_culture || null })));
        setPlacettes((DEMO_PLACETTES ?? []).filter(pl => dp.some(p => p.id === pl.parcelle_id)));
        setAnalyses(DEMO_ANALYSES.filter(a => dp.some(p => p.id === a.parcelle_id)));
        const od: Record<string, string> = {};
        for (const o of DEMO_OBSERVATIONS) { if (!od[o.parcelle_id] || o.date > od[o.parcelle_id]) od[o.parcelle_id] = o.date; }
        setLastObsDates(od);
        const td: Record<string, string> = {};
        for (const t of DEMO_TRAITEMENTS) { if (!td[t.parcelle_id] || t.date > td[t.parcelle_id]) td[t.parcelle_id] = t.date; }
        setLastTraitDates(td);
      }
      return;
    }

    // Real mode — load from Supabase
    async function load() {
      // Load site
      const { data: siteData } = await supabase.from("sites").select("id, nom, localisation, type_exploitation, adresse").eq("id", id).single();
      if (siteData) {
        setSite(siteData);
      } else {
        // Fallback: try vignobles table
        const { data: vigData } = await supabase.from("vignobles").select("id, nom, localisation").eq("id", id).single();
        if (vigData) setSite({ ...vigData, type_exploitation: null, adresse: null });
      }

      // Load parcelles (by site_id or vignoble_id)
      const { data: parcData } = await supabase.from("parcelles").select("id, nom, variete, surface, sol, type_culture, site_id, vignoble_id").order("nom");
      const myParcelles = (parcData ?? []).filter((p: any) => p.site_id === id || p.vignoble_id === id);
      setParcelles(myParcelles);

      const pIds = myParcelles.map((p: any) => p.id);

      if (pIds.length > 0) {
        // Load placettes
        const { data: plData } = await supabase.from("placettes").select("id, parcelle_id, nom, nb_ceps, modalite_id").in("parcelle_id", pIds).eq("actif", true).order("nom");
        if (plData) setPlacettes(plData);

        // Load analyses
        const { data: anaData } = await supabase.from("analyses_sol").select("id, parcelle_id, date_prelevement, phase, ph, matiere_organique_pct, score_sante_sol, cuivre_total, biomasse_microbienne").in("parcelle_id", pIds).order("date_prelevement", { ascending: false });
        if (anaData) setAnalyses(anaData);

        // Load last obs dates
        const { data: obsData } = await supabase.from("observations").select("parcelle_id, date").in("parcelle_id", pIds).order("date", { ascending: false });
        const od: Record<string, string> = {};
        for (const o of (obsData ?? []) as { parcelle_id: string; date: string }[]) { if (!od[o.parcelle_id]) od[o.parcelle_id] = o.date; }
        setLastObsDates(od);

        // Load last trait dates
        const { data: traitData } = await supabase.from("traitements").select("parcelle_id, date").in("parcelle_id", pIds).order("date", { ascending: false });
        const td: Record<string, string> = {};
        for (const t of (traitData ?? []) as { parcelle_id: string; date: string }[]) { if (!td[t.parcelle_id]) td[t.parcelle_id] = t.date; }
        setLastTraitDates(td);
      }

      setLoading(false);
    }
    load();
  }, [id, isDemo]);

  if (loading) return <div className="pt-4"><ListSkeleton count={3} /></div>;

  if (!site) {
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
      <h1 className="text-xl font-bold gradient-text mt-2 mb-1">{site.nom}</h1>
      {site.localisation && <p className="text-sm text-gray-500">{site.localisation}</p>}
      {site.type_exploitation && <p className="text-xs text-amber-600 font-medium mt-0.5">{TYPE_LABELS[site.type_exploitation] ?? site.type_exploitation}</p>}
      {site.adresse && <p className="text-xs text-gray-400 mt-0.5">📍 {site.adresse}</p>}

      {/* Parcelles */}
      <h2 className="text-lg font-bold text-gray-800 mt-6 mb-3">🌿 Parcelles</h2>
      <div className="space-y-3 mb-6">
        {parcelles.map((p) => {
          const parcellePlacettes = placettes.filter(pl => pl.parcelle_id === p.id);
          return (
            <div key={p.id} className="glass rounded-2xl p-4 space-y-2">
              <div>
                <div className="font-medium text-gray-800">{p.nom}</div>
                <div className="text-xs text-gray-500">
                  {p.variete || "—"}
                  {p.surface && ` · ${p.surface} ha`}
                  {p.sol && ` · ${p.sol}`}
                  {p.type_culture && ` · ${p.type_culture}`}
                </div>
              </div>
              <div className="flex gap-4 text-xs text-gray-500">
                <span>📝 Obs : <strong className="text-gray-700">{formatDate(lastObsDates[p.id])}</strong></span>
                <span>💧 Trait : <strong className="text-gray-700">{formatDate(lastTraitDates[p.id])}</strong></span>
              </div>
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
              <DernierTraitementCard parcelleId={p.id} />
            </div>
          );
        })}
        {parcelles.length === 0 && (
          <div className="glass rounded-2xl p-6 text-center">
            <p className="text-sm text-gray-400 mb-2">Aucune parcelle pour ce site</p>
            <Link href="/admin" className="text-xs text-emerald-600 font-medium hover:underline">Ajouter une parcelle dans Admin →</Link>
          </div>
        )}
      </div>

      {/* Analyses sol */}
      {analyses.length > 0 && (
        <>
          <h2 className="text-lg font-bold text-gray-800 mb-3">🧪 Analyses de sol</h2>
          <div className="space-y-3 mb-6">
            {analyses.map((a) => <AnalyseSolCard key={a.id} analyse={a} />)}
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
