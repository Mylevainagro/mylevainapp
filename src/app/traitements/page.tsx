"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase/client";
import { useDemo } from "@/components/DemoProvider";
import { DEMO_TRAITEMENTS } from "@/lib/demo-data";
import { Traitement } from "@/lib/types";
import { ListSkeleton } from "@/components/Skeleton";
import { SelectField } from "@/components/ui/SelectField";
import { filterTraitements } from "@/lib/traitements";

const CAMPAGNE_OPTIONS = ["2023", "2024", "2025", "2026"] as const;
const TYPE_TRAITEMENT_OPTIONS = [
  "cuivre", "soufre", "levain", "biocontrole",
  "phytosanitaire", "fertilisation", "autre",
] as const;

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
      {/* Résumé rapide */}
      <div className="grid grid-cols-3 gap-2">
        <div className="bg-amber-50 rounded-xl px-3 py-2 text-center">
          <div className="text-sm font-bold text-amber-700">{jourDepuis}j</div>
          <div className="text-[10px] text-amber-600">depuis</div>
        </div>
        {t.type_traitement && (
          <div className="bg-emerald-50 rounded-xl px-3 py-2 text-center">
            <div className="text-sm font-bold text-emerald-700">{t.type_traitement}</div>
            <div className="text-[10px] text-emerald-600">type</div>
          </div>
        )}
        {t.stade && (
          <div className="bg-blue-50 rounded-xl px-3 py-2 text-center">
            <div className="text-sm font-bold text-blue-700">Stade {t.stade}</div>
            <div className="text-[10px] text-blue-600">phénologique</div>
          </div>
        )}
      </div>

      {/* Zone traitée */}
      {(t.zone_traitee_type || t.type_application) && (
        <div className="glass rounded-xl p-3">
          <div className="text-xs font-semibold text-gray-600 mb-1.5">🗺️ Zone & Application</div>
          <DetailRow label="Zone" value={t.zone_traitee_type === 'rang' ? `Rang ${t.zone_traitee_rang ?? ''}` : t.zone_traitee_surface_m2 ? `${t.zone_traitee_surface_m2} m²` : null} />
          <DetailRow label="Type application" value={t.type_application ? typeAppLabels[t.type_application] ?? t.type_application : null} />
          <DetailRow label="Opérateur" value={t.operateur} />
        </div>
      )}

      {/* Produit & pH */}
      <div className="glass rounded-xl p-3">
        <div className="text-xs font-semibold text-gray-600 mb-1.5">🧪 Produit & pH</div>
        <DetailRow label="Produit" value={t.produit} />
        <DetailRow label="Dose" value={t.dose} />
        <DetailRow label="Volume bouillie" value={t.volume_bouillie_l} unit="L" />
        <DetailRow label="pH eau" value={t.ph_eau} />
        <DetailRow label="pH bouillie" value={t.ph_bouillie} />
        <DetailRow label="Origine eau" value={t.origine_eau} />
      </div>

      {/* Détails traitement */}
      {(t.matiere_active || t.concentration !== null || t.objectif) && (
        <div className="glass rounded-xl p-3">
          <div className="text-xs font-semibold text-gray-600 mb-1.5">🔬 Détails</div>
          <DetailRow label="Matière active" value={t.matiere_active} />
          <DetailRow label="Concentration" value={t.concentration} unit={t.unite ?? ""} />
          <DetailRow label="Objectif" value={t.objectif} />
        </div>
      )}

      {/* Conditions météo */}
      {(t.temperature !== null || t.humidite !== null || t.couvert) && (
        <div className="glass rounded-xl p-3">
          <div className="text-xs font-semibold text-gray-600 mb-1.5">🌤️ Conditions</div>
          <DetailRow label="Température" value={t.temperature} unit="°C" />
          <DetailRow label="Humidité" value={t.humidite} unit="%" />
          <DetailRow label="Couvert" value={t.couvert} />
          <DetailRow label="Météo" value={t.conditions_meteo} />
        </div>
      )}

      {/* Cas spécial */}
      {t.prelevement_sol && (
        <div className="glass rounded-xl p-3">
          <div className="text-xs font-semibold text-gray-600 mb-1.5">🔍 Cas spécial</div>
          <DetailRow label="Prélèvement sol" value="Oui 🧪" />
        </div>
      )}

      {/* Notes */}
      {t.notes && (
        <div className="glass rounded-xl p-3">
          <div className="text-xs font-semibold text-gray-600 mb-1">💬 Notes</div>
          <p className="text-xs text-gray-700">{t.notes}</p>
        </div>
      )}
    </div>
  );
}

