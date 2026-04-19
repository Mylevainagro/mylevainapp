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
interface AnalyseData { id: string; parcelle_id: string; date_prelevement: string; phase: string; ph: number | null; matiere_organique_pct: number | null; score_sante_sol: number | null; cuivre_total: number | null; biomasse_microbienne: number | null; fichier_pdf_url: string | null; }
interface RecoData { id: string; bbch_min: string; bbch_max: string; type: string; priorite: string; message: string; }

function AnalyseSolCard({ analyse }: { analyse: AnalyseData }) {
  return (
    <div className="glass rounded-2xl p-4 space-y-2">
      <div className="flex justify-between items-center">
        <span className="text-sm font-semibold text-gray-700">🧪 {analyse.phase}</span>
        <div className="flex items-center gap-2">
          {analyse.fichier_pdf_url && (
            <a href={analyse.fichier_pdf_url} target="_blank" rel="noopener noreferrer"
              className="text-xs bg-blue-50 text-blue-700 px-2 py-1 rounded-lg font-medium hover:bg-blue-100 transition-colors">
              📄 Voir PDF
            </a>
          )}
          <span className="text-xs text-gray-400">{new Date(analyse.date_prelevement).toLocaleDateString("fr-FR")}</span>
        </div>
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

// Calendrier prévisionnel vigne 2026 — mois → stade BBCH approximatif
const CALENDRIER_VIGNE: { mois: string; date_approx: string; bbch: string; stade: string }[] = [
  { mois: "Avril", date_approx: "mi-avril", bbch: "05-09", stade: "Débourrement" },
  { mois: "Mai", date_approx: "début mai", bbch: "12-15", stade: "Feuilles étalées" },
  { mois: "Mai", date_approx: "fin mai", bbch: "17-19", stade: "Grappes séparées" },
  { mois: "Juin", date_approx: "mi-juin", bbch: "23-27", stade: "Floraison / Nouaison" },
  { mois: "Juillet", date_approx: "début juillet", bbch: "31-33", stade: "Fermeture grappe" },
  { mois: "Juillet", date_approx: "fin juillet", bbch: "35-38", stade: "Véraison / Maturité" },
  { mois: "Septembre", date_approx: "septembre", bbch: "41-43", stade: "Post-récolte" },
];

const PRIORITE_COLORS: Record<string, { bg: string; text: string; icon: string }> = {
  critique: { bg: "bg-red-50 border-red-200", text: "text-red-700", icon: "🔴" },
  elevee: { bg: "bg-orange-50 border-orange-200", text: "text-orange-700", icon: "🟠" },
  moderee: { bg: "bg-amber-50 border-amber-200", text: "text-amber-700", icon: "🟡" },
  moyenne: { bg: "bg-yellow-50 border-yellow-200", text: "text-yellow-700", icon: "🟡" },
  faible: { bg: "bg-blue-50 border-blue-200", text: "text-blue-700", icon: "🔵" },
  optionnel: { bg: "bg-gray-50 border-gray-200", text: "text-gray-600", icon: "⚪" },
};

function RecommandationsStrategiques({ recos }: { recos: RecoData[] }) {
  if (recos.length === 0) return null;

  // Match each calendar entry with recommandations
  const planning = CALENDRIER_VIGNE.map(cal => {
    const [minStr, maxStr] = cal.bbch.split("-");
    const min = parseInt(minStr, 10);
    const max = parseInt(maxStr, 10);
    const matched = recos.filter(r => {
      const rMin = parseInt(r.bbch_min, 10);
      const rMax = parseInt(r.bbch_max, 10);
      return (rMin <= max && rMax >= min);
    });
    return { ...cal, recos: matched };
  }).filter(p => p.recos.length > 0);

  if (planning.length === 0) return null;

  return (
    <>
      <h2 className="text-lg font-bold text-gray-800 mb-3">💡 Recommandations — Campagne 2026</h2>
      <p className="text-xs text-gray-500 mb-4">Prévisionnel de traitements levain basé sur les stades BBCH. Ces recommandations sont indicatives.</p>
      <div className="space-y-3 mb-6">
        {planning.map((p, i) => (
          <div key={i} className="glass rounded-2xl p-4 space-y-2">
            {/* Header période */}
            <div className="flex items-center justify-between">
              <div>
                <div className="font-semibold text-sm text-gray-800">📅 {p.date_approx}</div>
                <div className="text-xs text-gray-500">BBCH {p.bbch} — {p.stade}</div>
              </div>
              <span className="text-xs bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-full font-medium">{p.mois}</span>
            </div>
            {/* Recommandations pour cette période */}
            {p.recos.map(r => {
              const style = PRIORITE_COLORS[r.priorite] ?? PRIORITE_COLORS.optionnel;
              return (
                <div key={r.id} className={`${style.bg} border rounded-xl p-3 space-y-1`}>
                  <div className="flex items-center justify-between">
                    <span className={`text-xs font-semibold ${style.text}`}>{style.icon} {r.type}</span>
                    <span className={`text-[10px] font-bold ${style.text} bg-white/60 px-2 py-0.5 rounded-full`}>Priorité : {r.priorite}</span>
                  </div>
                  <p className="text-xs text-gray-700 leading-relaxed">{r.message}</p>
                  <div className="text-[10px] text-gray-500">
                    💧 Modalités suggérées : M1 (levain 1/4), M2 (levain 1/2) ou M6-M11 (levain + phyto) selon pression sanitaire
                  </div>
                </div>
              );
            })}
          </div>
        ))}
      </div>
      <p className="text-[10px] text-gray-400 italic mb-6">ℹ️ Adapter les modalités et dilutions selon la pression mildiou observée et les conditions météo. Consulter l&apos;agronome pour les cas spécifiques.</p>
    </>
  );
}

export default function VignoblePage() {
  const { id } = useParams<{ id: string }>();
  const { isDemo } = useDemo();
  const [loading, setLoading] = useState(!isDemo);
  const [site, setSite] = useState<SiteData | null>(null);
  const [parcelles, setParcelles] = useState<ParcelleData[]>([]);
  const [placettes, setPlacettes] = useState<PlacetteData[]>([]);
  const [analyses, setAnalyses] = useState<AnalyseData[]>([]);
  const [recos, setRecos] = useState<RecoData[]>([]);
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
        // Demo recommandations (hardcoded for demo)
        setRecos([
          { id: 'r1', bbch_min: '05', bbch_max: '09', type: 'Biostimulation levain', priorite: 'elevee', message: 'Passage recommandé pour stimuler le démarrage végétatif et activer le microbiote du sol après l\'hiver.' },
          { id: 'r2', bbch_min: '12', bbch_max: '16', type: 'Biostimulation levain', priorite: 'elevee', message: 'Soutien de la croissance foliaire et renforcement du microbiote racinaire.' },
          { id: 'r3', bbch_min: '17', bbch_max: '19', type: 'Biostimulation levain', priorite: 'elevee', message: 'Préparation pré-floraison. Renforcer les défenses naturelles avant la période sensible au mildiou.' },
          { id: 'r4', bbch_min: '23', bbch_max: '27', type: 'Biostimulation levain', priorite: 'critique', message: 'Période critique : floraison et nouaison. Passage levain fortement recommandé pour limiter la pression mildiou.' },
          { id: 'r5', bbch_min: '27', bbch_max: '31', type: 'Biostimulation levain', priorite: 'moderee', message: 'Accompagnement post-floraison. Soutien de la formation des baies.' },
          { id: 'r6', bbch_min: '31', bbch_max: '35', type: 'Biostimulation levain', priorite: 'moyenne', message: 'Soutien pendant la formation et la fermeture des grappes.' },
          { id: 'r7', bbch_min: '35', bbch_max: '38', type: 'Biostimulation levain', priorite: 'moderee', message: 'Préparation véraison. Accompagner la maturation.' },
          { id: 'r8', bbch_min: '41', bbch_max: '43', type: 'Biostimulation levain', priorite: 'optionnel', message: 'Post-récolte : passage optionnel pour la récupération du sol.' },
        ]);
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
        const { data: anaData } = await supabase.from("analyses_sol").select("id, parcelle_id, date_prelevement, phase, ph, matiere_organique_pct, score_sante_sol, cuivre_total, biomasse_microbienne, fichier_pdf_url").in("parcelle_id", pIds).order("date_prelevement", { ascending: false });
        if (anaData) setAnalyses(anaData);

        // Load recommandations
        const { data: recoData } = await supabase.from("recommandations_bbch").select("id, bbch_min, bbch_max, type, priorite, message").eq("actif", true).order("bbch_min");
        if (recoData) setRecos(recoData);

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

      {/* Recommandations stratégiques */}
      <RecommandationsStrategiques recos={recos} />

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
