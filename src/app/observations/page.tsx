"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase/client";
import { useDemo } from "@/components/DemoProvider";
import { DEMO_OBSERVATIONS, DEMO_TRAITEMENTS, DEMO_VIGNOBLES, DEMO_PARCELLES } from "@/lib/demo-data";
import { ListSkeleton } from "@/components/Skeleton";

interface ObsItem { id: string; parcelle_id: string; date: string; stade_bbch: string | null; modalite: string; rang: number; commentaires: string | null; vigueur: number | null; }
interface TraitItem { id: string; parcelle_id: string; date: string; stade: string | null; mode: string | null; nb_rangs: number | null; notes: string | null; }
interface SiteMap { [id: string]: string }
interface ParcelleMap { [id: string]: { nom: string; site_id: string } }

function formatDate(d: string) {
  return new Date(d).toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" });
}

export default function HistoriquePage() {
  const { isDemo } = useDemo();
  const [loading, setLoading] = useState(true);
  const [observations, setObservations] = useState<ObsItem[]>([]);
  const [traitements, setTraitements] = useState<TraitItem[]>([]);
  const [siteNames, setSiteNames] = useState<SiteMap>({});
  const [parcelleInfo, setParcelleInfo] = useState<ParcelleMap>({});
  const [view, setView] = useState<"hub" | "observations" | "traitements">("hub");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    if (isDemo) {
      setObservations(DEMO_OBSERVATIONS.slice(0, 20).map(o => ({ id: o.id, parcelle_id: o.parcelle_id, date: o.date, stade_bbch: o.stade_bbch, modalite: o.modalite, rang: o.rang, commentaires: o.commentaires, vigueur: o.vigueur })));
      setTraitements(DEMO_TRAITEMENTS.slice(0, 20).map(t => ({ id: t.id, parcelle_id: t.parcelle_id, date: t.date, stade: t.stade, mode: t.mode, nb_rangs: t.nb_rangs, notes: t.notes })));
      const sm: SiteMap = {};
      for (const v of DEMO_VIGNOBLES) sm[v.id] = v.nom;
      setSiteNames(sm);
      const pm: ParcelleMap = {};
      for (const p of DEMO_PARCELLES) pm[p.id] = { nom: p.nom, site_id: p.vignoble_id };
      setParcelleInfo(pm);
      setLoading(false);
      return;
    }
    async function load() {
      const [obsRes, traitRes, sRes, pRes] = await Promise.all([
        supabase.from("observations").select("id, parcelle_id, date, stade_bbch, modalite, rang, commentaires, vigueur").order("date", { ascending: false }).limit(50),
        supabase.from("traitements").select("id, parcelle_id, date, stade, mode, nb_rangs, notes").order("date", { ascending: false }).limit(50),
        supabase.from("sites").select("id, nom"),
        supabase.from("parcelles").select("id, nom, site_id, vignoble_id"),
      ]);
      if (obsRes.data) setObservations(obsRes.data);
      if (traitRes.data) setTraitements(traitRes.data);
      const sm: SiteMap = {};
      for (const s of sRes.data ?? []) sm[s.id] = s.nom;
      setSiteNames(sm);
      const pm: ParcelleMap = {};
      for (const p of (pRes.data ?? []) as { id: string; nom: string; site_id: string | null; vignoble_id: string }[]) {
        pm[p.id] = { nom: p.nom, site_id: p.site_id || p.vignoble_id };
      }
      setParcelleInfo(pm);
      setLoading(false);
    }
    load();
  }, [isDemo]);

  function getSiteName(parcelleId: string) { return siteNames[parcelleInfo[parcelleId]?.site_id] || "—"; }
  function getParcelleName(parcelleId: string) { return parcelleInfo[parcelleId]?.nom || "—"; }

  async function deleteObs(id: string) {
    if (!confirm("Supprimer cette observation et ses données associées ?")) return;
    await supabase.from("maladies_observations").delete().eq("observation_id", id);
    await supabase.from("photos").delete().eq("observation_id", id);
    await supabase.from("observations").delete().eq("id", id);
    setObservations(prev => prev.filter(o => o.id !== id));
  }

  async function deleteTrait(id: string) {
    if (!confirm("Supprimer ce traitement ?")) return;
    await supabase.from("traitement_rangs").delete().eq("traitement_id", id);
    await supabase.from("traitements").delete().eq("id", id);
    setTraitements(prev => prev.filter(t => t.id !== id));
  }

  if (loading) return <div className="pt-4"><ListSkeleton count={4} /></div>;

  // ===== HUB =====
  if (view === "hub") {
    return (
      <div>
        <h1 className="text-xl font-bold gradient-text mb-4">📋 Historique</h1>

        <div className="grid grid-cols-2 gap-3 mb-6">
          <button onClick={() => setView("observations")}
            className="bg-gradient-to-br from-emerald-500 to-emerald-700 text-white rounded-2xl p-5 text-center font-medium shadow-lg active:scale-95 transition-all">
            <div className="text-3xl mb-2">📝</div>
            <div className="text-sm font-semibold">Observations</div>
            <div className="text-xs opacity-80 mt-1">{observations.length} enregistrées</div>
          </button>
          <button onClick={() => setView("traitements")}
            className="bg-gradient-to-br from-amber-500 to-amber-700 text-white rounded-2xl p-5 text-center font-medium shadow-lg active:scale-95 transition-all">
            <div className="text-3xl mb-2">💧</div>
            <div className="text-sm font-semibold">Traitements</div>
            <div className="text-xs opacity-80 mt-1">{traitements.length} enregistrés</div>
          </button>
        </div>

        {/* Aperçu 3 dernières obs */}
        <h2 className="text-sm font-bold text-gray-800 mb-2">📝 Dernières observations</h2>
        <div className="space-y-1.5 mb-4">
          {observations.slice(0, 3).map(o => (
            <button key={o.id} onClick={() => setView("observations")} className="w-full text-left glass rounded-xl p-3 active:scale-[0.98] transition-all">
              <div className="flex justify-between items-center">
                <div className="text-xs font-medium text-gray-800">{getSiteName(o.parcelle_id)} · {getParcelleName(o.parcelle_id)}</div>
                <span className="text-[10px] bg-emerald-50 text-emerald-700 px-1.5 py-0.5 rounded">{o.modalite}</span>
              </div>
              <div className="text-[10px] text-gray-500 mt-0.5">{formatDate(o.date)}{o.stade_bbch && ` · BBCH ${o.stade_bbch}`} · R{o.rang}</div>
            </button>
          ))}
          {observations.length === 0 && <p className="text-xs text-gray-400 glass rounded-xl p-3">Aucune observation</p>}
        </div>

        {/* Aperçu 3 derniers traitements */}
        <h2 className="text-sm font-bold text-gray-800 mb-2">💧 Derniers traitements</h2>
        <div className="space-y-1.5">
          {traitements.slice(0, 3).map(t => (
            <button key={t.id} onClick={() => setView("traitements")} className="w-full text-left glass rounded-xl p-3 active:scale-[0.98] transition-all">
              <div className="flex justify-between items-center">
                <div className="text-xs font-medium text-gray-800">{getSiteName(t.parcelle_id)} · {getParcelleName(t.parcelle_id)}</div>
                <span className="text-[10px] bg-amber-50 text-amber-700 px-1.5 py-0.5 rounded">{t.mode === "surface" ? "Surface" : `${t.nb_rangs || "?"} rangs`}</span>
              </div>
              <div className="text-[10px] text-gray-500 mt-0.5">{formatDate(t.date)}{t.stade && ` · Stade ${t.stade}`}</div>
            </button>
          ))}
          {traitements.length === 0 && <p className="text-xs text-gray-400 glass rounded-xl p-3">Aucun traitement</p>}
        </div>
      </div>
    );
  }

  // ===== OBSERVATIONS =====
  if (view === "observations") {
    return (
      <div>
        <nav className="flex items-center gap-1.5 text-xs text-gray-400 mb-3">
          <button onClick={() => setView("hub")} className="hover:text-emerald-600">📋 Historique</button>
          <span>›</span>
          <span className="text-gray-700 font-medium">Observations</span>
        </nav>
        <h1 className="text-xl font-bold gradient-text mb-4">📝 Historique Observations</h1>
        <p className="text-xs text-gray-500 mb-3">{observations.length} observation{observations.length !== 1 ? "s" : ""}</p>

        <div className="space-y-2">
          {observations.map(o => {
            const isExpanded = expandedId === o.id;
            return (
              <div key={o.id} className={`glass rounded-xl overflow-hidden transition-all ${isExpanded ? "ring-2 ring-emerald-400/30" : ""}`}>
                <button type="button" onClick={() => setExpandedId(isExpanded ? null : o.id)} className="w-full text-left p-3">
                  <div className="flex justify-between items-center">
                    <div>
                      <div className="text-xs font-medium text-gray-800">{getSiteName(o.parcelle_id)} · {getParcelleName(o.parcelle_id)}</div>
                      <div className="text-[10px] text-gray-500 mt-0.5">{formatDate(o.date)}{o.stade_bbch && ` · BBCH ${o.stade_bbch}`} · R{o.rang}</div>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] bg-emerald-50 text-emerald-700 px-1.5 py-0.5 rounded">{o.modalite}</span>
                      {o.vigueur != null && <span className="text-[10px] bg-blue-50 text-blue-700 px-1.5 py-0.5 rounded">V:{o.vigueur}/5</span>}
                      <span className={`text-gray-400 text-xs transition-transform ${isExpanded ? "rotate-180" : ""}`}>▾</span>
                    </div>
                  </div>
                </button>
                {isExpanded && (
                  <div className="px-3 pb-3 border-t border-gray-100 pt-2 space-y-2 animate-fadeIn">
                    <div className="glass rounded-lg p-2 text-xs space-y-1">
                      <div className="flex justify-between"><span className="text-gray-500">Site</span><span className="font-medium">{getSiteName(o.parcelle_id)}</span></div>
                      <div className="flex justify-between"><span className="text-gray-500">Parcelle</span><span className="font-medium">{getParcelleName(o.parcelle_id)}</span></div>
                      <div className="flex justify-between"><span className="text-gray-500">Rang</span><span className="font-medium">R{o.rang}</span></div>
                      <div className="flex justify-between"><span className="text-gray-500">Modalité</span><span className="font-medium">{o.modalite}</span></div>
                      {o.stade_bbch && <div className="flex justify-between"><span className="text-gray-500">Stade BBCH</span><span className="font-medium">{o.stade_bbch}</span></div>}
                      {o.vigueur != null && <div className="flex justify-between"><span className="text-gray-500">Vigueur</span><span className="font-medium">{o.vigueur}/5</span></div>}
                    </div>
                    {o.commentaires && <p className="text-xs text-gray-600">{o.commentaires}</p>}
                    <div className="flex items-center gap-3 pt-1">
                      <Link href={`/observations/new?duplicate=${o.id}`} className="text-[10px] text-emerald-700 font-medium hover:underline">📋 Dupliquer</Link>
                      <button onClick={() => deleteObs(o.id)} className="text-[10px] text-red-500 font-medium hover:underline">🗑 Supprimer</button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  // ===== TRAITEMENTS =====
  return (
    <div>
      <nav className="flex items-center gap-1.5 text-xs text-gray-400 mb-3">
        <button onClick={() => setView("hub")} className="hover:text-emerald-600">📋 Historique</button>
        <span>›</span>
        <span className="text-gray-700 font-medium">Traitements</span>
      </nav>
      <h1 className="text-xl font-bold gradient-text mb-4">💧 Historique Traitements</h1>
      <p className="text-xs text-gray-500 mb-3">{traitements.length} traitement{traitements.length !== 1 ? "s" : ""}</p>

      <div className="space-y-2">
        {traitements.map(t => {
          const isExpanded = expandedId === t.id;
          return (
            <div key={t.id} className={`glass rounded-xl overflow-hidden transition-all ${isExpanded ? "ring-2 ring-amber-400/30" : ""}`}>
              <button type="button" onClick={() => setExpandedId(isExpanded ? null : t.id)} className="w-full text-left p-3">
                <div className="flex justify-between items-center">
                  <div>
                    <div className="text-xs font-medium text-gray-800">{getSiteName(t.parcelle_id)} · {getParcelleName(t.parcelle_id)}</div>
                    <div className="text-[10px] text-gray-500 mt-0.5">{formatDate(t.date)}{t.stade && ` · Stade ${t.stade}`}</div>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] bg-amber-50 text-amber-700 px-1.5 py-0.5 rounded">{t.mode === "surface" ? "Surface" : `${t.nb_rangs || "?"} rangs`}</span>
                    <span className={`text-gray-400 text-xs transition-transform ${isExpanded ? "rotate-180" : ""}`}>▾</span>
                  </div>
                </div>
              </button>
              {isExpanded && (
                <div className="px-3 pb-3 border-t border-gray-100 pt-2 space-y-2 animate-fadeIn">
                  <div className="glass rounded-lg p-2 text-xs space-y-1">
                    <div className="flex justify-between"><span className="text-gray-500">Site</span><span className="font-medium">{getSiteName(t.parcelle_id)}</span></div>
                    <div className="flex justify-between"><span className="text-gray-500">Parcelle</span><span className="font-medium">{getParcelleName(t.parcelle_id)}</span></div>
                    {t.stade && <div className="flex justify-between"><span className="text-gray-500">Stade</span><span className="font-medium">{t.stade}</span></div>}
                    <div className="flex justify-between"><span className="text-gray-500">Mode</span><span className="font-medium">{t.mode === "surface" ? "Surface" : `${t.nb_rangs} rangs`}</span></div>
                  </div>
                  {t.notes && <p className="text-xs text-gray-600">{t.notes}</p>}
                  <div className="flex items-center gap-3 pt-1">
                    <Link href={`/traitements/new?site=${parcelleInfo[t.parcelle_id]?.site_id || ""}&parcelle=${t.parcelle_id}`} className="text-[10px] text-amber-700 font-medium hover:underline">🔄 Reprendre</Link>
                    <button onClick={() => deleteTrait(t.id)} className="text-[10px] text-red-500 font-medium hover:underline">🗑 Supprimer</button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
