"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase/client";
import { Observation } from "@/lib/types";
import { SelectField } from "@/components/ui/SelectField";
import { ListSkeleton } from "@/components/Skeleton";

export default function ObservationsPage() {
  const [observations, setObservations] = useState<Observation[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterRang, setFilterRang] = useState("");
  const [filterMois, setFilterMois] = useState("");

  useEffect(() => {
    async function load() {
      const { data, error } = await supabase
        .from("observations")
        .select("*")
        .order("date", { ascending: false })
        .limit(100);
      if (!error && data) setObservations(data as Observation[]);
      setLoading(false);
    }
    load();
  }, []);

  const filtered = observations.filter((o) => {
    if (filterRang && o.rang !== Number(filterRang)) return false;
    if (filterMois && o.mois !== filterMois) return false;
    return true;
  });

  return (
    <div>
      <h1 className="text-xl font-bold text-[#2d5016] mb-4">📋 Historique</h1>

      <div className="grid grid-cols-2 gap-3 mb-4">
        <SelectField label="Rang" value={filterRang} onChange={setFilterRang} options={["1","2","3","4","5","6","7"]} placeholder="Tous" />
        <SelectField label="Mois" value={filterMois} onChange={setFilterMois} options={["mars","avril","mai","juin","juillet","août","septembre","octobre","novembre","décembre"]} placeholder="Tous" />
      </div>

      {loading ? (
        <ListSkeleton count={4} />
      ) : filtered.length === 0 ? (
        <div className="text-center py-16">
          <div className="text-4xl mb-3">🌱</div>
          <p className="text-gray-400 mb-4">Aucune observation pour le moment</p>
          <Link
            href="/observations/new"
            className="inline-block bg-[#2d5016] text-white rounded-xl px-6 py-3 font-medium shadow-sm"
          >
            Créer la première observation →
          </Link>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((obs) => (
            <div
              key={obs.id}
              className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 active:bg-gray-50 transition-colors"
            >
              <div className="flex justify-between items-start">
                <div>
                  <div className="font-medium text-sm">
                    Rang {obs.rang} — <span className="text-[#2d5016]">{obs.modalite}</span>
                  </div>
                  <div className="text-xs text-gray-500 mt-0.5">
                    {new Date(obs.date).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })}
                    {obs.heure && ` à ${obs.heure}`}
                  </div>
                </div>
                <div className="flex gap-1.5">
                  {obs.score_plante !== null && (
                    <span className="bg-green-50 text-green-700 px-2 py-0.5 rounded-full text-xs font-medium">
                      🌿 {obs.score_plante}
                    </span>
                  )}
                  {obs.score_sanitaire !== null && (
                    <span className="bg-orange-50 text-orange-700 px-2 py-0.5 rounded-full text-xs font-medium">
                      🛡️ {obs.score_sanitaire}
                    </span>
                  )}
                </div>
              </div>
              {obs.commentaires && (
                <p className="text-xs text-gray-500 mt-2 line-clamp-2">{obs.commentaires}</p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
