"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase/client";
import { ListSkeleton } from "@/components/Skeleton";

interface ParcelleDetail {
  id: string; nom: string; variete: string | null; surface: number | null; sol: string | null;
  type_culture: string | null; nb_rangs: number | null; longueur: number | null; ecartement: number | null;
  commentaire: string | null; latitude: number | null; longitude: number | null;
  site_id: string | null; vignoble_id: string | null;
}
interface SiteInfo { nom: string; }
interface PlacetteInfo { id: string; nom: string; nb_ceps: number; modalite_id: string | null; description_position: string | null; pieds_marques: string | null; }
interface RangInfo { rang: number; modalite_code: string | null; produit: string | null; dose: string | null; produit2: string | null; dose2: string | null; temoin: boolean; }
interface ObsInfo { id: string; date: string; stade_bbch: string | null; modalite: string; commentaires: string | null; }
interface TraitInfo { id: string; date: string; stade: string | null; mode: string | null; nb_rangs: number | null; notes: string | null; }
interface AnalyseInfo { id: string; date_prelevement: string; phase: string; ph: number | null; matiere_organique_pct: number | null; laboratoire: string | null; fichier_pdf_url: string | null; }

function DetailRow({ label, value, unit }: { label: string; value: unknown; unit?: string }) {
  if (value === null || value === undefined || value === "") return null;
  return (
    <div className="flex justify-between py-1.5 border-b border-gray-50 last:border-0">
      <span className="text-xs text-gray-500">{label}</span>
      <span className="text-xs font-medium text-gray-800">{String(value)}{unit ? ` ${unit}` : ""}</span>
    </div>
  );
}

