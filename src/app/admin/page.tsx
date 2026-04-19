"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase/client";
import { useAuth } from "@/components/AuthProvider";
import { AdminCard } from "@/components/admin/AdminCard";
import { EditModal } from "@/components/admin/EditModal";
import { Toast } from "@/components/Toast";
import { ListSkeleton } from "@/components/Skeleton";

// ---- Types locaux simplifiés ----
interface SiteItem { id: string; nom: string; type_exploitation: string | null; adresse: string | null; latitude: number | null; longitude: number | null; actif: boolean; }
interface ParcelleItem { id: string; site_id: string; nom: string; surface: number | null; type_culture: string | null; variete: string | null; sol: string | null; }
interface PlacetteItem { id: string; parcelle_id: string; modalite_id: string | null; nom: string; nb_ceps: number; description_position: string | null; pieds_marques: string | null; actif: boolean; }
interface ProtocoleItem { id: string; code: string; label: string; type: string; description: string | null; actif: boolean; ordre: number; }
interface ModaliteLevainItem { id: string; code: string; label: string; dilution: string | null; description: string | null; actif: boolean; ordre: number; }
interface ProduitItem { id: string; code: string; label: string; type: string; origine: string | null; description: string | null; actif: boolean; ordre: number; }
interface AppUserItem { id: string; email: string; nom: string; role: string; approved: boolean; created_at: string; last_login: string | null; }

const TYPE_EXPLOITATION = ["vignoble", "maraichage", "grande_culture", "verger", "serre", "mixte", "autre"] as const;
const TYPE_CULTURE = ["vigne", "mais", "ble", "legumes", "fruitiers", "autre"] as const;
const TYPE_SOL = ["argilo_calcaire", "grave", "sableux", "limoneux", "mixte", "autre"] as const;

