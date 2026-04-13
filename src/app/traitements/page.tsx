"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase/client";
import { Traitement } from "@/lib/types";
import { ListSkeleton } from "@/components/Skeleton";
import { SelectField } from "@/components/ui/SelectField";
import { filterTraitements } from "@/lib/traitements";

const CAMPAGNE_OPTIONS = ["2023", "2024", "2025", "2026"] as const;
const TYPE_TRAITEMENT_OPTIONS = [
  "cuivre", "soufre", "levain", "biocontrole",
  "phytosanitaire", "fertilisation", "autre",
] as const;

export default function TraitementsPage() {
  const [traitements, setTraitements] = useState<Traitement[]>([]);
  const [loading, setLoading] = useState(true);
  const [campagneFilter, setCampagneFilter] = useState("");
  const [typeFilter, setTypeFilter] = useState("");

  useEffect(() => {
    async function load() {
      const { data, error } = await supabase
        .from("traitements")
        .select("*")
        .order("date", { ascending: false })
        .limit(50);
      if (!error && data) setTraitements(data as Traitement[]);
      setLoading(false);
    }
    load();
  }, []);

  const filtered = useMemo(() => {
    const filters: { campagne?: string; type_traitement?: string } = {};
    if (campagneFilter) filters.campagne = campagneFilter;
    if (typeFilter) filters.type_traitement = typeFilter;
    return filterTraitements(traitements, filters);
  }, [traitements, campagneFilter, typeFilter]);

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-xl font-bold text-[#2d5016]">💧 Traitements</h1>
        <Link href="/traitements/new" className="bg-[#8b5e3c] text-white rounded-lg px-4 py-2 text-sm font-medium shadow-sm active:scale-95">
          + Nouveau
        </Link>
      </div>

      {/* Filtres campagne & type_traitement */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        <SelectField
          label="Campagne"
          value={campagneFilter}
          onChange={setCampagneFilter}
          options={CAMPAGNE_OPTIONS}
          placeholder="Toutes"
        />
        <SelectField
          label="Type"
          value={typeFilter}
          onChange={setTypeFilter}
          options={TYPE_TRAITEMENT_OPTIONS}
          placeholder="Tous"
        />
      </div>

      {loading ? (
        <ListSkeleton count={3} />
      ) : filtered.length === 0 ? (
        traitements.length === 0 ? (
          <div className="text-center py-16">
            <div className="text-4xl mb-3">💧</div>
            <p className="text-gray-400 mb-4">Aucun traitement enregistré</p>
            <Link
              href="/traitements/new"
              className="inline-block bg-[#8b5e3c] text-white rounded-xl px-6 py-3 font-medium shadow-sm"
            >
              Enregistrer le premier traitement →
            </Link>
          </div>
        ) : (
          <div className="text-center py-12">
            <p className="text-gray-400">Aucun traitement ne correspond aux filtres</p>
          </div>
        )
      ) : (
        <div className="space-y-2">
          {filtered.map((t) => (
            <div key={t.id} className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 active:bg-gray-50 transition-colors">
              <div className="flex justify-between items-start">
                <div>
                  <div className="font-medium text-sm">
                    Rang {t.rang} — <span className="text-[#8b5e3c]">{t.modalite}</span>
                  </div>
                  <div className="text-xs text-gray-500 mt-0.5">
                    {new Date(t.date).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })}
                    {t.dose && ` — ${t.dose}`}
                  </div>
                </div>
                <div className="flex items-center gap-1.5">
                  {t.type_traitement && (
                    <span className="text-xs bg-[#2d5016]/10 text-[#2d5016] px-2 py-0.5 rounded-full font-medium">
                      {t.type_traitement}
                    </span>
                  )}
                  <span className="text-xs bg-[#8b5e3c]/10 text-[#8b5e3c] px-2.5 py-1 rounded-full font-medium">
                    {t.produit}
                  </span>
                </div>
              </div>
              {t.notes && (
                <p className="text-xs text-gray-500 mt-2 line-clamp-2">{t.notes}</p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
