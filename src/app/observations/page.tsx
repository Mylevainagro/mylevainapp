"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabase/client";
import { useDemo } from "@/components/DemoProvider";
import { DEMO_OBSERVATIONS, DEMO_VIGNOBLES, DEMO_PARCELLES } from "@/lib/demo-data";
import { ListSkeleton } from "@/components/Skeleton";
import { SelectField } from "@/components/ui/SelectField";

interface ObsItem { id: string; parcelle_id: string; date: string; stade_bbch: string | null; modalite: string; rang: number; commentaires: string | null; vigueur: number | null; campagne?: string; }
interface SiteMap { [id: string]: string }
interface ParcelleMap { [id: string]: { nom: string; site_id: string } }

const CAMPAGNE_OPTIONS = ["2024", "2025", "2026", "2027"] as const;

function formatDate(d: string) {
  return new Date(d).toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" });
}

export default function ObservationsPage() {
  const { isDemo } = useDemo();
  const searchParams = useSearchParams();
  const filterParcelleId = searchParams.get("parcelle") || "";
  const [loading, setLoading] = useState(true);
  const [observations, setObservations] = useState<ObsItem[]>([]);
  const [siteNames, setSiteNames] = useState<SiteMap>({});
  const [parcelleInfo, setParcelleInfo] = useState<ParcelleMap>({});
  const [campagne, setCampagne] = useState(new Date().getFullYear().toString());
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    if (isDemo) {
      setObservations(DEMO_OBSERVATIONS.map(o => ({ id: o.id, parcelle_id: o.parcelle_id, date: o.date, stade_bbch: o.stade_bbch, modalite: o.modalite, rang: o.rang, commentaires: o.commentaires, vigueur: o.vigueur })));
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
      const [obsRes, sRes, pRes] = await Promise.all([
        supabase.from("observations").select("id, parcelle_id, date, stade_bbch, modalite, rang, commentaires, vigueur").order("date", { ascending: false }).limit(100),
        supabase.from("sites").select("id, nom"),
        supabase.from("parcelles").select("id, nom, site_id, vignoble_id"),
      ]);
      if (obsRes.data) setObservations(obsRes.data);
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

  function getSiteName(pid: string) { return siteNames[parcelleInfo[pid]?.site_id] || "—"; }
  function getParcelleName(pid: string) { return parcelleInfo[pid]?.nom || "—"; }

  const filtered = useMemo(() => {
    let result = observations;
    if (campagne) result = result.filter(o => o.date?.startsWith(campagne));
    if (filterParcelleId) result = result.filter(o => o.parcelle_id === filterParcelleId);
    return result;
  }, [observations, campagne, filterParcelleId]);

  // Group by parcelle+date
  const grouped = useMemo(() => {
    const map = new Map<string, { obs: ObsItem; count: number }>();
    for (const o of filtered) {
      const key = `${o.parcelle_id}-${o.date}`;
      if (!map.has(key)) map.set(key, { obs: o, count: 1 });
      else map.get(key)!.count++;
    }
    return Array.from(map.values());
  }, [filtered]);

  return (
    <div>
      {/* Breadcrumb si filtré */}
      {filterParcelleId && (
        <nav className="flex items-center gap-1.5 text-xs text-gray-400 mb-3">
          <Link href="/" className="hover:text-emerald-600">🏡 Accueil</Link>
          <span>›</span>
          <Link href={`/parcelles/${filterParcelleId}`} className="hover:text-emerald-600">Parcelle</Link>
          <span>›</span>
          <span className="text-gray-700 font-medium">Observations</span>
        </nav>
      )}

      {/* Header */}
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-xl font-bold gradient-text">📝 Observations</h1>
        <SelectField label="" value={campagne} onChange={setCampagne} options={[...CAMPAGNE_OPTIONS]} placeholder="Campagne" />
      </div>

      {/* Action principale */}
      <Link href="/observations/new"
        className="block w-full bg-gradient-to-r from-emerald-500 to-emerald-600 text-white rounded-2xl py-4 text-center font-semibold text-base shadow-lg shadow-emerald-200/40 active:scale-[0.98] transition-all mb-6">
        📝 Enregistrer une nouvelle observation
      </Link>

      {/* Historique */}
      <h2 className="text-sm font-semibold text-gray-600 mb-2">Historique des dernières observations</h2>
      <p className="text-xs text-gray-400 mb-3">{grouped.length} observation{grouped.length !== 1 ? "s" : ""} · Campagne {campagne}</p>

      {loading ? (
        <ListSkeleton count={5} />
      ) : grouped.length === 0 ? (
        <div className="text-center py-16">
          <div className="text-4xl mb-3">📝</div>
          <p className="text-gray-400 mb-4">Aucune observation pour cette campagne</p>
          <Link href="/observations/new" className="inline-block btn-primary px-6 !py-3 !text-sm">
            Enregistrer la première observation →
          </Link>
        </div>
      ) : (
        <div className="space-y-2">
          {grouped.map(({ obs: o, count }) => {
            const isExpanded = expandedId === o.id;
            return (
              <div key={o.id} className={`glass rounded-2xl p-4 transition-all ${isExpanded ? "ring-2 ring-emerald-400/30" : ""}`}>
                <button type="button" onClick={() => setExpandedId(isExpanded ? null : o.id)} className="w-full text-left">
                  <div className="flex justify-between items-start">
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-sm truncate">
                        {getSiteName(o.parcelle_id)} · <span className="text-emerald-700">{getParcelleName(o.parcelle_id)}</span>
                      </div>
                      <div className="text-xs text-gray-500 mt-0.5">
                        {formatDate(o.date)}{o.stade_bbch && ` · BBCH ${o.stade_bbch}`} · {count > 1 ? `${count} rangs` : `R${o.rang}`}
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <span className="text-xs bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-full font-medium">{o.modalite}</span>
                      <span className={`text-gray-400 text-sm transition-transform ${isExpanded ? "rotate-180" : ""}`}>▾</span>
                    </div>
                  </div>
                </button>

                {isExpanded && (
                  <div className="mt-3 pt-3 border-t border-gray-100 space-y-2 animate-fadeIn">
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
                      <Link href={`/parcelles/${o.parcelle_id}`} className="text-xs text-blue-600 font-medium px-3 py-1.5 rounded-lg bg-blue-50 hover:bg-blue-100">👁 Voir détail</Link>
                      <Link href={`/observations/new?duplicate=${o.id}`} className="text-xs text-amber-700 font-medium px-3 py-1.5 rounded-lg bg-amber-50 hover:bg-amber-100">🔄 Reprendre</Link>
                      <button onClick={async () => {
                        if (!confirm("Supprimer cette observation ?")) return;
                        await supabase.from("maladies_observations").delete().eq("observation_id", o.id);
                        await supabase.from("photos").delete().eq("observation_id", o.id);
                        await supabase.from("observations").delete().eq("id", o.id);
                        setObservations(prev => prev.filter(x => x.id !== o.id));
                      }} className="text-xs text-red-500 font-medium px-3 py-1.5 rounded-lg bg-red-50 hover:bg-red-100">🗑 Supprimer</button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