// ---- Reset Section ----
function ResetSection({ showToast }: { showToast: (msg: string, type?: "success" | "error") => void }) {
  const currentYear = new Date().getFullYear().toString();
  const [resetMode, setResetMode] = useState<"campagne" | "periode">("campagne");
  const [campagne, setCampagne] = useState(currentYear);
  const [dateDebut, setDateDebut] = useState("");
  const [dateFin, setDateFin] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [confirmStep, setConfirmStep] = useState(0);

  async function handleReset() {
    if (confirmStep < 2) { setConfirmStep(confirmStep + 1); return; }
    setDeleting(true);
    try {
      let dateFilter: { gte: string; lte: string };
      if (resetMode === "campagne") {
        dateFilter = { gte: `${campagne}-01-01`, lte: `${campagne}-12-31` };
      } else {
        if (!dateDebut || !dateFin) { showToast("Précise les deux dates", "error"); setDeleting(false); setConfirmStep(0); return; }
        dateFilter = { gte: dateDebut, lte: dateFin };
      }
      const { data: obsIds } = await supabase.from("observations").select("id").gte("date", dateFilter.gte).lte("date", dateFilter.lte);
      if (obsIds && obsIds.length > 0) {
        const ids = obsIds.map((o: { id: string }) => o.id);
        await supabase.from("maladies_observations").delete().in("observation_id", ids);
        await supabase.from("photos").delete().in("observation_id", ids);
      }
      const { data: traitIds } = await supabase.from("traitements").select("id").gte("date", dateFilter.gte).lte("date", dateFilter.lte);
      if (traitIds && traitIds.length > 0) {
        const ids = traitIds.map((t: { id: string }) => t.id);
        await supabase.from("traitement_rangs").delete().in("traitement_id", ids);
      }
      await supabase.from("observations").delete().gte("date", dateFilter.gte).lte("date", dateFilter.lte);
      await supabase.from("traitements").delete().gte("date", dateFilter.gte).lte("date", dateFilter.lte);
      await supabase.from("analyses_sol").delete().gte("date_prelevement", dateFilter.gte).lte("date_prelevement", dateFilter.lte);
      const label = resetMode === "campagne" ? `campagne ${campagne}` : `du ${new Date(dateDebut).toLocaleDateString("fr-FR")} au ${new Date(dateFin).toLocaleDateString("fr-FR")}`;
      showToast(`Données supprimées pour ${label} ✓`);
    } catch { showToast("Erreur inattendue", "error"); }
    setDeleting(false); setConfirmStep(0);
  }

  const confirmLabel = resetMode === "campagne" ? `la campagne ${campagne}` : dateDebut && dateFin ? `du ${new Date(dateDebut).toLocaleDateString("fr-FR")} au ${new Date(dateFin).toLocaleDateString("fr-FR")}` : "la période";

  return (
    <div className="glass rounded-2xl p-4 border-2 border-red-200/50 space-y-4">
      <p className="text-xs text-gray-500">Supprime observations, traitements et analyses. La structure (sites, parcelles, protocoles) n&apos;est pas affectée.</p>
      <div className="flex gap-2">
        <button type="button" onClick={() => { setResetMode("campagne"); setConfirmStep(0); }} className={`flex-1 py-2.5 rounded-xl text-sm font-semibold ${resetMode === "campagne" ? "bg-red-600 text-white" : "bg-gray-100 text-gray-600"}`}>Par campagne</button>
        <button type="button" onClick={() => { setResetMode("periode"); setConfirmStep(0); }} className={`flex-1 py-2.5 rounded-xl text-sm font-semibold ${resetMode === "periode" ? "bg-red-600 text-white" : "bg-gray-100 text-gray-600"}`}>Par période</button>
      </div>
      {resetMode === "campagne" ? (
        <select value={campagne} onChange={(e) => { setCampagne(e.target.value); setConfirmStep(0); }} className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm">
          {["2024", "2025", "2026", "2027"].map(y => <option key={y} value={y}>{y}</option>)}
        </select>
      ) : (
        <div className="grid grid-cols-2 gap-3">
          <input type="date" value={dateDebut} onChange={(e) => { setDateDebut(e.target.value); setConfirmStep(0); }} className="border border-gray-200 rounded-xl px-3 py-2.5 text-sm" />
          <input type="date" value={dateFin} onChange={(e) => { setDateFin(e.target.value); setConfirmStep(0); }} className="border border-gray-200 rounded-xl px-3 py-2.5 text-sm" />
        </div>
      )}
      {confirmStep === 0 && <button type="button" onClick={handleReset} className="w-full bg-red-100 text-red-700 rounded-xl py-3 font-semibold text-sm">🗑️ Effacer les données</button>}
      {confirmStep === 1 && (
        <div className="bg-red-50 border border-red-300 rounded-xl p-3 space-y-2">
          <p className="text-sm text-red-700 font-medium">⚠️ Effacer les données pour {confirmLabel} ?</p>
          <p className="text-xs text-red-600">Observations, traitements, analyses, maladies et photos seront supprimés. Irréversible.</p>
          <div className="flex gap-2">
            <button type="button" onClick={() => setConfirmStep(0)} className="flex-1 bg-gray-100 text-gray-700 rounded-xl py-2.5 text-sm">Annuler</button>
            <button type="button" onClick={handleReset} className="flex-1 bg-red-600 text-white rounded-xl py-2.5 text-sm font-bold">Confirmer</button>
          </div>
        </div>
      )}
      {confirmStep === 2 && (
        <div className="bg-red-100 border-2 border-red-500 rounded-xl p-3 space-y-2">
          <p className="text-sm text-red-800 font-bold">🚨 DERNIÈRE CONFIRMATION</p>
          <div className="flex gap-2">
            <button type="button" onClick={() => setConfirmStep(0)} className="flex-1 bg-gray-100 text-gray-700 rounded-xl py-2.5 text-sm">Annuler</button>
            <button type="button" onClick={handleReset} disabled={deleting} className="flex-1 bg-red-700 text-white rounded-xl py-2.5 text-sm font-bold disabled:opacity-50">{deleting ? "Suppression…" : "🗑️ SUPPRIMER"}</button>
          </div>
        </div>
      )}
    </div>
  );
}

