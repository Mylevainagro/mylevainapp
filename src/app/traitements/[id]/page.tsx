"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase/client";
import { ListSkeleton } from "@/components/Skeleton";

interface TraitDetail { id: string; parcelle_id: string; date: string; stade: string | null; mode: string | null; nb_rangs: number | null; surface_ha: number | null; operateur: string | null; temperature: number | null; humidite: number | null; couvert: string | null; type_application: string | null; prelevement_sol: boolean | null; volume_bouillie_l: number | null; ph_eau: number | null; ph_bouillie: number | null; origine_eau: string | null; notes: string | null; heure: string | null; latitude: number | null; longitude: number | null; }
interface RangDetail { rang: string; modalite_id: string; dose: string | null; commentaire: string | null; }
interface ParcelleRangInfo { rang: number; modalite_code: string | null; produit: string | null; dose: string | null; produit2: string | null; dose2: string | null; temoin: boolean; }

function Row({ label, value, unit }: { label: string; value: unknown; unit?: string }) {
  if (value === null || value === undefined || value === "") return null;
  return <div className="flex justify-between py-1.5 border-b border-gray-50 last:border-0"><span className="text-xs text-gray-500">{label}</span><span className="text-xs font-medium text-gray-800">{String(value)}{unit ? ` ${unit}` : ""}</span></div>;
}

const APP_LABELS: Record<string, string> = { pulve_dos: "Pulvé à dos", tracteur: "Tracteur", panneaux_recuperateurs: "Panneaux récupérateurs" };

