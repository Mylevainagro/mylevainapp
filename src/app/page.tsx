"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/components/AuthProvider";
import { useDemo } from "@/components/DemoProvider";
import { supabase } from "@/lib/supabase/client";
import { DEMO_STATS, DEMO_VIGNOBLES, DEMO_OBSERVATIONS, DEMO_TRAITEMENTS, DEMO_ANALYSES } from "@/lib/demo-data";

interface SiteDisplay {
  id: string;
  nom: string;
  localisation: string | null;
  type: string | null;
  emoji: string;
  derniere_observation: string | null;
  dernier_traitement: string | null;
}

interface CampagneStats {
  nb_observations: number;
  nb_traitements: number;
  nb_analyses: number;
}

const TYPE_EMOJI: Record<string, string> = {
  chateau: "🏰", domaine: "🍇", exploitation: "🌾", ferme: "🏠", serre: "🌿",
};

function formatDate(d: string | null): string {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("fr-FR", { day: "numeric", month: "short" });
}

export default function HomePage() {
  const { user, logout } = useAuth();
  const { isDemo } = useDemo();
  const [mySites, setMySites] = useState<SiteDisplay[]>([]);
  const [stats, setStats] = useState<CampagneStats>({ nb_observations: 0, nb_traitements: 0, nb_analyses: 0 });

  useEffect(() => {
    if (isDemo) {
      // Build demo sites with last dates
      const sitesMap: Record<string, SiteDisplay> = {};
      for (const v of DEMO_VIGNOBLES) {
        sitesMap[v.id] = {
          id: v.id, nom: v.nom, localisation: v.localisation,
          type: v.appellation, emoji: TYPE_EMOJI[v.type_site ?? ""] ?? "📍",
          derniere_observation: null, dernier_traitement: null,
        };
      }
      // Find last obs/trait per site (via parcelle_id → vignoble_id)
      for (const obs of DEMO_OBSERVATIONS) {
        const site = sitesMap["demo-ct"]; // demo obs are all on demo-ct
        if (site && (!site.derniere_observation || obs.date > site.derniere_observation)) {
          site.derniere_observation = obs.date;
        }
      }
      for (const t of DEMO_TRAITEMENTS) {
        const site = sitesMap["demo-ct"];
        if (site && (!site.dernier_traitement || t.date > site.dernier_traitement)) {
          site.dernier_traitement = t.date;
        }
      }
      setMySites(Object.values(sitesMap));
      setStats({
        nb_observations: DEMO_STATS.nb_observations,
        nb_traitements: DEMO_STATS.nb_traitements,
        nb_analyses: DEMO_STATS.nb_analyses,
      });
      return;
    }

    async function load() {
      // Load sites + vignobles
      const [sitesRes, vigRes] = await Promise.all([
        supabase.from("sites").select("id, nom, type_site, type_exploitation, localisation, adresse").order("nom"),
        supabase.from("vignobles").select("id, nom, localisation, appellation").order("nom"),
      ]);

      // Load parcelles to map parcelle_id → site/vignoble
      const { data: parcData } = await supabase.from("parcelles").select("id, vignoble_id, site_id");
      const parcelleToSite: Record<string, string> = {};
      for (const p of (parcData ?? []) as { id: string; vignoble_id: string; site_id: string | null }[]) {
        parcelleToSite[p.id] = p.site_id || p.vignoble_id;
      }

      // Load counts + last dates
      const [obsRes, traitRes, analyseRes] = await Promise.all([
        supabase.from("observations").select("parcelle_id, date").order("date", { ascending: false }),
        supabase.from("traitements").select("parcelle_id, date").order("date", { ascending: false }),
        supabase.from("analyses_sol").select("id"),
      ]);

      // Build last dates per site
      const lastObs: Record<string, string> = {};
      const lastTrait: Record<string, string> = {};
      for (const o of (obsRes.data ?? []) as { parcelle_id: string; date: string }[]) {
        const siteId = parcelleToSite[o.parcelle_id];
        if (siteId && !lastObs[siteId]) lastObs[siteId] = o.date;
      }
      for (const t of (traitRes.data ?? []) as { parcelle_id: string; date: string }[]) {
        const siteId = parcelleToSite[t.parcelle_id];
        if (siteId && !lastTrait[siteId]) lastTrait[siteId] = t.date;
      }

      const items: SiteDisplay[] = [];
      for (const s of sitesRes.data ?? []) {
        const typeKey = s.type_exploitation || s.type_site || "";
        items.push({
          id: s.id, nom: s.nom, localisation: s.localisation || s.adresse,
          type: typeKey, emoji: TYPE_EMOJI[typeKey] ?? "📍",
          derniere_observation: lastObs[s.id] ?? null,
          dernier_traitement: lastTrait[s.id] ?? null,
        });
      }
      for (const v of vigRes.data ?? []) {
        items.push({
          id: v.id, nom: v.nom, localisation: v.localisation,
          type: v.appellation, emoji: "🍇",
          derniere_observation: lastObs[v.id] ?? null,
          dernier_traitement: lastTrait[v.id] ?? null,
        });
      }
      setMySites(items);
      setStats({
        nb_observations: obsRes.data?.length ?? 0,
        nb_traitements: traitRes.data?.length ?? 0,
        nb_analyses: analyseRes.data?.length ?? 0,
      });
    }
    load();
  }, [isDemo]);

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
            onClick={() => { if (confirm('Se déconnecter ?')) logout(); }}
            className="w-8 h-8 rounded-lg bg-gray-100 hover:bg-red-50 hover:text-red-600 flex items-center justify-center text-xs transition-colors"
            title="Déconnexion"
          >
            ↪
          </button>
        </div>
      </div>

      {/* Stats campagne */}
      <div className="flex gap-2 mb-6">
        <div className="flex-1 glass rounded-2xl p-3 text-center">
          <div className="text-xl font-bold text-emerald-700">{stats.nb_observations}</div>
          <div className="text-[10px] text-gray-500 font-medium">📝 Observations</div>
        </div>
        <div className="flex-1 glass rounded-2xl p-3 text-center">
          <div className="text-xl font-bold text-amber-700">{stats.nb_traitements}</div>
          <div className="text-[10px] text-gray-500 font-medium">💧 Traitements</div>
        </div>
        <div className="flex-1 glass rounded-2xl p-3 text-center">
          <div className="text-xl font-bold text-blue-700">{stats.nb_analyses}</div>
          <div className="text-[10px] text-gray-500 font-medium">🧪 Analyses</div>
        </div>
      </div>

      {/* Actions rapides */}
      <div className="grid grid-cols-2 gap-3 mb-4">
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

      {/* Export & Rapport */}
      <div className="grid grid-cols-2 gap-2 mb-6">
        <Link href="/export" className="glass rounded-2xl p-3 text-center active:scale-95 transition-all">
          <div className="text-xl mb-1">📥</div>
          <div className="text-[10px] font-medium text-gray-600">Export</div>
        </Link>
        <Link href="/rapport" className="glass rounded-2xl p-3 text-center active:scale-95 transition-all">
          <div className="text-xl mb-1">📄</div>
          <div className="text-[10px] font-medium text-gray-600">Rapport PDF</div>
        </Link>
      </div>

      {/* Mes sites */}
      <h2 className="text-lg font-bold text-gray-800 mb-3">Mes sites</h2>
      {mySites.length === 0 ? (
        <div className="glass rounded-2xl p-6 text-center mb-6">
          <div className="text-3xl mb-2">🌱</div>
          <p className="text-sm text-gray-500 mb-3">Aucun site configuré</p>
          {user?.role === 'admin' && (
            <Link href="/admin" className="text-sm text-emerald-600 font-medium hover:underline">
              Créer un site dans Admin →
            </Link>
          )}
        </div>
      ) : (
        <div className="space-y-3 mb-6">
          {mySites.map((s) => (
            <Link
              key={s.id}
              href={`/vignobles/${s.id}`}
              className="block glass rounded-2xl p-4 active:scale-[0.98] transition-all"
            >
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-emerald-100 to-emerald-200 flex items-center justify-center text-2xl shadow-sm shrink-0">
                  {s.emoji}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-gray-800">{s.nom}</div>
                  <div className="text-sm text-gray-500">{s.localisation || "—"}</div>
                  {s.type && (
                    <div className="text-xs text-amber-600 mt-0.5 font-medium">{s.type}</div>
                  )}
                </div>
                <div className="text-gray-300 text-lg">›</div>
              </div>
              {/* Dernières dates */}
              <div className="flex gap-4 mt-3 pt-3 border-t border-gray-100">
                <div className="flex items-center gap-1.5 text-xs text-gray-500">
                  <span>📝</span>
                  <span>Obs : <strong className="text-gray-700">{formatDate(s.derniere_observation)}</strong></span>
                </div>
                <div className="flex items-center gap-1.5 text-xs text-gray-500">
                  <span>💧</span>
                  <span>Trait : <strong className="text-gray-700">{formatDate(s.dernier_traitement)}</strong></span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}

      {/* Footer */}
      <div className="text-center text-xs text-gray-400 mb-4">
        MyLevain Agro Intelligence © 2026
      </div>
    </div>
  );
}
