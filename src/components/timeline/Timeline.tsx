"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase/client";
import { buildTimeline, filterTimeline, EVENT_TYPE_CONFIG } from "@/lib/timeline";
import type { TimelineEvent } from "@/lib/types";

const EVENT_TYPES = [
  { value: "", label: "Tous" },
  { value: "observation", label: "📋 Observations" },
  { value: "traitement", label: "💧 Traitements" },
  { value: "analyse_sol", label: "🧪 Analyses sol" },
] as const;

interface TimelineProps {
  parcelleId: string;
}

export function Timeline({ parcelleId }: TimelineProps) {
  const router = useRouter();
  const [allEvents, setAllEvents] = useState<TimelineEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState<{ type?: string; date_debut?: string; date_fin?: string }>({});

  useEffect(() => {
    async function fetchData() {
      setLoading(true);

      const [obsRes, traitRes, analyseRes] = await Promise.all([
        supabase.from("observations").select("*").eq("parcelle_id", parcelleId),
        supabase.from("traitements").select("*").eq("parcelle_id", parcelleId),
        supabase.from("analyses_sol").select("*").eq("parcelle_id", parcelleId),
      ]);

      const timeline = buildTimeline(
        obsRes.data ?? [],
        traitRes.data ?? [],
        analyseRes.data ?? []
      );

      setAllEvents(timeline);
      setLoading(false);
    }
    fetchData();
  }, [parcelleId]);

  const filtered = filterTimeline(allEvents, filters);

  const handleClick = (event: TimelineEvent) => {
    switch (event.type) {
      case "observation":
        router.push(`/observations?id=${event.id}`);
        break;
      case "traitement":
        router.push(`/traitements?id=${event.id}`);
        break;
      case "analyse_sol":
        router.push(`/import/analyse-sol?id=${event.id}`);
        break;
    }
  };

  const borderColor = (couleur: string) => {
    switch (couleur) {
      case "green": return "border-green-500";
      case "brown": return "border-amber-700";
      case "blue": return "border-blue-500";
      default: return "border-gray-300";
    }
  };

  const dotColor = (couleur: string) => {
    switch (couleur) {
      case "green": return "bg-green-500";
      case "brown": return "bg-amber-700";
      case "blue": return "bg-blue-500";
      default: return "bg-gray-400";
    }
  };

  if (loading) {
    return <div className="text-center text-gray-400 py-8">Chargement de la timeline…</div>;
  }

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-wrap gap-2">
        <select
          value={filters.type || ""}
          onChange={(e) => setFilters((f) => ({ ...f, type: e.target.value || undefined }))}
          className="rounded-lg border border-gray-200 px-3 py-2 text-sm bg-white"
        >
          {EVENT_TYPES.map((t) => (
            <option key={t.value} value={t.value}>{t.label}</option>
          ))}
        </select>
        <input
          type="date"
          value={filters.date_debut || ""}
          onChange={(e) => setFilters((f) => ({ ...f, date_debut: e.target.value || undefined }))}
          className="rounded-lg border border-gray-200 px-3 py-2 text-sm bg-white"
          placeholder="Date début"
        />
        <input
          type="date"
          value={filters.date_fin || ""}
          onChange={(e) => setFilters((f) => ({ ...f, date_fin: e.target.value || undefined }))}
          className="rounded-lg border border-gray-200 px-3 py-2 text-sm bg-white"
          placeholder="Date fin"
        />
      </div>

      {/* Count */}
      <p className="text-xs text-gray-500">
        {filtered.length} événement{filtered.length !== 1 ? "s" : ""}
      </p>

      {/* Vertical timeline */}
      {filtered.length === 0 ? (
        <p className="text-center text-gray-400 py-8">Aucun événement pour cette parcelle.</p>
      ) : (
        <div className="relative pl-6">
          {/* Vertical line */}
          <div className="absolute left-2.5 top-0 bottom-0 w-0.5 bg-gray-200" />

          <div className="space-y-4">
            {filtered.map((event) => (
              <button
                key={`${event.type}-${event.id}`}
                onClick={() => handleClick(event)}
                className={`relative w-full text-left bg-white rounded-xl p-4 shadow-sm border-l-4 ${borderColor(event.couleur)} hover:shadow-md transition`}
              >
                {/* Dot on the line */}
                <div className={`absolute -left-[1.15rem] top-5 w-3 h-3 rounded-full ${dotColor(event.couleur)} ring-2 ring-white`} />

                <div className="flex items-start gap-2">
                  <span className="text-lg">{event.icone}</span>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-sm text-gray-900">{event.titre}</div>
                    <div className="text-xs text-gray-500 mt-0.5">{event.date}</div>
                    {event.resume && (
                      <div className="text-xs text-gray-400 mt-1 truncate">{event.resume}</div>
                    )}
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
