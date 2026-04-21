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
  annee_protocole: string | null; photo_url: string | null; plan_pdf_url: string | null;
}
interface PlacetteInfo { id: string; nom: string; nb_ceps: number; modalite_id: string | null; description_position: string | null; pieds_marques: string | null; }
interface RangInfo { rang: number; modalite_code: string | null; produit: string | null; dose: string | null; produit2: string | null; dose2: string | null; temoin: boolean; }
interface ObsInfo { id: string; date: string; stade_bbch: string | null; modalite: string; commentaires: string | null; vigueur: number | null; croissance: number | null; brulures: number | null; necroses: number | null; escargots: boolean | null; acariens: boolean | null; }
interface PhotoInfo { id: string; observation_id: string; url: string; type: string; legende: string | null; }
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
  const [photos, setPhotos] = useState<PhotoInfo[]>([]);
  const [traitements, setTraitements] = useState<TraitInfo[]>([]);
  const [analyses, setAnalyses] = useState<AnalyseInfo[]>([]);
  const [obsLimit, setObsLimit] = useState(3);
  const [traitLimit, setTraitLimit] = useState(3);
  const [expandedObs, setExpandedObs] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      const { data: p } = await supabase.from("parcelles").select("*").eq("id", id).single();
      if (!p) { setLoading(false); return; }
      setParcelle(p);
      const sid = p.site_id || p.vignoble_id;
      setSiteId(sid || "");

      if (sid) {
        const { data: s } = await supabase.from("sites").select("nom").eq("id", sid).single();
        if (s) setSiteName(s.nom);
        else { const { data: v } = await supabase.from("vignobles").select("nom").eq("id", sid).single(); if (v) setSiteName(v.nom); }
      }

      const { data: plData } = await supabase.from("placettes").select("id, nom, nb_ceps, modalite_id, description_position, pieds_marques").eq("parcelle_id", id).eq("actif", true).order("nom");
      if (plData) setPlacettes(plData);

      const { data: rData } = await supabase.from("parcelle_rangs").select("rang, modalite_code, produit, dose, produit2, dose2, temoin").eq("parcelle_id", id).order("rang");
      if (rData) setRangs(rData);

      const { data: obsData } = await supabase.from("observations").select("id, date, stade_bbch, modalite, commentaires, vigueur, croissance, brulures, necroses, escargots, acariens").eq("parcelle_id", id).order("date", { ascending: false }).limit(20);
      if (obsData) setObservations(obsData);

      // Load photos for all observations
      if (obsData && obsData.length > 0) {
        const obsIds = obsData.map((o: { id: string }) => o.id);
        const { data: photoData } = await supabase.from("photos").select("id, observation_id, url, type, legende").in("observation_id", obsIds);
        if (photoData) setPhotos(photoData);
      }

      const { data: traitData } = await supabase.from("traitements").select("id, date, stade, mode, nb_rangs, notes").eq("parcelle_id", id).order("date", { ascending: false }).limit(10);
      if (traitData) setTraitements(traitData);

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

  const visibleObs = observations.slice(0, obsLimit);
  const hasMoreObs = observations.length > obsLimit;

  return (
    <div>
      {/* Fil d'Ariane */}
      <nav className="flex items-center gap-1.5 text-xs text-gray-400 mb-3 flex-wrap">
        <Link href="/" className="hover:text-emerald-600">🏡 Accueil</Link>
        <span>›</span>
        <Link href={`/vignobles/${siteId}`} className="hover:text-emerald-600">{siteName || "Site"}</Link>
        <span>›</span>
        <span className="text-gray-700 font-medium">{parcelle.nom}{parcelle.annee_protocole && ` (${parcelle.annee_protocole})`}</span>
      </nav>

      <h1 className="text-xl font-bold gradient-text mb-1">{parcelle.nom}{parcelle.annee_protocole && ` (${parcelle.annee_protocole})`}</h1>
      {siteName && <p className="text-sm text-gray-500">{siteName}</p>}

      {/* Photo parcelle */}
      {parcelle.photo_url && (
        <div className="mt-3 mb-3">
          <a href={parcelle.photo_url} target="_blank" rel="noopener noreferrer">
            <img src={parcelle.photo_url} alt={`Photo ${parcelle.nom}`} className="w-full h-48 object-cover rounded-2xl shadow-sm" />
          </a>
        </div>
      )}

      {/* PDF plan */}
      {parcelle.plan_pdf_url && (
        <a href={parcelle.plan_pdf_url} target="_blank" rel="noopener noreferrer"
          className="inline-flex items-center gap-2 glass rounded-xl px-4 py-2 text-sm font-medium text-blue-700 hover:bg-blue-50 transition-colors mb-3">
          📄 Voir le plan expérimental (PDF)
        </a>
      )}

      {/* Infos générales */}
      <div className="glass rounded-2xl p-4 mt-2 mb-4">
        <div className="text-xs font-semibold text-gray-600 mb-2">📋 Informations</div>
        <DetailRow label="Variété / Cépage" value={parcelle.variete} />
        <DetailRow label="Type culture" value={parcelle.type_culture} />
        <DetailRow label="Surface" value={parcelle.surface} unit="ha" />
        <DetailRow label="Nb rangs" value={parcelle.nb_rangs} />
        <DetailRow label="Longueur" value={parcelle.longueur} unit="m" />
        <DetailRow label="Écartement" value={parcelle.ecartement} unit="m" />
        <DetailRow label="Type de sol" value={parcelle.sol} />
        {parcelle.latitude && parcelle.longitude && <DetailRow label="GPS" value={`${parcelle.latitude}, ${parcelle.longitude}`} />}
        {parcelle.commentaire && <div className="mt-2 pt-2 border-t border-gray-100"><p className="text-xs text-gray-600">{parcelle.commentaire}</p></div>}
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
                  {r.temoin ? <span className="text-xs text-gray-500 italic">Témoin non traité</span> : <span className="text-xs text-gray-700 font-medium">{r.modalite_code || "—"}</span>}
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
                <div className="text-[10px] text-gray-500">{pl.nb_ceps} ceps{pl.modalite_id && ` · ${pl.modalite_id}`}{pl.description_position && ` · ${pl.description_position}`}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Traitements — AVANT observations */}
      <div className="mb-4">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-sm font-bold text-gray-800">💧 Derniers traitements</h2>
          <span className="text-[10px] text-gray-400">{traitements.length} au total</span>
        </div>
        {traitements.length === 0 ? (
          <p className="text-xs text-gray-400 glass rounded-xl p-3">Aucun traitement</p>
        ) : (
          <div className="space-y-1.5">
            {traitements.slice(0, traitLimit).map(t => (
              <div key={t.id} className="glass rounded-xl p-3 space-y-1">
                <div className="flex justify-between items-center">
                  <span className="text-xs font-medium text-gray-800">
                    {new Date(t.date).toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" })}
                    {t.stade && ` · Stade ${t.stade}`}
                  </span>
                  <span className="text-[10px] bg-amber-50 text-amber-700 px-1.5 py-0.5 rounded">
                    {t.mode === "surface" ? "Surface" : `${t.nb_rangs || "?"} rangs`}
                  </span>
                </div>
                {t.notes && <p className="text-[10px] text-gray-500 line-clamp-1">{t.notes}</p>}
                <div className="flex items-center gap-3">
                  <Link href={`/traitements/new?site=${siteId}&parcelle=${id}`} className="text-[10px] text-amber-700 font-medium hover:underline">
                    🔄 Reprendre
                  </Link>
                  <button type="button" onClick={async () => {
                    if (!confirm("Supprimer ce traitement ?")) return;
                    await supabase.from("traitement_rangs").delete().eq("traitement_id", t.id);
                    await supabase.from("traitements").delete().eq("id", t.id);
                    setTraitements(prev => prev.filter(x => x.id !== t.id));
                  }} className="text-[10px] text-red-500 font-medium hover:underline">
                    🗑 Supprimer
                  </button>
                </div>
              </div>
            ))}
            {traitements.length > traitLimit && (
              <button type="button" onClick={() => setTraitLimit(prev => prev + 5)}
                className="w-full glass rounded-xl py-2.5 text-xs font-medium text-amber-700 hover:bg-amber-50 transition-colors">
                💧 Voir plus de traitements ({traitements.length - traitLimit} restants)
              </button>
            )}
          </div>
        )}
      </div>

      {/* Observations */}
      <div className="mb-4">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-sm font-bold text-gray-800">📝 Observations</h2>
          <span className="text-[10px] text-gray-400">{observations.length} au total</span>
        </div>
        {observations.length === 0 ? (
          <p className="text-xs text-gray-400 glass rounded-xl p-3">Aucune observation</p>
        ) : (
          <div className="space-y-2">
            {visibleObs.map(o => {
              const isExpanded = expandedObs === o.id;
              const obsPhotos = photos.filter(ph => ph.observation_id === o.id);
              return (
                <div key={o.id} className={`glass rounded-xl overflow-hidden transition-all ${isExpanded ? "ring-2 ring-emerald-400/30" : ""}`}>
                  <button type="button" onClick={() => setExpandedObs(isExpanded ? null : o.id)} className="w-full text-left p-3">
                    <div className="flex justify-between items-center">
                      <span className="text-xs font-medium text-gray-800">
                        {new Date(o.date).toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" })}
                        {o.stade_bbch && ` · BBCH ${o.stade_bbch}`}
                      </span>
                      <div className="flex items-center gap-1.5">
                        <span className="text-[10px] bg-emerald-50 text-emerald-700 px-1.5 py-0.5 rounded">{o.modalite}</span>
                        {obsPhotos.length > 0 && <span className="text-[10px] bg-blue-50 text-blue-700 px-1.5 py-0.5 rounded">📷 {obsPhotos.length}</span>}
                        <span className={`text-gray-400 text-xs transition-transform ${isExpanded ? "rotate-180" : ""}`}>▾</span>
                      </div>
                    </div>
                    {!isExpanded && o.commentaires && <p className="text-[10px] text-gray-500 mt-1 line-clamp-1">{o.commentaires}</p>}
                  </button>

                  {isExpanded && (
                    <div className="px-3 pb-3 space-y-2 border-t border-gray-100 pt-2 animate-fadeIn">
                      {/* Indicateurs */}
                      <div className="grid grid-cols-4 gap-1.5 text-[10px]">
                        {o.vigueur != null && <div className="bg-emerald-50 rounded-lg p-1.5 text-center"><div className="font-bold text-emerald-700">{o.vigueur}/5</div><div className="text-emerald-600">Vigueur</div></div>}
                        {o.croissance != null && <div className="bg-emerald-50 rounded-lg p-1.5 text-center"><div className="font-bold text-emerald-700">{o.croissance}/5</div><div className="text-emerald-600">Croiss.</div></div>}
                        {o.brulures != null && o.brulures > 0 && <div className="bg-red-50 rounded-lg p-1.5 text-center"><div className="font-bold text-red-700">{o.brulures}/5</div><div className="text-red-600">Brûlures</div></div>}
                        {o.necroses != null && o.necroses > 0 && <div className="bg-red-50 rounded-lg p-1.5 text-center"><div className="font-bold text-red-700">{o.necroses}/5</div><div className="text-red-600">Nécroses</div></div>}
                      </div>
                      {(o.escargots || o.acariens) && (
                        <div className="flex gap-2 text-[10px] text-gray-500">
                          {o.escargots && <span>🐌 Escargots</span>}
                          {o.acariens && <span>🕷️ Acariens</span>}
                        </div>
                      )}
                      {o.commentaires && <p className="text-xs text-gray-600">{o.commentaires}</p>}

                      {/* Photos */}
                      {obsPhotos.length > 0 && (
                        <div>
                          <div className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-1">📷 Photos</div>
                          <div className="grid grid-cols-3 gap-1.5">
                            {obsPhotos.map(ph => (
                              <div key={ph.id} className="relative group">
                                <a href={ph.url} target="_blank" rel="noopener noreferrer" className="block">
                                  <img src={ph.url} alt={ph.legende || ph.type} className="w-full h-20 object-cover rounded-lg" />
                                </a>
                                <button type="button" onClick={async (e) => {
                                  e.stopPropagation();
                                  if (!confirm("Supprimer cette photo ?")) return;
                                  await supabase.from("photos").delete().eq("id", ph.id);
                                  setPhotos(prev => prev.filter(p => p.id !== ph.id));
                                }} className="absolute top-1 right-1 w-5 h-5 bg-red-600/80 text-white rounded-full text-[10px] flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">✕</button>
                                {ph.legende && <p className="text-[9px] text-gray-400 mt-0.5 truncate">{ph.legende}</p>}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}

            {/* Charger plus */}
            {hasMoreObs && (
              <button type="button" onClick={() => setObsLimit(prev => prev + 5)}
                className="w-full glass rounded-xl py-2.5 text-xs font-medium text-emerald-700 hover:bg-emerald-50 transition-colors">
                📝 Charger plus d&apos;observations ({observations.length - obsLimit} restantes)
              </button>
            )}
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