// ---- Admin Page ----
export default function AdminPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [sites, setSites] = useState<SiteItem[]>([]);
  const [parcelles, setParcelles] = useState<ParcelleItem[]>([]);
  const [placettes, setPlacettes] = useState<PlacetteItem[]>([]);
  const [protocoles, setProtocoles] = useState<ProtocoleItem[]>([]);
  const [modalites, setModalites] = useState<ModaliteLevainItem[]>([]);
  const [produits, setProduits] = useState<ProduitItem[]>([]);
  const [appUsers, setAppUsers] = useState<AppUserItem[]>([]);
  const [toast, setToast] = useState({ message: "", type: "success" as "success" | "error", visible: false });
  const hideToast = useCallback(() => setToast(t => ({ ...t, visible: false })), []);
  const [modal, setModal] = useState<{ type: string; data: any } | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => { if (user && user.role !== 'admin') router.push('/'); }, [user, router]);

  useEffect(() => {
    async function load() {
      const [s, p, pl, pr, m, pd] = await Promise.all([
        supabase.from("sites").select("*").order("nom"),
        supabase.from("parcelles").select("*").order("nom"),
        supabase.from("placettes").select("*").order("nom"),
        supabase.from("protocoles").select("*").order("ordre"),
        supabase.from("modalites_levain").select("*").order("ordre"),
        supabase.from("produits").select("*").order("ordre"),
      ]);
      if (s.data) setSites(s.data);
      if (p.data) setParcelles(p.data);
      if (pl.data) setPlacettes(pl.data);
      if (pr.data) setProtocoles(pr.data);
      if (m.data) setModalites(m.data);
      if (pd.data) setProduits(pd.data);
      const usersRes = await fetch('/api/auth/users');
      if (usersRes.ok) { const d = await usersRes.json(); setAppUsers(d.users || []); }
      setLoading(false);
    }
    load();
  }, []);

  function showToast(message: string, type: "success" | "error" = "success") { setToast({ message, type, visible: true }); }
  function updateModal(field: string, value: any) { setModal(m => m ? { ...m, data: { ...m.data, [field]: value } } : null); }

  // ---- CRUD Sites ----
  async function saveSite() {
    setSaving(true); const d = modal?.data;
    const payload = { nom: d.nom, type_exploitation: d.type_exploitation || null, adresse: d.adresse || null, latitude: d.latitude || null, longitude: d.longitude || null, actif: true };
    if (d.id) { await supabase.from("sites").update(payload).eq("id", d.id); showToast("Site modifié"); }
    else { const { error } = await supabase.from("sites").insert(payload); if (error) showToast(error.message, "error"); else showToast("Site ajouté"); }
    setSaving(false); setModal(null);
    const { data } = await supabase.from("sites").select("*").order("nom"); if (data) setSites(data);
  }
  async function deleteSite(id: string) { if (!confirm("Supprimer ce site et toutes ses parcelles ?")) return; await supabase.from("sites").delete().eq("id", id); setSites(s => s.filter(x => x.id !== id)); showToast("Site supprimé"); }

  // ---- CRUD Parcelles ----
  async function saveParcelle() {
    setSaving(true); const d = modal?.data;
    const payload = { nom: d.nom, site_id: d.site_id, surface: d.surface || null, type_culture: d.type_culture || null, variete: d.variete || null, sol: d.sol || null };
    if (d.id) { await supabase.from("parcelles").update(payload).eq("id", d.id); showToast("Parcelle modifiée"); }
    else { const { error } = await supabase.from("parcelles").insert(payload); if (error) showToast(error.message, "error"); else showToast("Parcelle ajoutée"); }
    setSaving(false); setModal(null);
    const { data } = await supabase.from("parcelles").select("*").order("nom"); if (data) setParcelles(data);
  }
  async function deleteParcelle(id: string) { if (!confirm("Supprimer cette parcelle ?")) return; await supabase.from("parcelles").delete().eq("id", id); setParcelles(p => p.filter(x => x.id !== id)); showToast("Parcelle supprimée"); }

  // ---- CRUD Placettes ----
  async function savePlacette() {
    setSaving(true); const d = modal?.data;
    const payload = { nom: d.nom, parcelle_id: d.parcelle_id, modalite_id: d.modalite_id || null, nb_ceps: d.nb_ceps || 7, description_position: d.description_position || null, pieds_marques: d.pieds_marques || null, actif: true };
    if (d.id) { await supabase.from("placettes").update(payload).eq("id", d.id); showToast("Placette modifiée"); }
    else { const { error } = await supabase.from("placettes").insert(payload); if (error) showToast(error.message, "error"); else showToast("Placette ajoutée"); }
    setSaving(false); setModal(null);
    const { data } = await supabase.from("placettes").select("*").order("nom"); if (data) setPlacettes(data);
  }
  async function deletePlacette(id: string) { if (!confirm("Supprimer cette placette ?")) return; await supabase.from("placettes").delete().eq("id", id); setPlacettes(p => p.filter(x => x.id !== id)); showToast("Placette supprimée"); }

  // ---- CRUD Protocoles ----
  async function saveProtocole() {
    setSaving(true); const d = modal?.data;
    const payload = { code: d.code, label: d.label, type: d.type || 'simple', description: d.description || null, actif: d.actif ?? true, ordre: d.ordre || 1 };
    if (d.id) { await supabase.from("protocoles").update(payload).eq("id", d.id); showToast("Protocole modifié"); }
    else { const { error } = await supabase.from("protocoles").insert(payload); if (error) showToast(error.message, "error"); else showToast("Protocole ajouté"); }
    setSaving(false); setModal(null);
    const { data } = await supabase.from("protocoles").select("*").order("ordre"); if (data) setProtocoles(data);
  }
  async function deleteProtocole(id: string) { if (!confirm("Supprimer ?")) return; await supabase.from("protocoles").delete().eq("id", id); setProtocoles(p => p.filter(x => x.id !== id)); showToast("Supprimé"); }

  // ---- CRUD Modalités ----
  async function saveModalite() {
    setSaving(true); const d = modal?.data;
    const payload = { code: d.code, label: d.label, dilution: d.dilution || null, description: d.description || null, actif: d.actif ?? true, ordre: d.ordre || 1 };
    if (d.id) { await supabase.from("modalites_levain").update(payload).eq("id", d.id); showToast("Modalité modifiée"); }
    else { const { error } = await supabase.from("modalites_levain").insert(payload); if (error) showToast(error.message, "error"); else showToast("Modalité ajoutée"); }
    setSaving(false); setModal(null);
    const { data } = await supabase.from("modalites_levain").select("*").order("ordre"); if (data) setModalites(data);
  }
  async function deleteModalite(id: string) { if (!confirm("Supprimer ?")) return; await supabase.from("modalites_levain").delete().eq("id", id); setModalites(m => m.filter(x => x.id !== id)); showToast("Supprimé"); }

  // ---- CRUD Produits ----
  async function saveProduit() {
    setSaving(true); const d = modal?.data;
    const payload = { code: d.code, label: d.label, type: d.type || 'levain', origine: d.origine || null, description: d.description || null, actif: d.actif ?? true, ordre: d.ordre || 1 };
    if (d.id) { await supabase.from("produits").update(payload).eq("id", d.id); showToast("Produit modifié"); }
    else { const { error } = await supabase.from("produits").insert(payload); if (error) showToast(error.message, "error"); else showToast("Produit ajouté"); }
    setSaving(false); setModal(null);
    const { data } = await supabase.from("produits").select("*").order("ordre"); if (data) setProduits(data);
  }
  async function deleteProduit(id: string) { if (!confirm("Supprimer ?")) return; await supabase.from("produits").delete().eq("id", id); setProduits(p => p.filter(x => x.id !== id)); showToast("Supprimé"); }

  // ---- Users ----
  async function toggleUserApproval(userId: string, approved: boolean) {
    const res = await fetch('/api/auth/users', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ user_id: userId, approved }) });
    if (res.ok) { setAppUsers(u => u.map(x => x.id === userId ? { ...x, approved } : x)); showToast(approved ? 'Approuvé' : 'Révoqué'); }
  }
  async function deleteUser(userId: string) {
    if (!confirm('Supprimer cet utilisateur ?')) return;
    const res = await fetch('/api/auth/users', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ user_id: userId }) });
    if (res.ok) { setAppUsers(u => u.filter(x => x.id !== userId)); showToast('Supprimé'); }
  }

  if (user?.role !== 'admin') return null;
  if (loading) return <div className="pt-4"><ListSkeleton count={4} /></div>;

  const typeExpLabels: Record<string, string> = { vignoble: "Vignoble", maraichage: "Maraîchage", grande_culture: "Grande culture", verger: "Verger", serre: "Serre", mixte: "Mixte", autre: "Autre" };

  return (
    <div className="space-y-4">
      <Toast message={toast.message} type={toast.type} visible={toast.visible} onClose={hideToast} />
      <h1 className="text-xl font-bold gradient-text">⚙️ Administration</h1>

      {/* ======== UTILISATEURS ======== */}
      <AdminCard title="👥 Utilisateurs">
        {appUsers.map(u => (
          <div key={u.id} className="flex items-center justify-between px-4 py-3">
            <div className="flex items-center gap-3">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${u.role === 'admin' ? 'bg-amber-100 text-amber-700' : u.approved ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-500'}`}>
                {u.role === 'admin' ? '👑' : u.approved ? '✓' : '⏳'}
              </div>
              <div>
                <div className="font-medium text-sm">{u.nom}</div>
                <div className="text-xs text-gray-500">{u.email}</div>
              </div>
            </div>
            {u.role !== 'admin' && (
              <div className="flex gap-1.5">
                <button onClick={() => toggleUserApproval(u.id, !u.approved)} className={`text-xs px-2.5 py-1.5 rounded-lg ${u.approved ? 'bg-orange-50 text-orange-600' : 'bg-emerald-50 text-emerald-600'}`}>{u.approved ? '🚫' : '✅'}</button>
                <button onClick={() => deleteUser(u.id)} className="text-xs bg-red-50 text-red-600 px-2.5 py-1.5 rounded-lg">🗑</button>
              </div>
            )}
          </div>
        ))}
        {appUsers.length === 0 && <p className="px-4 py-3 text-sm text-gray-400">Aucun utilisateur</p>}
      </AdminCard>

      {/* ======== SITES ======== */}
      <h2 className="text-lg font-bold gradient-text mt-6">🏗️ Structure terrain</h2>

      <AdminCard title="🏠 Sites" onAdd={() => setModal({ type: "site", data: { nom: "", type_exploitation: "", adresse: "", latitude: null, longitude: null } })}>
        {sites.map(s => (
          <div key={s.id} className="flex items-center justify-between px-4 py-3">
            <div>
              <div className="font-medium text-sm">{s.nom}</div>
              <div className="text-xs text-gray-500">{typeExpLabels[s.type_exploitation ?? ""] || "—"} · {s.adresse || "—"}</div>
              {s.latitude && <div className="text-[10px] text-gray-400">📍 {s.latitude}, {s.longitude}</div>}
            </div>
            <div className="flex gap-1.5">
              <button onClick={() => setModal({ type: "site", data: { ...s } })} className="text-xs bg-gray-100 px-2.5 py-1.5 rounded-lg">✏️</button>
              <button onClick={() => deleteSite(s.id)} className="text-xs bg-red-50 text-red-600 px-2.5 py-1.5 rounded-lg">🗑</button>
            </div>
          </div>
        ))}
        {sites.length === 0 && <p className="px-4 py-3 text-sm text-gray-400">Aucun site — créez votre premier site</p>}
      </AdminCard>

      {/* ======== PARCELLES ======== */}
      <AdminCard title="🌿 Parcelles" onAdd={() => setModal({ type: "parcelle", data: { nom: "", site_id: sites[0]?.id || "", surface: null, type_culture: "", variete: "", sol: "" } })}>
        {parcelles.map(p => (
          <div key={p.id} className="flex items-center justify-between px-4 py-3">
            <div>
              <div className="font-medium text-sm">{p.nom}</div>
              <div className="text-xs text-gray-500">
                {sites.find(s => s.id === p.site_id)?.nom || "?"} · {p.type_culture || "—"} · {p.variete || "—"}
                {p.surface && ` · ${p.surface} ha`}
              </div>
            </div>
            <div className="flex gap-1.5">
              <button onClick={() => setModal({ type: "parcelle", data: { ...p } })} className="text-xs bg-gray-100 px-2.5 py-1.5 rounded-lg">✏️</button>
              <button onClick={() => deleteParcelle(p.id)} className="text-xs bg-red-50 text-red-600 px-2.5 py-1.5 rounded-lg">🗑</button>
            </div>
          </div>
        ))}
        {parcelles.length === 0 && <p className="px-4 py-3 text-sm text-gray-400">Aucune parcelle</p>}
      </AdminCard>

      {/* ======== PLACETTES ======== */}
      <AdminCard title="📌 Placettes" onAdd={() => setModal({ type: "placette", data: { nom: "", parcelle_id: parcelles[0]?.id || "", modalite_id: "", nb_ceps: 7, description_position: "", pieds_marques: "" } })}>
        {placettes.map(pl => (
          <div key={pl.id} className="flex items-center justify-between px-4 py-3">
            <div>
              <div className="font-medium text-sm">{pl.nom}</div>
              <div className="text-xs text-gray-500">{parcelles.find(p => p.id === pl.parcelle_id)?.nom || "?"} · {pl.nb_ceps} ceps{pl.modalite_id && ` · ${pl.modalite_id}`}</div>
            </div>
            <div className="flex gap-1.5">
              <button onClick={() => setModal({ type: "placette", data: { ...pl } })} className="text-xs bg-gray-100 px-2.5 py-1.5 rounded-lg">✏️</button>
              <button onClick={() => deletePlacette(pl.id)} className="text-xs bg-red-50 text-red-600 px-2.5 py-1.5 rounded-lg">🗑</button>
            </div>
          </div>
        ))}
        {placettes.length === 0 && <p className="px-4 py-3 text-sm text-gray-400">Aucune placette</p>}
      </AdminCard>

      {/* ======== PROTOCOLES & MODALITÉS & PRODUITS ======== */}
      <h2 className="text-lg font-bold gradient-text mt-6">🧪 Protocoles & Produits</h2>

      <AdminCard title="📋 Protocoles" onAdd={() => setModal({ type: "protocole", data: { code: "", label: "", type: "simple", description: "", ordre: protocoles.length + 1 } })}>
        {protocoles.map(p => (
          <div key={p.id} className={`flex items-center justify-between px-4 py-3 ${!p.actif ? "opacity-40" : ""}`}>
            <div className="flex items-center gap-3">
              <span className="text-xs font-mono font-bold text-emerald-700 bg-emerald-50 px-2 py-1 rounded-lg">{p.code}</span>
              <div><div className="font-medium text-sm">{p.label}</div><div className="text-xs text-gray-500">{p.type}</div></div>
            </div>
            <div className="flex gap-1.5">
              <button onClick={() => setModal({ type: "protocole", data: { ...p } })} className="text-xs bg-gray-100 px-2.5 py-1.5 rounded-lg">✏️</button>
              <button onClick={() => deleteProtocole(p.id)} className="text-xs bg-red-50 text-red-600 px-2.5 py-1.5 rounded-lg">🗑</button>
            </div>
          </div>
        ))}
        {protocoles.length === 0 && <p className="px-4 py-3 text-sm text-gray-400">Aucun protocole</p>}
      </AdminCard>

      <AdminCard title="🧪 Modalités" onAdd={() => setModal({ type: "modalite", data: { code: "", label: "", dilution: "", description: "", ordre: modalites.length + 1 } })}>
        {modalites.map(m => (
          <div key={m.id} className={`flex items-center justify-between px-4 py-3 ${!m.actif ? "opacity-40" : ""}`}>
            <div className="flex items-center gap-3">
              <span className="text-xs font-mono font-bold text-amber-700 bg-amber-50 px-2 py-1 rounded-lg">{m.code}</span>
              <div><div className="font-medium text-sm">{m.label}</div><div className="text-xs text-gray-500">{m.dilution || "—"}</div></div>
            </div>
            <div className="flex gap-1.5">
              <button onClick={() => setModal({ type: "modalite", data: { ...m } })} className="text-xs bg-gray-100 px-2.5 py-1.5 rounded-lg">✏️</button>
              <button onClick={() => deleteModalite(m.id)} className="text-xs bg-red-50 text-red-600 px-2.5 py-1.5 rounded-lg">🗑</button>
            </div>
          </div>
        ))}
        {modalites.length === 0 && <p className="px-4 py-3 text-sm text-gray-400">Aucune modalité</p>}
      </AdminCard>

      <AdminCard title="🌿 Produits" onAdd={() => setModal({ type: "produit", data: { code: "", label: "", type: "levain", origine: "", description: "", ordre: produits.length + 1 } })}>
        {produits.map(p => (
          <div key={p.id} className="flex items-center justify-between px-4 py-3">
            <div className="flex items-center gap-3">
              <span className="text-xs font-mono font-bold text-blue-700 bg-blue-50 px-2 py-1 rounded-lg">{p.code}</span>
              <div><div className="font-medium text-sm">{p.label}</div><div className="text-xs text-gray-500">{p.type} · {p.origine || "—"}</div></div>
            </div>
            <div className="flex gap-1.5">
              <button onClick={() => setModal({ type: "produit", data: { ...p } })} className="text-xs bg-gray-100 px-2.5 py-1.5 rounded-lg">✏️</button>
              <button onClick={() => deleteProduit(p.id)} className="text-xs bg-red-50 text-red-600 px-2.5 py-1.5 rounded-lg">🗑</button>
            </div>
          </div>
        ))}
        {produits.length === 0 && <p className="px-4 py-3 text-sm text-gray-400">Aucun produit</p>}
      </AdminCard>

      {/* ======== RESET ======== */}
      <h2 className="text-lg font-bold text-red-600 mt-6">🗑️ Reset données</h2>
      <ResetSection showToast={showToast} />

      {/* ======== MODALS ======== */}

      {/* Modal Site */}
      <EditModal open={modal?.type === "site"} title={modal?.data?.id ? "Modifier site" : "Nouveau site"} onClose={() => setModal(null)} onSave={saveSite} saving={saving}>
        <label className="text-sm font-medium">Nom *</label>
        <input value={modal?.data?.nom || ""} onChange={e => updateModal("nom", e.target.value)} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" placeholder="ex: Château de Piote" />
        <label className="text-sm font-medium">Type d&apos;exploitation</label>
        <select value={modal?.data?.type_exploitation || ""} onChange={e => updateModal("type_exploitation", e.target.value)} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm">
          <option value="">Sélectionner…</option>
          {TYPE_EXPLOITATION.map(t => <option key={t} value={t}>{typeExpLabels[t] || t}</option>)}
        </select>
        <label className="text-sm font-medium">Adresse</label>
        <input value={modal?.data?.adresse || ""} onChange={e => updateModal("adresse", e.target.value)} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" placeholder="ex: Saint-Émilion, Gironde" />
        <div className="grid grid-cols-2 gap-2">
          <div><label className="text-xs font-medium">Latitude</label><input type="number" step="0.000001" value={modal?.data?.latitude ?? ""} onChange={e => updateModal("latitude", e.target.value ? Number(e.target.value) : null)} className="w-full border border-gray-200 rounded-lg px-2 py-2 text-sm" /></div>
          <div><label className="text-xs font-medium">Longitude</label><input type="number" step="0.000001" value={modal?.data?.longitude ?? ""} onChange={e => updateModal("longitude", e.target.value ? Number(e.target.value) : null)} className="w-full border border-gray-200 rounded-lg px-2 py-2 text-sm" /></div>
        </div>
      </EditModal>

      {/* Modal Parcelle */}
      <EditModal open={modal?.type === "parcelle"} title={modal?.data?.id ? "Modifier parcelle" : "Nouvelle parcelle"} onClose={() => setModal(null)} onSave={saveParcelle} saving={saving}>
        <label className="text-sm font-medium">Nom *</label>
        <input value={modal?.data?.nom || ""} onChange={e => updateModal("nom", e.target.value)} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" placeholder="ex: Merlot 3" />
        <label className="text-sm font-medium">Site *</label>
        <select value={modal?.data?.site_id || ""} onChange={e => updateModal("site_id", e.target.value)} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm">
          <option value="">Sélectionner…</option>
          {sites.map(s => <option key={s.id} value={s.id}>{s.nom}</option>)}
        </select>
        <label className="text-sm font-medium">Surface (ha)</label>
        <input type="number" step="0.01" value={modal?.data?.surface ?? ""} onChange={e => updateModal("surface", e.target.value ? Number(e.target.value) : null)} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" />
        <label className="text-sm font-medium">Type de culture</label>
        <select value={modal?.data?.type_culture || ""} onChange={e => updateModal("type_culture", e.target.value)} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm">
          <option value="">Sélectionner…</option>
          {TYPE_CULTURE.map(t => <option key={t} value={t}>{t}</option>)}
        </select>
        <label className="text-sm font-medium">Variété</label>
        <input value={modal?.data?.variete || ""} onChange={e => updateModal("variete", e.target.value)} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" placeholder="ex: Merlot, Tomate Roma" />
        <label className="text-sm font-medium">Type de sol</label>
        <select value={modal?.data?.sol || ""} onChange={e => updateModal("sol", e.target.value)} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm">
          <option value="">Sélectionner…</option>
          {TYPE_SOL.map(t => <option key={t} value={t}>{t}</option>)}
        </select>
      </EditModal>

      {/* Modal Placette */}
      <EditModal open={modal?.type === "placette"} title={modal?.data?.id ? "Modifier placette" : "Nouvelle placette"} onClose={() => setModal(null)} onSave={savePlacette} saving={saving}>
        <label className="text-sm font-medium">Nom *</label>
        <input value={modal?.data?.nom || ""} onChange={e => updateModal("nom", e.target.value)} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" placeholder="ex: Placette 1" />
        <label className="text-sm font-medium">Parcelle *</label>
        <select value={modal?.data?.parcelle_id || ""} onChange={e => updateModal("parcelle_id", e.target.value)} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm">
          <option value="">Sélectionner…</option>
          {parcelles.map(p => <option key={p.id} value={p.id}>{p.nom} ({sites.find(s => s.id === p.site_id)?.nom})</option>)}
        </select>
        <label className="text-sm font-medium">Modalité</label>
        <select value={modal?.data?.modalite_id || ""} onChange={e => updateModal("modalite_id", e.target.value)} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm">
          <option value="">Aucune</option>
          {modalites.map(m => <option key={m.id} value={m.code}>{m.code} — {m.label}</option>)}
        </select>
        <label className="text-sm font-medium">Nombre de ceps</label>
        <input type="number" value={modal?.data?.nb_ceps || 7} onChange={e => updateModal("nb_ceps", Number(e.target.value))} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" />
        <label className="text-sm font-medium">Position</label>
        <input value={modal?.data?.description_position || ""} onChange={e => updateModal("description_position", e.target.value)} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" placeholder="ex: début du rang 3" />
        <label className="text-sm font-medium">Pieds marqués</label>
        <input value={modal?.data?.pieds_marques || ""} onChange={e => updateModal("pieds_marques", e.target.value)} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" placeholder="ex: pieds 10 à 16" />
      </EditModal>

      {/* Modal Protocole */}
      <EditModal open={modal?.type === "protocole"} title={modal?.data?.id ? "Modifier protocole" : "Nouveau protocole"} onClose={() => setModal(null)} onSave={saveProtocole} saving={saving}>
        <label className="text-sm font-medium">Code *</label>
        <input value={modal?.data?.code || ""} onChange={e => updateModal("code", e.target.value)} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm font-mono" placeholder="ex: P1S" />
        <label className="text-sm font-medium">Label *</label>
        <input value={modal?.data?.label || ""} onChange={e => updateModal("label", e.target.value)} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" />
        <label className="text-sm font-medium">Type</label>
        <select value={modal?.data?.type || "simple"} onChange={e => updateModal("type", e.target.value)} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm">
          <option value="simple">Simple</option><option value="sequentiel">Séquentiel</option><option value="meme_temps">Même temps</option>
        </select>
        <label className="text-sm font-medium">Description</label>
        <input value={modal?.data?.description || ""} onChange={e => updateModal("description", e.target.value)} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" />
      </EditModal>

      {/* Modal Modalité */}
      <EditModal open={modal?.type === "modalite"} title={modal?.data?.id ? "Modifier modalité" : "Nouvelle modalité"} onClose={() => setModal(null)} onSave={saveModalite} saving={saving}>
        <label className="text-sm font-medium">Code *</label>
        <input value={modal?.data?.code || ""} onChange={e => updateModal("code", e.target.value)} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm font-mono" placeholder="ex: M0, M1" />
        <label className="text-sm font-medium">Label *</label>
        <input value={modal?.data?.label || ""} onChange={e => updateModal("label", e.target.value)} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" />
        <label className="text-sm font-medium">Dilution</label>
        <input value={modal?.data?.dilution || ""} onChange={e => updateModal("dilution", e.target.value)} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" placeholder="ex: 1/4, 1/2" />
        <label className="text-sm font-medium">Description</label>
        <input value={modal?.data?.description || ""} onChange={e => updateModal("description", e.target.value)} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" />
      </EditModal>

      {/* Modal Produit */}
      <EditModal open={modal?.type === "produit"} title={modal?.data?.id ? "Modifier produit" : "Nouveau produit"} onClose={() => setModal(null)} onSave={saveProduit} saving={saving}>
        <label className="text-sm font-medium">Code *</label>
        <input value={modal?.data?.code || ""} onChange={e => updateModal("code", e.target.value)} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm font-mono" placeholder="ex: LEV01" />
        <label className="text-sm font-medium">Label *</label>
        <input value={modal?.data?.label || ""} onChange={e => updateModal("label", e.target.value)} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" />
        <label className="text-sm font-medium">Type</label>
        <select value={modal?.data?.type || "levain"} onChange={e => updateModal("type", e.target.value)} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm">
          <option value="levain">Levain</option><option value="phyto">Phyto</option><option value="autre">Autre</option>
        </select>
        <label className="text-sm font-medium">Origine</label>
        <input value={modal?.data?.origine || ""} onChange={e => updateModal("origine", e.target.value)} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" />
        <label className="text-sm font-medium">Description</label>
        <input value={modal?.data?.description || ""} onChange={e => updateModal("description", e.target.value)} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" />
      </EditModal>
    </div>
  );
}
