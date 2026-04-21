"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabase/client";
import { useDemo } from "@/components/DemoProvider";
import { DEMO_TRAITEMENTS, DEMO_VIGNOBLES, DEMO_PARCELLES } from "@/lib/demo-data";
import { Traitement } from "@/lib/types";
import { ListSkeleton } from "@/components/Skeleton";
import { SelectField } from "@/components/ui/SelectField";

const CAMPAGNE_OPTIONS = ["2024", "2025", "2026", "2027"] as const;

function DetailRow({ label, value, unit }: { label: string; value: unknown; unit?: string }) {
  if (value === null || value === undefined || value === "") return null;
  return (
    <div className="flex justify-between py-1 border-b border-gray-50 last:border-0">
      <span className="text-xs text-gray-500">{label}</span>
      <span className="text-xs font-medium text-gray-800">{String(value)}{unit ? ` ${unit}` : ""}</span>
    </div>
  );
}

function TraitementDetail({ t }: { t: Traitement }) {
  const jourDepuis = Math.floor((Date.now() - new Date(t.date).getTime()) / (1000 * 60 * 60 * 24));
  const typeAppLabels: Record<string, string> = { pulve_dos: 'Pulvé à dos', tracteur: 'Tracteur', panneaux_recuperateurs: 'Panneaux récupérateurs' };

  return (
    <div className="mt-3 pt-3 border-t border-gray-100 space-y-3 animate-fadeIn">
      <div className="grid grid-cols-3 gap-2">
        <div className="bg-amber-50 rounded-xl px-3 py-2 text-center">
          <div className="text-sm font-bold text-amber-700">{jourDepuis}j</div>
          <div className="text-[10px] text-amber-600">depuis</div>
        </div>
        {t.stade && (
          <div className="bg-blue-50 rounded-xl px-3 py-2 text-center">
            <div className="text-sm font-bold text-blue-700">Stade {t.stade}</div>
            <div className="text-[10px] text-blue-600">phénologique</div>
          </div>
        )}
        {t.mode && (
          <div className="bg-emerald-50 rounded-xl px-3 py-2 text-center">
            <div className="text-sm font-bold text-emerald-700">{t.mode === 'rang' ? `${t.nb_rangs || '?'} rangs` : `${t.surface_ha || '?'} ha`}</div>
            <div className="text-[10px] text-emerald-600">{t.mode}</div>
          </div>
        )}
      </div>

      {(t.type_application || t.operateur) && (
        <div className="glass rounded-xl p-3">
          <div className="text-xs font-semibold text-gray-600 mb-1.5">🗺️ Application</div>
          <DetailRow label="Type" value={t.type_application ? typeAppLabels[t.type_application] ?? t.type_application : null} />
          <DetailRow label="Opérateur" value={t.operateur} />
        </div>
      )}

      {(t.volume_bouillie_l || t.ph_eau || t.ph_bouillie) && (
        <div className="glass rounded-xl p-3">
          <div className="text-xs font-semibold text-gray-600 mb-1.5">⚗️ Paramètres</div>
          <DetailRow label="Volume bouillie" value={t.volume_bouillie_l} unit="L/ha" />
          <DetailRow label="pH eau" value={t.ph_eau} />
          <DetailRow label="pH bouillie" value={t.ph_bouillie} />
          <DetailRow label="Origine eau" value={t.origine_eau} />
        </div>
      )}

      {(t.temperature !== null || t.humidite !== null || t.couvert) && (
        <div className="glass rounded-xl p-3">
          <div className="text-xs font-semibold text-gray-600 mb-1.5">🌤️ Conditions</div>
          <DetailRow label="Température" value={t.temperature} unit="°C" />
          <DetailRow label="Humidité" value={t.humidite} unit="%" />
          <DetailRow label="Couvert" value={t.couvert} />
        </div>
      )}

      {t.prelevement_sol && (
        <div className="bg-blue-50 rounded-xl px-3 py-2 text-xs text-blue-700 font-medium">🧪 Prélèvement sol effectué</div>
      )}

      {t.notes && (
        <div className="glass rounded-xl p-3">
          <div className="text-xs font-semibold text-gray-600 mb-1">💬 Notes</div>
          <p className="text-xs text-gray-700">{t.notes}</p>
        </div>
      )}
    </div>
  );
}

interface SiteMap { [id: string]: string }
interface ParcelleMap { [id: string]: { nom: string; site_id: string } }

