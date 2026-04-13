"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase/client";
import { Skeleton } from "@/components/Skeleton";

interface DernierTraitement {
  date: string;
  produit: string;
  type_traitement: string | null;
  dose: string | null;
}

export function DernierTraitementCard({ parcelleId }: { parcelleId: string }) {
  const [traitement, setTraitement] = useState<DernierTraitement | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetch() {
      const { data } = await supabase
        .from("traitements")
        .select("date, produit, type_traitement, dose")
        .eq("parcelle_id", parcelleId)
        .order("date", { ascending: false })
        .limit(1)
        .single();
      setTraitement(data ?? null);
      setLoading(false);
    }
    fetch();
  }, [parcelleId]);

  if (loading) {
    return (
      <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 space-y-2">
        <Skeleton className="h-4 w-1/2" />
        <Skeleton className="h-3 w-3/4" />
        <Skeleton className="h-3 w-1/3" />
      </div>
    );
  }

  if (!traitement) {
    return (
      <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 text-sm text-gray-400">
        Aucun traitement enregistré
      </div>
    );
  }

  const jourDepuis = Math.floor(
    (Date.now() - new Date(traitement.date).getTime()) / (1000 * 60 * 60 * 24)
  );

  return (
    <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-semibold text-[#8b5e3c]">💧 Dernier traitement</span>
        <span className="text-xs text-gray-500">il y a {jourDepuis} j</span>
      </div>
      <div className="text-sm">
        <span className="font-medium">{traitement.produit}</span>
        {traitement.type_traitement && (
          <span className="ml-2 text-xs bg-[#8b5e3c]/10 text-[#8b5e3c] rounded px-1.5 py-0.5">
            {traitement.type_traitement}
          </span>
        )}
      </div>
      <div className="text-xs text-gray-500 mt-1">
        {traitement.date}{traitement.dose ? ` — ${traitement.dose}` : ""}
      </div>
    </div>
  );
}
