"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { useDemo } from "@/components/DemoProvider";
import { DEMO_VIGNOBLES, DEMO_PARCELLES, DEMO_ANALYSES, DEMO_PLACETTES, DEMO_OBSERVATIONS, DEMO_TRAITEMENTS } from "@/lib/demo-data";
import { DernierTraitementCard } from "@/components/traitements/DernierTraitementCard";
import { supabase } from "@/lib/supabase/client";
import { ListSkeleton } from "@/components/Skeleton";

interface SiteData { id: string; nom: string; localisation: string | null; type_exploitation: string | null; adresse: string | null; latitude: number | null; longitude: number | null; }
interface ParcelleData { id: string; nom: string; variete: string | null; surface: number | null; sol: string | null; type_culture: string | null; latitude: number | null; longitude: number | null; }
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

// Calendrier prévisionnel vigne — mois numérique pour filtrage automatique
const CALENDRIER_VIGNE: { mois: string; moisNum: number; date_approx: string; bbch: string; stade: string }[] = [
  { mois: "Avril", moisNum: 4, date_approx: "mi-avril", bbch: "05-09", stade: "Débourrement" },
  { mois: "Mai", moisNum: 5, date_approx: "début mai", bbch: "12-15", stade: "Feuilles étalées" },
  { mois: "Mai", moisNum: 5, date_approx: "fin mai", bbch: "17-19", stade: "Grappes séparées" },
  { mois: "Juin", moisNum: 6, date_approx: "mi-juin", bbch: "23-27", stade: "Floraison / Nouaison" },
  { mois: "Juillet", moisNum: 7, date_approx: "début juillet", bbch: "31-33", stade: "Fermeture grappe" },
  { mois: "Juillet", moisNum: 7, date_approx: "fin juillet", bbch: "35-38", stade: "Véraison / Maturité" },
  { mois: "Septembre", moisNum: 9, date_approx: "septembre", bbch: "41-43", stade: "Post-récolte" },
];