export default function TraitementsPage() {
  const { isDemo } = useDemo();
  const searchParams = useSearchParams();
  const filterParcelleId = searchParams.get("parcelle") || "";
  const [traitements, setTraitements] = useState<Traitement[]>([]);
  const [siteNames, setSiteNames] = useState<SiteMap>({});
  const [parcelleInfo, setParcelleInfo] = useState<ParcelleMap>({});
  const [loading, setLoading] = useState(true);
  const [campagne, setCampagne] = useState(new Date().getFullYear().toString());
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    if (isDemo) {
      setTraitements(DEMO_TRAITEMENTS);
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
      const [tRes, sRes, pRes] = await Promise.all([
        supabase.from("traitements").select("*").order("date", { ascending: false }).limit(50),
        supabase.from("sites").select("id, nom"),
        supabase.from("parcelles").select("id, nom, site_id, vignoble_id"),
      ]);
      if (!tRes.error && tRes.data) setTraitements(tRes.data as Traitement[]);
      const sm: SiteMap = {};
      for (const s of sRes.data ?? []) sm[s.id] = s.nom;
      // Also load vignobles for legacy parcelles
      const { data: vigData } = await supabase.from("vignobles").select("id, nom");
      for (const v of vigData ?? []) sm[v.id] = v.nom;
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

  // Filter by campagne
  const filtered = useMemo(() => {
    let result = traitements;
    if (campagne) result = result.filter(t => t.campagne === campagne || t.date?.startsWith(campagne));
    if (filterParcelleId) result = result.filter(t => t.parcelle_id === filterParcelleId);
    return result;
  }, [traitements, campagne, filterParcelleId]);

  // Deduplicate by date (group multi-rang into one entry)
  const grouped = useMemo(() => {
    const map = new Map<string, { traitement: Traitement; count: number }>();
    for (const t of filtered) {
      const key = `${t.parcelle_id}-${t.date}`;
      if (!map.has(key)) {
        map.set(key, { traitement: t, count: 1 });
      } else {
        map.get(key)!.count++;
      }
    }
    return Array.from(map.values());
  }, [filtered]);

  function getSiteName(parcelleId: string): string {
    const p = parcelleInfo[parcelleId];
    if (!p) return "—";
    return siteNames[p.site_id] || "—";
  }

  function getParcelleName(parcelleId: string): string {
    return parcelleInfo[parcelleId]?.nom || "—";
  }

  return (
    <div>
      {/* Breadcrumb si filtré par parcelle */}
      {filterParcelleId && (
        <nav className="flex items-center gap-1.5 text-xs text-gray-400 mb-3">
          <Link href="/" className="hover:text-emerald-600">🏡 Accueil</Link>
          <span>›</span>
          <Link href={`/parcelles/${filterParcelleId}`} className="hover:text-emerald-600">Parcelle</Link>
          <span>›</span>
          <span className="text-gray-700 font-medium">Traitements</span>
        </nav>
      )}

      {/* Header */}
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-xl font-bold gradient-text">💧 Traitements</h1>
        <SelectField label="" value={campagne} onChange={setCampagne} options={[...CAMPAGNE_OPTIONS]} placeholder="Campagne" />
      </div>

      {/* Action principale */}
      <Link
        href="/traitements/new"
        className="block w-full bg-gradient-to-r from-amber-500 to-amber-600 text-white rounded-2xl py-4 text-center font-semibold text-base shadow-lg shadow-amber-200/40 active:scale-[0.98] transition-all mb-6"
      >
        🧪 Enregistrer un traitement
      </Link>

      {/* Historique récent */}
      <h2 className="text-sm font-semibold text-gray-600 mb-2">Historique récent</h2>
      <p className="text-xs text-gray-400 mb-3">{grouped.length} traitement{grouped.length !== 1 ? "s" : ""} · Campagne {campagne}</p>

      {loading ? (
        <ListSkeleton count={5} />
      ) : grouped.length === 0 ? (
        <div className="text-center py-16">
          <div className="text-4xl mb-3">💧</div>
          <p className="text-gray-400 mb-4">Aucun traitement pour cette campagne</p>
          <Link href="/traitements/new" className="inline-block btn-secondary px-6 !py-3 !text-sm">
            Enregistrer le premier traitement →
          </Link>
        </div>
      ) : (
        <div className="space-y-2">
          {grouped.map(({ traitement: t, count }) => {
            const isExpanded = expandedId === t.id;
            const zoneLabel = t.mode === 'surface'
              ? `${t.surface_ha || '?'} ha`
              : `${t.nb_rangs || count} rang${(t.nb_rangs || count) > 1 ? 's' : ''}`;

            return (
              <div
                key={t.id}
                className={`glass rounded-2xl p-4 transition-all ${isExpanded ? "ring-2 ring-amber-400/30" : ""}`}
              >
                <button
                  type="button"
                  onClick={() => setExpandedId(isExpanded ? null : t.id)}
                  className="w-full text-left"
                >
                  <div className="flex justify-between items-start">
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-sm truncate">
                        {getSiteName(t.parcelle_id)} · <span className="text-amber-700">{getParcelleName(t.parcelle_id)}</span>
                      </div>
                      <div className="text-xs text-gray-500 mt-0.5">
                        {new Date(t.date).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })}
                        {t.stade && ` · Stade ${t.stade}`}
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <span className="text-xs bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-full font-medium">
                        {zoneLabel}
                      </span>
                      <span className={`text-gray-400 text-sm transition-transform ${isExpanded ? "rotate-180" : ""}`}>▾</span>
                    </div>
                  </div>
                </button>

                {isExpanded && (
                  <>
                    <TraitementDetail t={t} />
                    <div className="mt-3 pt-2 border-t border-gray-100 flex justify-end">
                      <Link
                        href={`/traitements/new?site=${parcelleInfo[t.parcelle_id]?.site_id || ""}&parcelle=${t.parcelle_id}`}
                        className="text-xs text-amber-700 font-medium px-3 py-1.5 rounded-lg bg-amber-50 hover:bg-amber-100 transition-colors"
                      >
                        🔄 Reprendre ce traitement
                      </Link>
                    </div>
                  </>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