export default function TraitementsPage() {
  const { isDemo } = useDemo();
  const [traitements, setTraitements] = useState<Traitement[]>([]);
  const [loading, setLoading] = useState(true);
  const [campagneFilter, setCampagneFilter] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    if (isDemo) {
      setTraitements(DEMO_TRAITEMENTS);
      setLoading(false);
      return;
    }
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
  }, [isDemo]);

  const filtered = useMemo(() => {
    const filters: { campagne?: string; type_traitement?: string } = {};
    if (campagneFilter) filters.campagne = campagneFilter;
    if (typeFilter) filters.type_traitement = typeFilter;
    return filterTraitements(traitements, filters);
  }, [traitements, campagneFilter, typeFilter]);

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-xl font-bold gradient-text">💧 Traitements</h1>
        <Link href="/traitements/new" className="bg-gradient-to-r from-amber-500 to-amber-600 text-white rounded-xl px-4 py-2 text-sm font-medium shadow-sm active:scale-95">
          + Nouveau
        </Link>
      </div>

      <div className="grid grid-cols-2 gap-3 mb-4">
        <SelectField label="Campagne" value={campagneFilter} onChange={setCampagneFilter} options={CAMPAGNE_OPTIONS} placeholder="Toutes" />
        <SelectField label="Type" value={typeFilter} onChange={setTypeFilter} options={TYPE_TRAITEMENT_OPTIONS} placeholder="Tous" />
      </div>

      <p className="text-xs text-gray-400 mb-2">{filtered.length} traitement{filtered.length !== 1 ? "s" : ""}</p>

      {loading ? (
        <ListSkeleton count={3} />
      ) : filtered.length === 0 ? (
        traitements.length === 0 ? (
          <div className="text-center py-16">
            <div className="text-4xl mb-3">💧</div>
            <p className="text-gray-400 mb-4">Aucun traitement enregistré</p>
            <Link href="/traitements/new" className="inline-block btn-secondary px-6 !py-3 !text-sm">
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
          {filtered.map((t) => {
            const isExpanded = expandedId === t.id;
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
                    <div>
                      <div className="font-medium text-sm">
                        Rang {t.rang} — <span className="text-amber-700">{t.modalite}</span>
                      </div>
                      <div className="text-xs text-gray-500 mt-0.5">
                        {new Date(t.date).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })}
                        {t.stade && ` · Stade ${t.stade}`}
                        {t.dose && ` — ${t.dose}`}
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5">
                      {t.type_traitement && (
                        <span className="text-xs bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-full font-medium">
                          {t.type_traitement}
                        </span>
                      )}
                      <span className="text-xs bg-amber-50 text-amber-700 px-2 py-0.5 rounded-full font-medium">
                        {t.produit}
                      </span>
                      <span className={`text-gray-400 text-sm transition-transform ${isExpanded ? "rotate-180" : ""}`}>
                        ▾
                      </span>
                    </div>
                  </div>
                  {!isExpanded && t.notes && (
                    <p className="text-xs text-gray-400 mt-1.5 line-clamp-1">{t.notes}</p>
                  )}
                </button>

                {isExpanded && <TraitementDetail t={t} />}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
