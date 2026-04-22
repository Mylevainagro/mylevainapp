"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase/client";
import { ListSkeleton } from "@/components/Skeleton";

interface ObsDetail { id: string; parcelle_id: string; date: string; heure: string | null; stade_bbch: string | null; modalite: string; rang: number; repetition: number | null; vigueur: number | null; croissance: number | null; homogeneite: number | null; couleur_feuilles: number | null; turgescence: number | null; brulures: number | null; necroses: number | null; deformations: number | null; escargots: boolean | null; acariens: boolean | null; nb_grappes_par_cep: number | null; taille_grappes: number | null; nombre_grappes: number | null; poids_moyen_grappe: number | null; poids_100_baies: number | null; rendement_estime: number | null; rendement_reel: number | null; brix: number | null; ph_raisin: number | null; commentaires: string | null; }
interface MaladieInfo { id: string; type: string; zone: string; nb_feuilles_atteintes: number; frequence_pct: number; surface_atteinte_pct: number; intensite_pct: number; }
interface PhotoInfo { id: string; url: string; type: string; legende: string | null; }

function Row({ label, value, unit }: { label: string; value: unknown; unit?: string }) {
  if (value === null || value === undefined || value === "") return null;
  return <div className="flex justify-between py-1.5 border-b border-gray-50 last:border-0"><span className="text-xs text-gray-500">{label}</span><span className="text-xs font-medium text-gray-800">{String(value)}{unit ? ` ${unit}` : ""}</span></div>;
}

