"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase/client";

interface Recommandation {
  id: string;
  type: string;
  priorite: string;
  message: string;
}

const PRIORITE_STYLES: Record<string, { bg: string; text: string; label: string; icon: string }> = {
  critique: { bg: "bg-red-50 border-red-300", text: "text-red-700", label: "Critique", icon: "🔴" },
  elevee: { bg: "bg-orange-50 border-orange-300", text: "text-orange-700", label: "Élevée", icon: "🟠" },
  moderee: { bg: "bg-amber-50 border-amber-300", text: "text-amber-700", label: "Modérée", icon: "🟡" },
  moyenne: { bg: "bg-yellow-50 border-yellow-300", text: "text-yellow-700", label: "Moyenne", icon: "🟡" },
  faible: { bg: "bg-blue-50 border-blue-300", text: "text-blue-700", label: "Faible", icon: "🔵" },
  optionnel: { bg: "bg-gray-50 border-gray-300", text: "text-gray-600", label: "Optionnel", icon: "⚪" },
};

interface Props {
  stadeCode: string; // ex: "23", "09"
}

export function RecommandationBbch({ stadeCode }: Props) {
  const [recos, setRecos] = useState<Recommandation[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!stadeCode) {
      setRecos([]);
      return;
    }

    setLoading(true);
    async function load() {
      // Fetch all recommandations and filter client-side (BBCH is text, need numeric comparison)
      const { data } = await supabase
        .from("recommandations_bbch")
        .select("id, type, priorite, message, bbch_min, bbch_max")
        .eq("actif", true);

      if (data) {
        const code = parseInt(stadeCode, 10);
        const matched = data.filter((r: { bbch_min: string; bbch_max: string }) => {
          const min = parseInt(r.bbch_min, 10);
          const max = parseInt(r.bbch_max, 10);
          return code >= min && code <= max;
        });
        setRecos(matched);
      } else {
        setRecos([]);
      }
      setLoading(false);
    }
    load();
  }, [stadeCode]);

  if (!stadeCode || loading) return null;
  if (recos.length === 0) return null;

  return (
    <div className="space-y-2 mt-3">
      <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider flex items-center gap-1.5">
        <span>💡</span> Recommandations
      </div>
      {recos.map((r) => {
        const style = PRIORITE_STYLES[r.priorite] ?? PRIORITE_STYLES.optionnel;
        return (
          <div key={r.id} className={`${style.bg} border rounded-xl p-3 space-y-1`}>
            <div className="flex items-center justify-between">
              <span className={`text-xs font-semibold ${style.text}`}>
                {style.icon} {r.type}
              </span>
              <span className={`text-[10px] font-bold ${style.text} bg-white/60 px-2 py-0.5 rounded-full`}>
                {style.label}
              </span>
            </div>
            <p className="text-xs text-gray-700 leading-relaxed">{r.message}</p>
          </div>
        );
      })}
      <p className="text-[10px] text-gray-400 italic">ℹ️ Ces recommandations sont indicatives et ne remplacent pas l&apos;expertise terrain.</p>
    </div>
  );
}
