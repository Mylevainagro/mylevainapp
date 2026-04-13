"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase/client";
import { calcPourcentageEvolution } from "@/lib/comparaison";
import { Skeleton } from "@/components/Skeleton";

interface PassagesData {
  nb_total: number;
  nb_cuivre: number;
}

function EvolutionBadge({ pct }: { pct: number | null }) {
  if (pct === null) {
    return <span className="text-xs text-gray-400">N-1 = 0</span>;
  }

  // Green for decrease (fewer treatments is good), red for increase
  const isDecrease = pct < 0;
  const isZero = pct === 0;

  if (isZero) {
    return <span className="text-xs text-gray-500">= 0%</span>;
  }

  return (
    <span
      className={`inline-flex items-center text-xs font-medium ${
        isDecrease ? "text-green-600" : "text-red-600"
      }`}
    >
      {isDecrease ? "↓" : "↑"} {Math.abs(Math.round(pct))}%
    </span>
  );
}

export function ComparaisonN1({
  parcelleId,
  campagne,
}: {
  parcelleId: string;
  campagne: string;
}) {
  const [passagesN, setPassagesN] = useState<PassagesData | null>(null);
  const [passagesN1, setPassagesN1] = useState<PassagesData | null>(null);
  const [loading, setLoading] = useState(true);

  const campagneN1 = String(Number(campagne) - 1);

  useEffect(() => {
    async function fetchPassages(camp: string): Promise<PassagesData> {
      const { data } = await supabase
        .from("traitements")
        .select("type_traitement")
        .eq("parcelle_id", parcelleId)
        .eq("campagne", camp);

      const rows = data ?? [];
      return {
        nb_total: rows.length,
        nb_cuivre: rows.filter((r) => r.type_traitement === "cuivre").length,
      };
    }

    async function load() {
      const [n, n1] = await Promise.all([
        fetchPassages(campagne),
        fetchPassages(campagneN1),
      ]);
      setPassagesN(n);
      setPassagesN1(n1);
      setLoading(false);
    }

    load();
  }, [parcelleId, campagne, campagneN1]);

  if (loading) {
    return (
      <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 space-y-2">
        <Skeleton className="h-4 w-1/2" />
        <Skeleton className="h-3 w-3/4" />
        <Skeleton className="h-3 w-3/4" />
      </div>
    );
  }

  if (!passagesN || !passagesN1) {
    return null;
  }

  // If no data at all for N-1, nothing to compare
  if (passagesN1.nb_total === 0 && passagesN.nb_total === 0) {
    return (
      <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 text-sm text-gray-400">
        Aucune donnée de traitement pour {campagne} et {campagneN1}
      </div>
    );
  }

  const pctTotal = calcPourcentageEvolution(passagesN.nb_total, passagesN1.nb_total);
  const pctCuivre = calcPourcentageEvolution(passagesN.nb_cuivre, passagesN1.nb_cuivre);

  return (
    <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
      <h3 className="text-sm font-semibold text-[#8b5e3c] mb-3">
        📊 Comparaison {campagne} vs {campagneN1}
      </h3>

      <div className="space-y-2">
        {/* Total passages */}
        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-600">Passages totaux</span>
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium">
              {passagesN.nb_total}
              <span className="text-gray-400 font-normal"> vs {passagesN1.nb_total}</span>
            </span>
            <EvolutionBadge pct={pctTotal} />
          </div>
        </div>

        {/* Cuivre passages */}
        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-600">Passages cuivre</span>
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium">
              {passagesN.nb_cuivre}
              <span className="text-gray-400 font-normal"> vs {passagesN1.nb_cuivre}</span>
            </span>
            <EvolutionBadge pct={pctCuivre} />
          </div>
        </div>
      </div>
    </div>
  );
}