export default function ObservationDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [obs, setObs] = useState<ObsDetail | null>(null);
  const [maladies, setMaladies] = useState<MaladieInfo[]>([]);
  const [photos, setPhotos] = useState<PhotoInfo[]>([]);
  const [siteName, setSiteName] = useState("");
  const [parcelleName, setParcelleName] = useState("");
  const [siteId, setSiteId] = useState("");

  useEffect(() => {
    async function load() {
      const { data: o } = await supabase.from("observations").select("*").eq("id", id).single();
      if (!o) { setLoading(false); return; }
      setObs(o);
      const [malRes, phRes] = await Promise.all([
        supabase.from("maladies_observations").select("*").eq("observation_id", id),
        supabase.from("photos").select("id, url, type, legende").eq("observation_id", id),
      ]);
      if (malRes.data) setMaladies(malRes.data);
      if (phRes.data) setPhotos(phRes.data);
      const { data: p } = await supabase.from("parcelles").select("nom, site_id, vignoble_id").eq("id", o.parcelle_id).single();
      if (p) { setParcelleName(p.nom); const sid = p.site_id || p.vignoble_id; setSiteId(sid || ""); if (sid) { const { data: s } = await supabase.from("sites").select("nom").eq("id", sid).single(); if (s) setSiteName(s.nom); } }
      setLoading(false);
    }
    load();
  }, [id]);

  async function handleDelete() {
    if (!confirm("Supprimer cette observation et ses données ?")) return;
    await supabase.from("maladies_observations").delete().eq("observation_id", id);
    await supabase.from("photos").delete().eq("observation_id", id);
    await supabase.from("observations").delete().eq("id", id);
    router.push(obs?.parcelle_id ? `/parcelles/${obs.parcelle_id}` : "/observations");
  }

  async function deletePhoto(photoId: string) {
    if (!confirm("Supprimer cette photo ?")) return;
    await supabase.from("photos").delete().eq("id", photoId);
    setPhotos(prev => prev.filter(p => p.id !== photoId));
  }

  if (loading) return <div className="pt-4"><ListSkeleton count={4} /></div>;
  if (!obs) return <div className="text-center py-16"><div className="text-4xl mb-3">🔍</div><p className="text-gray-400 mb-4">Observation non trouvée</p><Link href="/observations" className="text-sm text-emerald-600 font-medium hover:underline">← Retour</Link></div>;

  const MALADIE_LABELS: Record<string, string> = { mildiou: "Mildiou", oidium: "Oïdium", botrytis: "Botrytis", black_rot: "Black Rot" };

  return (
    <div>
      <nav className="flex items-center gap-1.5 text-xs text-gray-400 mb-3 flex-wrap">
        <Link href="/" className="hover:text-emerald-600">🏡 Accueil</Link><span>›</span>
        {siteId && <><Link href={`/vignobles/${siteId}`} className="hover:text-emerald-600">{siteName}</Link><span>›</span></>}
        {obs.parcelle_id && <><Link href={`/parcelles/${obs.parcelle_id}`} className="hover:text-emerald-600">{parcelleName}</Link><span>›</span></>}
        <span className="text-gray-700 font-medium">Observation du {new Date(obs.date).toLocaleDateString("fr-FR")}</span>
      </nav>

      <h1 className="text-xl font-bold gradient-text mb-1">📝 Détail observation</h1>
      <p className="text-sm text-gray-500 mb-4">{siteName} · {parcelleName} · {new Date(obs.date).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })}</p>

      {/* Identification */}
      <div className="glass rounded-2xl p-4 mb-4">
        <div className="text-xs font-semibold text-gray-600 mb-2">📋 Identification</div>
        <Row label="Date" value={new Date(obs.date).toLocaleDateString("fr-FR")} />
        <Row label="Heure" value={obs.heure} />
        <Row label="Rang" value={`R${obs.rang}`} />
        <Row label="Modalité" value={obs.modalite} />
        <Row label="Stade BBCH" value={obs.stade_bbch} />
        <Row label="Répétition" value={obs.repetition} />
      </div>

      {/* État plante */}
      <div className="glass rounded-2xl p-4 mb-4">
        <div className="text-xs font-semibold text-gray-600 mb-2">🌿 État de la plante</div>
        <div className="grid grid-cols-5 gap-1.5 text-[10px]">
          {obs.vigueur != null && <div className="bg-emerald-50 rounded-lg p-1.5 text-center"><div className="font-bold text-emerald-700">{obs.vigueur}</div><div className="text-emerald-600">Vigueur</div></div>}
          {obs.croissance != null && <div className="bg-emerald-50 rounded-lg p-1.5 text-center"><div className="font-bold text-emerald-700">{obs.croissance}</div><div className="text-emerald-600">Croiss.</div></div>}
          {obs.homogeneite != null && <div className="bg-emerald-50 rounded-lg p-1.5 text-center"><div className="font-bold text-emerald-700">{obs.homogeneite}</div><div className="text-emerald-600">Homog.</div></div>}
          {obs.couleur_feuilles != null && <div className="bg-emerald-50 rounded-lg p-1.5 text-center"><div className="font-bold text-emerald-700">{obs.couleur_feuilles}</div><div className="text-emerald-600">Couleur</div></div>}
          {obs.turgescence != null && <div className="bg-emerald-50 rounded-lg p-1.5 text-center"><div className="font-bold text-emerald-700">{obs.turgescence}</div><div className="text-emerald-600">Turgesc.</div></div>}
        </div>
      </div>

      {/* Symptômes */}
      {(obs.brulures || obs.necroses || obs.deformations || obs.escargots || obs.acariens) && (
        <div className="glass rounded-2xl p-4 mb-4">
          <div className="text-xs font-semibold text-gray-600 mb-2">⚠️ Symptômes & Ravageurs</div>
          <Row label="Brûlures" value={obs.brulures} unit="/5" />
          <Row label="Nécroses" value={obs.necroses} unit="/5" />
          <Row label="Déformations" value={obs.deformations} unit="/5" />
          {obs.escargots && <Row label="Escargots" value="Oui 🐌" />}
          {obs.acariens && <Row label="Acariens" value="Oui 🕷️" />}
        </div>
      )}

      {/* Maladies */}
      {maladies.length > 0 && (
        <div className="glass rounded-2xl p-4 mb-4">
          <div className="text-xs font-semibold text-gray-600 mb-2">🦠 Maladies</div>
          {maladies.map(m => (
            <div key={m.id} className="bg-gray-50 rounded-lg p-2 mb-1.5 last:mb-0">
              <div className="flex justify-between text-xs"><span className="font-medium">{MALADIE_LABELS[m.type] ?? m.type} — {m.zone}</span></div>
              <div className="flex gap-3 text-[10px] mt-1">
                <span className="bg-amber-50 text-amber-700 px-1.5 py-0.5 rounded">Fréq: {m.frequence_pct}%</span>
                <span className="bg-red-50 text-red-700 px-1.5 py-0.5 rounded">Intens: {m.intensite_pct}%</span>
                <span className="text-gray-500">{m.nb_feuilles_atteintes}/20 · {m.surface_atteinte_pct}%</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Rendement */}
      {(obs.nombre_grappes || obs.poids_moyen_grappe || obs.rendement_estime) && (
        <div className="glass rounded-2xl p-4 mb-4">
          <div className="text-xs font-semibold text-gray-600 mb-2">🍇 Rendement</div>
          <Row label="Grappes/cep" value={obs.nb_grappes_par_cep} />
          <Row label="Nb grappes (10 ceps)" value={obs.nombre_grappes} />
          <Row label="Poids moyen grappe" value={obs.poids_moyen_grappe} unit="g" />
          <Row label="Poids 100 baies" value={obs.poids_100_baies} unit="g" />
          <Row label="Rendement estimé" value={obs.rendement_estime} unit="kg/ha" />
          <Row label="Rendement réel" value={obs.rendement_reel} unit="kg/ha" />
          <Row label="Brix" value={obs.brix} />
          <Row label="pH raisin" value={obs.ph_raisin} />
        </div>
      )}

      {/* Photos */}
      {photos.length > 0 && (
        <div className="glass rounded-2xl p-4 mb-4">
          <div className="text-xs font-semibold text-gray-600 mb-2">📷 Photos ({photos.length})</div>
          <div className="grid grid-cols-3 gap-1.5">
            {photos.map(ph => (
              <div key={ph.id} className="relative group">
                <a href={ph.url} target="_blank" rel="noopener noreferrer"><img src={ph.url} alt={ph.legende || ph.type} className="w-full h-24 object-cover rounded-lg" /></a>
                <button onClick={() => deletePhoto(ph.id)} className="absolute top-1 right-1 w-5 h-5 bg-red-600/80 text-white rounded-full text-[10px] flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">✕</button>
                {ph.legende && <p className="text-[9px] text-gray-400 mt-0.5 truncate">{ph.legende}</p>}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Notes */}
      {obs.commentaires && (
        <div className="glass rounded-2xl p-4 mb-4">
          <div className="text-xs font-semibold text-gray-600 mb-1">💬 Commentaires</div>
          <p className="text-xs text-gray-700">{obs.commentaires}</p>
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center gap-3 mt-4">
        <Link href={`/observations/new?duplicate=${obs.id}`} className="flex-1 text-center text-sm font-medium py-3 rounded-xl bg-amber-50 text-amber-700 hover:bg-amber-100 transition-colors">🔄 Reprendre</Link>
        <button onClick={handleDelete} className="flex-1 text-center text-sm font-medium py-3 rounded-xl bg-red-50 text-red-600 hover:bg-red-100 transition-colors">🗑 Supprimer</button>
      </div>
    </div>
  );
}