// Recommandations inter-campagne (après vendanges → avant débourrement)
const RECOS_INTER_CAMPAGNE: { mois: string; moisNum: number; titre: string; priorite: string; message: string }[] = [
  { mois: "Octobre", moisNum: 10, titre: "Préparation hivernale", priorite: "moderee", message: "Passage levain post-vendanges pour stimuler la vie microbienne du sol avant l'hiver. Favorise la décomposition des résidus de culture et prépare le sol pour la campagne suivante." },
  { mois: "Novembre", moisNum: 11, titre: "Amendement organique", priorite: "optionnel", message: "Période idéale pour apporter des amendements organiques (compost, fumier). Le levain peut être associé pour accélérer la minéralisation." },
  { mois: "Janvier", moisNum: 1, titre: "Analyse sol T0", priorite: "elevee", message: "Réaliser une analyse de sol avant le démarrage de la campagne. Comparer avec les résultats de la campagne précédente pour ajuster la stratégie levain." },
  { mois: "Février", moisNum: 2, titre: "Préparation pré-débourrement", priorite: "elevee", message: "Préparer les solutions de levain pour la campagne. Vérifier le matériel de pulvérisation. Planifier le calendrier de passages selon les stades BBCH prévus." },
  { mois: "Mars", moisNum: 3, titre: "Activation sol post-gel", priorite: "critique", message: "Premier passage levain de la saison pour réactiver la vie microbienne après l'hiver. Application au sol recommandée pour stimuler le réveil racinaire avant débourrement." },
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
  const [showAll, setShowAll] = useState(false);

  if (recos.length === 0 && RECOS_INTER_CAMPAGNE.length === 0) return null;

  const now = new Date();
  const currentMonth = now.getMonth() + 1; // 1-12
  const currentYear = now.getFullYear();
  const campagneYear = currentMonth >= 10 ? currentYear + 1 : currentYear;

  // Filter calendar: only show current month and future
  const planningCampagne = CALENDRIER_VIGNE
    .map(cal => {
      const [minStr, maxStr] = cal.bbch.split("-");
      const min = parseInt(minStr, 10);
      const max = parseInt(maxStr, 10);
      const matched = recos.filter(r => {
        const rMin = parseInt(r.bbch_min, 10);
        const rMax = parseInt(r.bbch_max, 10);
        return (rMin <= max && rMax >= min);
      });
      return { ...cal, recos: matched };
    })
    .filter(p => p.recos.length > 0)
    .filter(p => p.moisNum >= currentMonth); // Hide past months

  // Limit to 2 months unless showAll
  const visiblePlanning = showAll ? planningCampagne : planningCampagne.slice(0, 2);
  const hasMore = planningCampagne.length > 2;

  // Inter-campagne: show if we're past September (campagne terminée) or before April
  const isInterCampagne = currentMonth >= 10 || currentMonth <= 3;
  const interRecos = isInterCampagne
    ? RECOS_INTER_CAMPAGNE.filter(r => r.moisNum >= currentMonth || (currentMonth >= 10 && r.moisNum <= 3))
    : [];
  const visibleInter = showAll ? interRecos : interRecos.slice(0, 2);

  if (planningCampagne.length === 0 && interRecos.length === 0) return null;

  return (
    <>
      <h2 className="text-lg font-bold text-gray-800 mb-3">💡 Recommandations — Campagne {campagneYear}</h2>
      <p className="text-xs text-gray-500 mb-4">Prévisionnel basé sur les stades BBCH. Les périodes passées sont masquées automatiquement.</p>

      {/* Inter-campagne (hiver) */}
      {visibleInter.length > 0 && (
        <div className="space-y-3 mb-4">
          <div className="text-xs font-semibold text-blue-600 uppercase tracking-wider">🌨️ Préparation campagne {campagneYear}</div>
          {visibleInter.map((r, i) => {
            const style = PRIORITE_COLORS[r.priorite] ?? PRIORITE_COLORS.optionnel;
            return (
              <div key={i} className={`${style.bg} border rounded-xl p-3 space-y-1`}>
                <div className="flex items-center justify-between">
                  <span className={`text-xs font-semibold ${style.text}`}>{style.icon} {r.mois} — {r.titre}</span>
                  <span className={`text-[10px] font-bold ${style.text} bg-white/60 px-2 py-0.5 rounded-full`}>{r.priorite}</span>
                </div>
                <p className="text-xs text-gray-700 leading-relaxed">{r.message}</p>
              </div>
            );
          })}
        </div>
      )}

      {/* Campagne en cours */}
      {visiblePlanning.length > 0 && (
        <div className="space-y-3 mb-4">
          {visibleInter.length > 0 && <div className="text-xs font-semibold text-emerald-600 uppercase tracking-wider">🌱 Campagne en cours</div>}
          {visiblePlanning.map((p, i) => (
            <div key={i} className="glass rounded-2xl p-4 space-y-2">
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-semibold text-sm text-gray-800">📅 {p.date_approx}</div>
                  <div className="text-xs text-gray-500">BBCH {p.bbch} — {p.stade}</div>
                </div>
                <span className="text-xs bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-full font-medium">{p.mois}</span>
              </div>
              {p.recos.map(r => {
                const style = PRIORITE_COLORS[r.priorite] ?? PRIORITE_COLORS.optionnel;
                return (
                  <div key={r.id} className={`${style.bg} border rounded-xl p-3 space-y-1`}>
                    <div className="flex items-center justify-between">
                      <span className={`text-xs font-semibold ${style.text}`}>{style.icon} {r.type}</span>
                      <span className={`text-[10px] font-bold ${style.text} bg-white/60 px-2 py-0.5 rounded-full`}>{r.priorite}</span>
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
      )}

      {/* Bouton voir plus */}
      {hasMore && !showAll && (
        <button type="button" onClick={() => setShowAll(true)}
          className="w-full glass rounded-xl py-3 text-sm font-medium text-emerald-700 hover:bg-emerald-50 transition-colors mb-4">
          📅 Voir toutes les recommandations de la campagne ({planningCampagne.length - 2} de plus)
        </button>
      )}
      {showAll && hasMore && (
        <button type="button" onClick={() => setShowAll(false)}
          className="w-full glass rounded-xl py-2 text-xs font-medium text-gray-500 hover:bg-gray-50 transition-colors mb-4">
          ▲ Réduire
        </button>
      )}

      <p className="text-[10px] text-gray-400 italic mb-6">ℹ️ Adapter selon la pression mildiou et les conditions météo. Consulter l&apos;agronome pour les cas spécifiques.</p>
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
        setSite({ id: demoSite.id, nom: demoSite.nom, localisation: demoSite.localisation, type_exploitation: demoSite.type_site, adresse: null, latitude: (demoSite as any).latitude ?? null, longitude: (demoSite as any).longitude ?? null });
        const dp = DEMO_PARCELLES.filter((p) => p.vignoble_id === id);
        setParcelles(dp.map(p => ({ id: p.id, nom: p.nom, variete: (p as any).variete || p.cepage, surface: (p as any).surface || null, sol: (p as any).sol || null, type_culture: (p as any).type_culture || null, latitude: null, longitude: null })));
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
      const { data: siteData } = await supabase.from("sites").select("id, nom, localisation, type_exploitation, adresse, latitude, longitude").eq("id", id).single();
      if (siteData) {
        setSite(siteData);
      } else {
        // Fallback: try vignobles table
        const { data: vigData } = await supabase.from("vignobles").select("id, nom, localisation").eq("id", id).single();
        if (vigData) setSite({ ...vigData, type_exploitation: null, adresse: null, latitude: null, longitude: null });
      }

      // Load parcelles (by site_id or vignoble_id)
      const { data: parcData } = await supabase.from("parcelles").select("id, nom, variete, surface, sol, type_culture, site_id, vignoble_id, latitude, longitude").order("nom");
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
      {site.latitude && site.longitude && (
        <p className="text-[10px] text-gray-400 mt-0.5">🌐 GPS : {site.latitude}, {site.longitude}</p>
      )}

      {/* Parcelles */}
      <h2 className="text-lg font-bold text-gray-800 mt-6 mb-3">🌿 Parcelles</h2>
      <div className="space-y-3 mb-6">
        {parcelles.map((p) => {
          const parcellePlacettes = placettes.filter(pl => pl.parcelle_id === p.id);
          return (
            <Link key={p.id} href={`/parcelles/${p.id}`} className="block glass rounded-2xl p-4 space-y-2 active:scale-[0.98] transition-all hover:ring-2 hover:ring-emerald-400/30">
              <div className="flex justify-between items-start">
                <div>
                  <div className="font-medium text-gray-800">{p.nom}</div>
                  <div className="text-xs text-gray-500">
                    {p.variete || "—"}
                    {p.surface && ` · ${p.surface} ha`}
                    {p.sol && ` · ${p.sol}`}
                    {p.type_culture && ` · ${p.type_culture}`}
                  </div>
                  {p.latitude && p.longitude && (
                    <div className="text-[10px] text-gray-400">🌐 {p.latitude}, {p.longitude}</div>
                  )}
                </div>
                <span className="text-gray-300 text-lg">›</span>
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
            </Link>
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