export default function ParcelleDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [loading, setLoading] = useState(true);
  const [parcelle, setParcelle] = useState<ParcelleDetail | null>(null);
  const [siteName, setSiteName] = useState("");
  const [siteId, setSiteId] = useState("");
  const [placettes, setPlacettes] = useState<PlacetteInfo[]>([]);
  const [rangs, setRangs] = useState<RangInfo[]>([]);
  const [observations, setObservations] = useState<ObsInfo[]>([]);
  const [traitements, setTraitements] = useState<TraitInfo[]>([]);
  const [analyses, setAnalyses] = useState<AnalyseInfo[]>([]);

  useEffect(() => {
    async function load() {
      // Parcelle
      const { data: p } = await supabase.from("parcelles").select("*").eq("id", id).single();
      if (!p) { setLoading(false); return; }
      setParcelle(p);
      const sid = p.site_id || p.vignoble_id;
      setSiteId(sid || "");

      // Site name
      if (sid) {
        const { data: s } = await supabase.from("sites").select("nom").eq("id", sid).single();
        if (s) setSiteName(s.nom);
        else {
          const { data: v } = await supabase.from("vignobles").select("nom").eq("id", sid).single();
          if (v) setSiteName(v.nom);
        }
      }

      // Placettes
      const { data: plData } = await supabase.from("placettes").select("id, nom, nb_ceps, modalite_id, description_position, pieds_marques").eq("parcelle_id", id).eq("actif", true).order("nom");
      if (plData) setPlacettes(plData);

      // Rangs modalités
      const { data: rData } = await supabase.from("parcelle_rangs").select("rang, modalite_code, produit, dose, produit2, dose2, temoin").eq("parcelle_id", id).order("rang");
      if (rData) setRangs(rData);

      // Observations (10 dernières)
      const { data: obsData } = await supabase.from("observations").select("id, date, stade_bbch, modalite, commentaires").eq("parcelle_id", id).order("date", { ascending: false }).limit(10);
      if (obsData) setObservations(obsData);

      // Traitements (10 derniers)
      const { data: traitData } = await supabase.from("traitements").select("id, date, stade, mode, nb_rangs, notes").eq("parcelle_id", id).order("date", { ascending: false }).limit(10);
      if (traitData) setTraitements(traitData);

      // Analyses sol
      const { data: anaData } = await supabase.from("analyses_sol").select("id, date_prelevement, phase, ph, matiere_organique_pct, laboratoire, fichier_pdf_url").eq("parcelle_id", id).order("date_prelevement", { ascending: false });
      if (anaData) setAnalyses(anaData);

      setLoading(false);
    }
    load();
  }, [id]);

  if (loading) return <div className="pt-4"><ListSkeleton count={4} /></div>;
  if (!parcelle) return (
    <div className="text-center py-16">
      <div className="text-4xl mb-3">🔍</div>
      <p className="text-gray-400 mb-4">Parcelle non trouvée</p>
      <Link href="/" className="text-sm text-emerald-600 font-medium hover:underline">← Retour</Link>
    </div>
  );

  return (
    <div>
      <Link href={siteId ? `/vignobles/${siteId}` : "/"} className="text-sm text-gray-500 hover:text-emerald-600">← {siteName || "Retour"}</Link>
      <h1 className="text-xl font-bold gradient-text mt-2 mb-1">{parcelle.nom}</h1>
      {siteName && <p className="text-sm text-gray-500">{siteName}</p>}

      {/* Infos générales */}
      <div className="glass rounded-2xl p-4 mt-4 mb-4">
        <div className="text-xs font-semibold text-gray-600 mb-2">📋 Informations</div>
        <DetailRow label="Variété / Cépage" value={parcelle.variete} />
        <DetailRow label="Type culture" value={parcelle.type_culture} />
        <DetailRow label="Surface" value={parcelle.surface} unit="ha" />
        <DetailRow label="Nb rangs" value={parcelle.nb_rangs} />
        <DetailRow label="Longueur" value={parcelle.longueur} unit="m" />
        <DetailRow label="Écartement" value={parcelle.ecartement} unit="m" />
        <DetailRow label="Type de sol" value={parcelle.sol} />
        {parcelle.latitude && parcelle.longitude && (
          <DetailRow label="GPS" value={`${parcelle.latitude}, ${parcelle.longitude}`} />
        )}
        {parcelle.commentaire && (
          <div className="mt-2 pt-2 border-t border-gray-100">
            <p className="text-xs text-gray-600">{parcelle.commentaire}</p>
          </div>
        )}
      </div>

      {/* Modalités par rang */}
      {rangs.length > 0 && (
        <div className="mb-4">
          <h2 className="text-sm font-bold text-gray-800 mb-2">🌱 Modalités par rang</h2>
          <div className="space-y-1.5">
            {rangs.map(r => (
              <div key={r.rang} className={`glass rounded-xl p-3 ${r.temoin ? "opacity-60" : ""}`}>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-lg">R{r.rang}</span>
                  {r.temoin ? (
                    <span className="text-xs text-gray-500 italic">Témoin non traité</span>
                  ) : (
                    <span className="text-xs text-gray-700 font-medium">{r.modalite_code || "—"}</span>
                  )}
                </div>
                {!r.temoin && (
                  <div className="flex gap-4 mt-1 ml-8 text-[10px] text-gray-500">
                    {r.produit && <span>🧪 {r.produit}{r.dose && ` — ${r.dose}`}</span>}
                    {r.produit2 && <span>🧪 {r.produit2}{r.dose2 && ` — ${r.dose2}`}</span>}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Placettes */}
      {placettes.length > 0 && (
        <div className="mb-4">
          <h2 className="text-sm font-bold text-gray-800 mb-2">📌 Placettes</h2>
          <div className="space-y-1.5">
            {placettes.map(pl => (
              <div key={pl.id} className="glass rounded-xl p-3">
                <div className="font-medium text-xs text-gray-800">{pl.nom}</div>
                <div className="text-[10px] text-gray-500">
                  {pl.nb_ceps} ceps{pl.modalite_id && ` · ${pl.modalite_id}`}
                  {pl.description_position && ` · ${pl.description_position}`}
                  {pl.pieds_marques && ` · Pieds : ${pl.pieds_marques}`}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Dernières observations */}
      <div className="mb-4">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-sm font-bold text-gray-800">📝 Dernières observations</h2>
          <Link href="/observations" className="text-[10px] text-emerald-600 font-medium">Voir tout →</Link>
        </div>
        {observations.length === 0 ? (
          <p className="text-xs text-gray-400 glass rounded-xl p-3">Aucune observation</p>
        ) : (
          <div className="space-y-1.5">
            {observations.map(o => (
              <div key={o.id} className="glass rounded-xl p-3">
                <div className="flex justify-between items-center">
                  <span className="text-xs font-medium text-gray-800">
                    {new Date(o.date).toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" })}
                    {o.stade_bbch && ` · BBCH ${o.stade_bbch}`}
                  </span>
                  <span className="text-[10px] bg-emerald-50 text-emerald-700 px-1.5 py-0.5 rounded">{o.modalite}</span>
                </div>
                {o.commentaires && <p className="text-[10px] text-gray-500 mt-1 line-clamp-1">{o.commentaires}</p>}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Derniers traitements */}
      <div className="mb-4">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-sm font-bold text-gray-800">💧 Derniers traitements</h2>
          <Link href="/traitements" className="text-[10px] text-emerald-600 font-medium">Voir tout →</Link>
        </div>
        {traitements.length === 0 ? (
          <p className="text-xs text-gray-400 glass rounded-xl p-3">Aucun traitement</p>
        ) : (
          <div className="space-y-1.5">
            {traitements.map(t => (
              <div key={t.id} className="glass rounded-xl p-3">
                <div className="flex justify-between items-center">
                  <span className="text-xs font-medium text-gray-800">
                    {new Date(t.date).toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" })}
                    {t.stade && ` · Stade ${t.stade}`}
                  </span>
                  <span className="text-[10px] bg-amber-50 text-amber-700 px-1.5 py-0.5 rounded">
                    {t.mode === "surface" ? "Surface" : `${t.nb_rangs || "?"} rangs`}
                  </span>
                </div>
                {t.notes && <p className="text-[10px] text-gray-500 mt-1 line-clamp-1">{t.notes}</p>}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Analyses sol */}
      {analyses.length > 0 && (
        <div className="mb-4">
          <h2 className="text-sm font-bold text-gray-800 mb-2">🧪 Analyses de sol</h2>
          <div className="space-y-1.5">
            {analyses.map(a => (
              <div key={a.id} className="glass rounded-xl p-3">
                <div className="flex justify-between items-center">
                  <span className="text-xs font-medium text-gray-800">
                    {a.phase} — {new Date(a.date_prelevement).toLocaleDateString("fr-FR")}
                    {a.laboratoire && ` · ${a.laboratoire}`}
                  </span>
                  {a.fichier_pdf_url && (
                    <a href={a.fichier_pdf_url} target="_blank" rel="noopener noreferrer"
                      className="text-[10px] bg-blue-50 text-blue-700 px-1.5 py-0.5 rounded font-medium">📄 PDF</a>
                  )}
                </div>
                <div className="flex gap-3 mt-1 text-[10px] text-gray-500">
                  {a.ph != null && <span>pH {a.ph}</span>}
                  {a.matiere_organique_pct != null && <span>MO {a.matiere_organique_pct}%</span>}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="grid grid-cols-2 gap-3 mt-4">
        <Link href="/observations/new" className="btn-primary text-center !py-3 !text-sm">📝 Observation</Link>
        <Link href="/traitements/new" className="btn-secondary text-center !py-3 !text-sm">💧 Traitement</Link>
      </div>
    </div>
  );
}