export default function TraitementDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [trait, setTrait] = useState<TraitDetail | null>(null);
  const [rangs, setRangs] = useState<RangDetail[]>([]);
  const [parcelleRangs, setParcelleRangs] = useState<ParcelleRangInfo[]>([]);
  const [siteName, setSiteName] = useState("");
  const [parcelleName, setParcelleName] = useState("");
  const [siteId, setSiteId] = useState("");

  useEffect(() => {
    async function load() {
      const { data: t } = await supabase.from("traitements").select("*").eq("id", id).single();
      if (!t) { setLoading(false); return; }
      setTrait(t);
      // Rangs
      const { data: rData } = await supabase.from("traitement_rangs").select("rang, modalite_id, dose, commentaire").eq("traitement_id", id).order("rang");
      if (rData) setRangs(rData);
      // Parcelle rangs (dilution info)
      const { data: prData } = await supabase.from("parcelle_rangs").select("rang, modalite_code, produit, dose, produit2, dose2, temoin").eq("parcelle_id", t.parcelle_id).order("rang");
      if (prData) setParcelleRangs(prData);
      // Parcelle + site
      const { data: p } = await supabase.from("parcelles").select("nom, site_id, vignoble_id").eq("id", t.parcelle_id).single();
      if (p) { setParcelleName(p.nom); const sid = p.site_id || p.vignoble_id; setSiteId(sid || ""); if (sid) { const { data: s } = await supabase.from("sites").select("nom").eq("id", sid).single(); if (s) setSiteName(s.nom); } }
      setLoading(false);
    }
    load();
  }, [id]);

  async function handleDelete() {
    if (!confirm("Supprimer ce traitement ?")) return;
    await supabase.from("traitement_rangs").delete().eq("traitement_id", id);
    await supabase.from("traitements").delete().eq("id", id);
    router.push(trait?.parcelle_id ? `/parcelles/${trait.parcelle_id}` : "/traitements");
  }

  if (loading) return <div className="pt-4"><ListSkeleton count={4} /></div>;
  if (!trait) return <div className="text-center py-16"><div className="text-4xl mb-3">🔍</div><p className="text-gray-400 mb-4">Traitement non trouvé</p><Link href="/traitements" className="text-sm text-emerald-600 font-medium hover:underline">← Retour</Link></div>;

  return (
    <div>
      {/* Fil d'Ariane */}
      <nav className="flex items-center gap-1.5 text-xs text-gray-400 mb-3 flex-wrap">
        <Link href="/" className="hover:text-emerald-600">🏡 Accueil</Link><span>›</span>
        {siteId && <><Link href={`/vignobles/${siteId}`} className="hover:text-emerald-600">{siteName}</Link><span>›</span></>}
        {trait.parcelle_id && <><Link href={`/parcelles/${trait.parcelle_id}`} className="hover:text-emerald-600">{parcelleName}</Link><span>›</span></>}
        <span className="text-gray-700 font-medium">Traitement du {new Date(trait.date).toLocaleDateString("fr-FR")}</span>
      </nav>

      <h1 className="text-xl font-bold gradient-text mb-1">💧 Détail traitement</h1>
      <p className="text-sm text-gray-500 mb-4">{siteName} · {parcelleName} · {new Date(trait.date).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })}</p>

      {/* Infos générales */}
      <div className="glass rounded-2xl p-4 mb-4">
        <div className="text-xs font-semibold text-gray-600 mb-2">📋 Informations</div>
        <Row label="Date" value={new Date(trait.date).toLocaleDateString("fr-FR")} />
        <Row label="Heure" value={trait.heure} />
        <Row label="Stade" value={trait.stade} />
        <Row label="Mode" value={trait.mode === "surface" ? `Surface (${trait.surface_ha} ha)` : `${trait.nb_rangs} rangs`} />
        <Row label="Opérateur" value={trait.operateur} />
        <Row label="Type application" value={trait.type_application ? APP_LABELS[trait.type_application] ?? trait.type_application : null} />
        <Row label="Volume bouillie cible" value={trait.volume_bouillie_l} unit="L/ha" />
        <Row label="pH eau" value={trait.ph_eau} />
        <Row label="pH bouillie" value={trait.ph_bouillie} />
        <Row label="Origine eau" value={trait.origine_eau} />
        <Row label="Température" value={trait.temperature} unit="°C" />
        <Row label="Humidité" value={trait.humidite} unit="%" />
        <Row label="Couvert" value={trait.couvert} />
        {trait.prelevement_sol && <Row label="Prélèvement sol" value="Oui 🧪" />}
        {trait.latitude && trait.longitude && <Row label="GPS" value={`${trait.latitude}, ${trait.longitude}`} />}
      </div>

      {/* Rangs */}
      {rangs.length > 0 && (
        <div className="mb-4">
          <h2 className="text-sm font-bold text-gray-800 mb-2">🌱 Détail par rang</h2>
          <div className="space-y-1.5">
            {rangs.map(r => {
              const rangNum = parseInt(r.rang.replace("R", ""), 10);
              const pr = parcelleRangs.find(p => p.rang === rangNum);
              return (
                <div key={r.rang} className="glass rounded-xl p-3">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-lg">{r.rang}</span>
                    <span className="text-xs font-medium text-gray-700">{r.modalite_id}</span>
                    {r.dose && <span className="text-xs text-amber-700">· {r.dose}</span>}
                    {pr?.produit && <span className="text-[10px] text-gray-500">· {pr.produit}{pr.dose && ` (${pr.dose})`}</span>}
                    {pr?.produit2 && <span className="text-[10px] text-gray-500">· {pr.produit2}{pr.dose2 && ` (${pr.dose2})`}</span>}
                  </div>
                  {r.commentaire && <p className="text-[10px] text-gray-500 mt-1 ml-8">{r.commentaire}</p>}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Notes */}
      {trait.notes && (
        <div className="glass rounded-2xl p-4 mb-4">
          <div className="text-xs font-semibold text-gray-600 mb-1">💬 Notes</div>
          <p className="text-xs text-gray-700">{trait.notes}</p>
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center gap-3 mt-4">
        <Link href={`/traitements/new?site=${siteId}&parcelle=${trait.parcelle_id}`} className="flex-1 text-center text-sm font-medium py-3 rounded-xl bg-amber-50 text-amber-700 hover:bg-amber-100 transition-colors">🔄 Reprendre</Link>
        <button onClick={handleDelete} className="flex-1 text-center text-sm font-medium py-3 rounded-xl bg-red-50 text-red-600 hover:bg-red-100 transition-colors">🗑 Supprimer</button>
      </div>
    </div>
  );
}
