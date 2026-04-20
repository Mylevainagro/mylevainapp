"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase/client";
import { useAuth } from "@/components/AuthProvider";
import { AdminCard } from "@/components/admin/AdminCard";
import { EditModal } from "@/components/admin/EditModal";
import { Toast } from "@/components/Toast";
import { ListSkeleton } from "@/components/Skeleton";
import { GpsField } from "@/components/ui/GpsField";

// ---- Types locaux simplifiés ----
interface SiteItem { id: string; nom: string; type_exploitation: string | null; adresse: string | null; latitude: number | null; longitude: number | null; actif: boolean; }
interface ParcelleItem { id: string; site_id: string; nom: string; surface: number | null; type_culture: string | null; variete: string | null; sol: string | null; culture_id: string | null; }
interface PlacetteItem { id: string; parcelle_id: string; modalite_id: string | null; nom: string; nb_ceps: number; description_position: string | null; pieds_marques: string | null; actif: boolean; }
interface ProtocoleItem { id: string; code: string; label: string; type: string; description: string | null; actif: boolean; ordre: number; }
interface ModaliteLevainItem { id: string; code: string; label: string; dilution: string | null; description: string | null; actif: boolean; ordre: number; }
interface ProduitItem { id: string; code: string; label: string; type: string; origine: string | null; description: string | null; actif: boolean; ordre: number; }
interface AppUserItem { id: string; email: string; nom: string; role: string; approved: boolean; created_at: string; last_login: string | null; }
interface CultureItem { id: string; code: string; nom: string; actif: boolean; }
interface BbchStadeItem { id: string; culture_id: string; code: string; label: string; description: string | null; ordre: number; actif: boolean; }
interface RangModalite { rang: number; temoin: boolean; produit1: string; dose1: string; produit2: string; dose2: string; modalite_code: string; }

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
  const [cultures, setCultures] = useState<CultureItem[]>([]);
  const [bbchStades, setBbchStades] = useState<BbchStadeItem[]>([]);
  const [bbchFilterCulture, setBbchFilterCulture] = useState("");
  const [parcelleRangs, setParcelleRangs] = useState<RangModalite[]>([]);
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
      // Load cultures & BBCH
      const { data: cultData } = await supabase.from("cultures").select("*").order("nom");
      if (cultData) setCultures(cultData);
      const { data: bbchData } = await supabase.from("bbch_stades").select("*").order("ordre");
      if (bbchData) setBbchStades(bbchData);
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
  async function openParcelleModal(data: any) {
    setModal({ type: "parcelle", data });
    // Load existing rangs if editing
    if (data.id) {
      const { data: rangsData } = await supabase.from("parcelle_rangs").select("rang, produit, produit2, dose, dose2, modalite_code, temoin").eq("parcelle_id", data.id).order("rang");
      if (rangsData && rangsData.length > 0) {
        setParcelleRangs(rangsData.map((r: any) => ({ rang: r.rang, temoin: r.temoin || false, produit1: r.produit || "", dose1: r.dose || "", produit2: r.produit2 || "", dose2: r.dose2 || "", modalite_code: r.modalite_code || "" })));
      } else if (data.nb_rangs) {
        setParcelleRangs(Array.from({ length: data.nb_rangs }, (_, i) => ({ rang: i + 1, temoin: false, produit1: "", dose1: "", produit2: "", dose2: "", modalite_code: "" })));
      } else {
        setParcelleRangs([]);
      }
    } else {
      setParcelleRangs([]);
    }
  }

  async function saveParcelle() {
    setSaving(true); const d = modal?.data;
    const payload = { nom: d.nom, site_id: d.site_id, surface: d.surface || null, type_culture: d.type_culture || null, variete: d.variete || null, sol: d.sol || null, culture_id: d.culture_id || null, commentaire: d.commentaire || null, latitude: d.latitude || null, longitude: d.longitude || null, nb_rangs: d.nb_rangs || null, longueur: d.longueur || null, ecartement: d.ecartement || null, annee_protocole: d.annee_protocole || null, photo_url: d.photo_url || null, plan_pdf_url: d.plan_pdf_url || null };
    let parcelleId = d.id;
    if (d.id) { await supabase.from("parcelles").update(payload).eq("id", d.id); showToast("Parcelle modifiée"); }
    else { const { data: newP, error } = await supabase.from("parcelles").insert(payload).select("id").single(); if (error) { showToast(error.message, "error"); setSaving(false); setModal(null); return; } else { showToast("Parcelle ajoutée"); parcelleId = newP.id; } }
    // Save rangs
    if (parcelleId && parcelleRangs.length > 0) {
      await supabase.from("parcelle_rangs").delete().eq("parcelle_id", parcelleId);
      const rangRecords = parcelleRangs.filter(r => r.produit1 || r.dose1 || r.modalite_code || r.temoin).map(r => ({
        parcelle_id: parcelleId, rang: r.rang, produit: r.produit1 || null, dose: r.dose1 || null, produit2: r.produit2 || null, dose2: r.dose2 || null, modalite_code: r.modalite_code || null, temoin: r.temoin || false,
      }));
      if (rangRecords.length > 0) await supabase.from("parcelle_rangs").insert(rangRecords);
    }
    setSaving(false); setModal(null); setParcelleRangs([]);
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
    const payload = { code: d.code, label: d.label, dilution: d.dilution || d.levain_dilution || null, description: d.description || null, actif: d.actif ?? true, ordre: d.ordre || 1, levain_type: d.levain_type || null, levain_dilution: d.levain_dilution || d.dilution || null, phyto_type: d.phyto_type || null, phyto_dose: d.phyto_dose || null };
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

  // ---- CRUD Cultures ----
  async function saveCulture() {
    setSaving(true); const d = modal?.data;
    if (d.id) { await supabase.from("cultures").update({ code: d.code, nom: d.nom, actif: d.actif ?? true }).eq("id", d.id); showToast("Culture modifiée"); }
    else { const { error } = await supabase.from("cultures").insert({ code: d.code, nom: d.nom, actif: true }); if (error) showToast(error.message, "error"); else showToast("Culture ajoutée"); }
    setSaving(false); setModal(null);
    const { data } = await supabase.from("cultures").select("*").order("nom"); if (data) setCultures(data);
  }
  async function deleteCulture(id: string) { if (!confirm("Supprimer cette culture et ses stades BBCH ?")) return; await supabase.from("cultures").delete().eq("id", id); setCultures(c => c.filter(x => x.id !== id)); setBbchStades(b => b.filter(x => x.culture_id !== id)); showToast("Supprimé"); }

  // ---- CRUD BBCH ----
  async function saveBbch() {
    setSaving(true); const d = modal?.data;
    if (d.id) { await supabase.from("bbch_stades").update({ code: d.code, label: d.label, description: d.description || null, ordre: d.ordre || 0, actif: d.actif ?? true }).eq("id", d.id); showToast("Stade modifié"); }
    else { const { error } = await supabase.from("bbch_stades").insert({ culture_id: d.culture_id, code: d.code, label: d.label, description: d.description || null, ordre: d.ordre || 0, actif: true }); if (error) showToast(error.message, "error"); else showToast("Stade ajouté"); }
    setSaving(false); setModal(null);
    const { data } = await supabase.from("bbch_stades").select("*").order("ordre"); if (data) setBbchStades(data);
  }
  async function deleteBbch(id: string) { if (!confirm("Supprimer ?")) return; await supabase.from("bbch_stades").delete().eq("id", id); setBbchStades(b => b.filter(x => x.id !== id)); showToast("Supprimé"); }

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
      <AdminCard title="🌿 Parcelles" onAdd={() => openParcelleModal({ nom: "", site_id: sites[0]?.id || "", surface: null, type_culture: "", variete: "", sol: "", nb_rangs: null })}>
        {parcelles.map(p => (
          <div key={p.id} className="flex items-center justify-between px-4 py-3">
            <div>
              <div className="font-medium text-sm">{p.nom}</div>
              <div className="text-xs text-gray-500">
                {sites.find(s => s.id === p.site_id)?.nom || "?"} · {cultures.find(c => c.id === p.culture_id)?.nom || p.type_culture || "—"} · {p.variete || "—"}
                {p.surface && ` · ${p.surface} ha`}
              </div>
            </div>
            <div className="flex gap-1.5">
              <button onClick={() => openParcelleModal({ ...p })} className="text-xs bg-gray-100 px-2.5 py-1.5 rounded-lg">✏️</button>
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

      {/* ======== CULTURES & BBCH ======== */}
      <h2 className="text-lg font-bold gradient-text mt-6">🌾 Cultures & Stades BBCH</h2>

      <AdminCard title="🌾 Cultures" onAdd={() => setModal({ type: "culture", data: { code: "", nom: "" } })}>
        {cultures.map(c => (
          <div key={c.id} className={`flex items-center justify-between px-4 py-3 ${!c.actif ? "opacity-40" : ""}`}>
            <div className="flex items-center gap-3">
              <span className="text-xs font-mono font-bold text-emerald-700 bg-emerald-50 px-2 py-1 rounded-lg">{c.code}</span>
              <span className="font-medium text-sm">{c.nom}</span>
            </div>
            <div className="flex gap-1.5">
              <button onClick={() => setModal({ type: "culture", data: { ...c } })} className="text-xs bg-gray-100 px-2.5 py-1.5 rounded-lg">✏️</button>
              <button onClick={() => deleteCulture(c.id)} className="text-xs bg-red-50 text-red-600 px-2.5 py-1.5 rounded-lg">🗑</button>
            </div>
          </div>
        ))}
        {cultures.length === 0 && <p className="px-4 py-3 text-sm text-gray-400">Aucune culture — exécuter migration 020</p>}
      </AdminCard>

      <AdminCard title="📊 Stades BBCH" onAdd={() => setModal({ type: "bbch", data: { culture_id: cultures[0]?.id || "", code: "", label: "", description: "", ordre: bbchStades.length + 1 } })}>
        <div className="px-4 py-2">
          <select value={bbchFilterCulture} onChange={e => setBbchFilterCulture(e.target.value)} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm">
            <option value="">Toutes les cultures</option>
            {cultures.map(c => <option key={c.id} value={c.id}>{c.nom}</option>)}
          </select>
        </div>
        {(bbchFilterCulture ? bbchStades.filter(b => b.culture_id === bbchFilterCulture) : bbchStades).map(b => (
          <div key={b.id} className={`flex items-center justify-between px-4 py-2.5 ${!b.actif ? "opacity-40" : ""}`}>
            <div className="flex items-center gap-3">
              <span className="text-xs font-mono font-bold text-blue-700 bg-blue-50 px-2 py-1 rounded-lg w-10 text-center">{b.code}</span>
              <div>
                <div className="font-medium text-sm">{b.label}</div>
                <div className="text-[10px] text-gray-400">{cultures.find(c => c.id === b.culture_id)?.nom} · {b.description || "—"}</div>
              </div>
            </div>
            <div className="flex gap-1.5">
              <button onClick={() => setModal({ type: "bbch", data: { ...b } })} className="text-xs bg-gray-100 px-2 py-1 rounded-lg">✏️</button>
              <button onClick={() => deleteBbch(b.id)} className="text-xs bg-red-50 text-red-600 px-2 py-1 rounded-lg">🗑</button>
            </div>
          </div>
        ))}
        {bbchStades.length === 0 && <p className="px-4 py-3 text-sm text-gray-400">Aucun stade — exécuter migration 020</p>}
      </AdminCard>

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
        <GpsField
          latitude={modal?.data?.latitude ?? null}
          longitude={modal?.data?.longitude ?? null}
          onChangeLatitude={v => updateModal("latitude", v)}
          onChangeLongitude={v => updateModal("longitude", v)}
        />
      </EditModal>

      {/* Modal Parcelle */}
      <EditModal open={modal?.type === "parcelle"} title={modal?.data?.id ? "Modifier parcelle" : "Nouvelle parcelle"} onClose={() => setModal(null)} onSave={saveParcelle} saving={saving}>
        <label className="text-sm font-medium">Site *</label>
        <select value={modal?.data?.site_id || ""} onChange={e => updateModal("site_id", e.target.value)} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm">
          <option value="">Sélectionner…</option>
          {sites.map(s => <option key={s.id} value={s.id}>{s.nom}</option>)}
        </select>
        <label className="text-sm font-medium">Culture *</label>
        <select value={modal?.data?.culture_id || modal?.data?.type_culture || ""} onChange={e => { updateModal("culture_id", e.target.value); updateModal("type_culture", e.target.value ? cultures.find(c => c.id === e.target.value)?.code ?? "" : ""); }} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm">
          <option value="">Sélectionner…</option>
          {cultures.map(c => <option key={c.id} value={c.id}>{c.nom}</option>)}
        </select>
        <label className="text-sm font-medium">{cultures.find(c => c.id === modal?.data?.culture_id)?.code === 'vigne' ? 'Appellation / Cépage' : 'Variété'}</label>
        <input value={modal?.data?.variete || ""} onChange={e => updateModal("variete", e.target.value)} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" placeholder={cultures.find(c => c.id === modal?.data?.culture_id)?.code === 'vigne' ? 'ex: Merlot, Saint-Émilion Grand Cru' : 'ex: Roma, Golden'} />
        <label className="text-sm font-medium">Nom de la parcelle *</label>
        <input value={modal?.data?.nom || ""} onChange={e => updateModal("nom", e.target.value)} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" placeholder="ex: Merlot 3, Champ Nord" />
        <label className="text-sm font-medium">Année du protocole</label>
        <input value={modal?.data?.annee_protocole || ""} onChange={e => updateModal("annee_protocole", e.target.value)} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" placeholder="ex: 2026" />
        <div className="grid grid-cols-3 gap-2">
          <div>
            <label className="text-sm font-medium">Nb rangs</label>
            <input type="number" min={1} max={200} value={modal?.data?.nb_rangs ?? ""} onChange={e => {
              const nb = e.target.value ? Number(e.target.value) : null;
              updateModal("nb_rangs", nb);
              // Auto-calc surface
              if (nb && modal?.data?.longueur && modal?.data?.ecartement) {
                updateModal("surface", Math.round(nb * modal.data.longueur * modal.data.ecartement / 10000 * 100) / 100);
              }
              // Regenerate rangs
              if (nb && nb > 0) {
                setParcelleRangs(Array.from({ length: nb }, (_, i) => parcelleRangs[i] || { rang: i + 1, temoin: false, produit1: "", dose1: "", produit2: "", dose2: "", modalite_code: "" }));
              }
            }} className="w-full border border-gray-200 rounded-lg px-2 py-2 text-sm" placeholder="7" />
          </div>
          <div>
            <label className="text-sm font-medium">Longueur (m)</label>
            <input type="number" step="1" value={modal?.data?.longueur ?? ""} onChange={e => {
              const l = e.target.value ? Number(e.target.value) : null;
              updateModal("longueur", l);
              if (modal?.data?.nb_rangs && l && modal?.data?.ecartement) {
                updateModal("surface", Math.round(modal.data.nb_rangs * l * modal.data.ecartement / 10000 * 100) / 100);
              }
            }} className="w-full border border-gray-200 rounded-lg px-2 py-2 text-sm" placeholder="100" />
          </div>
          <div>
            <label className="text-sm font-medium">Écart. (m)</label>
            <input type="number" step="0.1" value={modal?.data?.ecartement ?? ""} onChange={e => {
              const ec = e.target.value ? Number(e.target.value) : null;
              updateModal("ecartement", ec);
              if (modal?.data?.nb_rangs && modal?.data?.longueur && ec) {
                updateModal("surface", Math.round(modal.data.nb_rangs * modal.data.longueur * ec / 10000 * 100) / 100);
              }
            }} className="w-full border border-gray-200 rounded-lg px-2 py-2 text-sm" placeholder="1.5" />
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex-1">
            <label className="text-sm font-medium">Surface (ha)</label>
            <input type="number" step="0.01" value={modal?.data?.surface ?? ""} onChange={e => updateModal("surface", e.target.value ? Number(e.target.value) : null)} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" />
          </div>
          {modal?.data?.nb_rangs && modal?.data?.longueur && modal?.data?.ecartement && (
            <div className="text-[10px] text-emerald-600 mt-5">
              ✓ {modal.data.nb_rangs} × {modal.data.longueur}m × {modal.data.ecartement}m = {modal.data.surface} ha
            </div>
          )}
        </div>
        {/* Modalités par rang */}
        {modal?.data?.nb_rangs > 0 && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium">🌱 Modalités par rang</label>
              <button type="button" onClick={() => {
                const nb = modal?.data?.nb_rangs || 0;
                setParcelleRangs(Array.from({ length: nb }, (_, i) => parcelleRangs[i] || { rang: i + 1, temoin: false, produit1: "", dose1: "", produit2: "", dose2: "", modalite_code: "" }));
              }} className="text-[10px] text-emerald-600 font-medium">🔄 Regénérer</button>
            </div>
            {parcelleRangs.map((r, i) => (
              <div key={r.rang} className={`rounded-xl p-3 space-y-2 ${r.temoin ? "bg-gray-100 border border-gray-300" : "bg-gray-50"}`}>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-emerald-700 bg-emerald-100 px-2 py-1 rounded-lg shrink-0">R{r.rang}</span>
                  <label className="flex items-center gap-1.5 cursor-pointer text-xs">
                    <input type="checkbox" checked={r.temoin} onChange={e => { const n = [...parcelleRangs]; n[i] = { ...n[i], temoin: e.target.checked, produit1: e.target.checked ? "" : n[i].produit1, dose1: e.target.checked ? "" : n[i].dose1, produit2: e.target.checked ? "" : n[i].produit2, dose2: e.target.checked ? "" : n[i].dose2, modalite_code: e.target.checked ? "M0" : n[i].modalite_code }; setParcelleRangs(n); }}
                      className="w-4 h-4 rounded border-gray-300 text-gray-500" />
                    <span className={r.temoin ? "font-semibold text-gray-600" : "text-gray-500"}>Témoin non traité</span>
                  </label>
                  {!r.temoin && (
                    <select value={r.modalite_code} onChange={e => { const n = [...parcelleRangs]; n[i] = { ...n[i], modalite_code: e.target.value }; setParcelleRangs(n); }}
                      className="border border-gray-200 rounded-lg px-2 py-1 text-xs flex-1">
                      <option value="">Modalité…</option>
                      {modalites.filter(m => m.code !== "M0").map(m => <option key={m.id} value={m.code}>{m.code} — {m.label}</option>)}
                    </select>
                  )}
                </div>
                {!r.temoin && (
                  <>
                    <div className="grid grid-cols-2 gap-2">
                      <input value={r.produit1} onChange={e => { const n = [...parcelleRangs]; n[i] = { ...n[i], produit1: e.target.value }; setParcelleRangs(n); }}
                        placeholder="Produit 1 (ex: Surnageant)" className="border border-gray-200 rounded-lg px-2 py-1.5 text-xs" />
                      <input value={r.dose1} onChange={e => { const n = [...parcelleRangs]; n[i] = { ...n[i], dose1: e.target.value }; setParcelleRangs(n); }}
                        placeholder="Dose 1 (ex: 1/4)" className="border border-gray-200 rounded-lg px-2 py-1.5 text-xs" />
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <input value={r.produit2} onChange={e => { const n = [...parcelleRangs]; n[i] = { ...n[i], produit2: e.target.value }; setParcelleRangs(n); }}
                        placeholder="Produit 2 (ex: Cuivre)" className="border border-gray-200 rounded-lg px-2 py-1.5 text-xs" />
                      <input value={r.dose2} onChange={e => { const n = [...parcelleRangs]; n[i] = { ...n[i], dose2: e.target.value }; setParcelleRangs(n); }}
                        placeholder="Dose 2 (ex: 50%)" className="border border-gray-200 rounded-lg px-2 py-1.5 text-xs" />
                    </div>
                  </>
                )}
                {r.temoin && <p className="text-[10px] text-gray-500 italic ml-8">Aucun traitement — rang de référence</p>}
              </div>
            ))}
            {parcelleRangs.length === 0 && modal?.data?.nb_rangs > 0 && (
              <button type="button" onClick={() => {
                setParcelleRangs(Array.from({ length: modal?.data?.nb_rangs ?? 0 }, (_, i) => ({ rang: i + 1, temoin: false, produit1: "", dose1: "", produit2: "", dose2: "", modalite_code: "" })));
              }} className="w-full border-2 border-dashed border-gray-300 rounded-lg py-2 text-xs text-gray-500 hover:border-emerald-400">
                + Générer {modal?.data?.nb_rangs} rangs
              </button>
            )}
          </div>
        )}
        <label className="text-sm font-medium">Type de sol</label>
        <select value={modal?.data?.sol || ""} onChange={e => updateModal("sol", e.target.value)} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm">
          <option value="">Sélectionner…</option>
          {TYPE_SOL.map(t => <option key={t} value={t}>{t}</option>)}
        </select>
        <label className="text-sm font-medium">Commentaire</label>
        <textarea value={modal?.data?.commentaire || ""} onChange={e => updateModal("commentaire", e.target.value)} rows={2} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" placeholder="Notes libres sur la parcelle…" />
        <label className="text-sm font-medium">📷 Photo parcelle (URL)</label>
        <input value={modal?.data?.photo_url || ""} onChange={e => updateModal("photo_url", e.target.value)} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" placeholder="URL de la photo" />
        <label className="text-sm font-medium">📄 PDF plan expérimental (URL)</label>
        <input value={modal?.data?.plan_pdf_url || ""} onChange={e => updateModal("plan_pdf_url", e.target.value)} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" placeholder="URL du PDF" />
        <GpsField
          latitude={modal?.data?.latitude ?? null}
          longitude={modal?.data?.longitude ?? null}
          onChangeLatitude={v => updateModal("latitude", v)}
          onChangeLongitude={v => updateModal("longitude", v)}
        />
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
        <label className="text-sm font-medium">Type levain</label>
        <input value={modal?.data?.levain_type || ""} onChange={e => updateModal("levain_type", e.target.value)} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" placeholder="ex: Surnageant, Aucun" />
        <label className="text-sm font-medium">Dilution levain</label>
        <input value={modal?.data?.levain_dilution || modal?.data?.dilution || ""} onChange={e => { updateModal("levain_dilution", e.target.value); updateModal("dilution", e.target.value); }} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" placeholder="ex: 1/4, 1/2" />
        <label className="text-sm font-medium">Produit phyto</label>
        <input value={modal?.data?.phyto_type || ""} onChange={e => updateModal("phyto_type", e.target.value)} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" placeholder="ex: Cuivre, Soufre, Aucun" />
        <label className="text-sm font-medium">Dose phyto</label>
        <input value={modal?.data?.phyto_dose || ""} onChange={e => updateModal("phyto_dose", e.target.value)} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" placeholder="ex: 100%, 50%, 25%" />
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

      {/* Modal Culture */}
      <EditModal open={modal?.type === "culture"} title={modal?.data?.id ? "Modifier culture" : "Nouvelle culture"} onClose={() => setModal(null)} onSave={saveCulture} saving={saving}>
        <label className="text-sm font-medium">Code *</label>
        <input value={modal?.data?.code || ""} onChange={e => updateModal("code", e.target.value)} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm font-mono" placeholder="ex: vigne, ble, mais" />
        <label className="text-sm font-medium">Nom *</label>
        <input value={modal?.data?.nom || ""} onChange={e => updateModal("nom", e.target.value)} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" placeholder="ex: Vigne, Blé, Maïs" />
      </EditModal>

      {/* Modal BBCH */}
      <EditModal open={modal?.type === "bbch"} title={modal?.data?.id ? "Modifier stade BBCH" : "Nouveau stade BBCH"} onClose={() => setModal(null)} onSave={saveBbch} saving={saving}>
        <label className="text-sm font-medium">Culture *</label>
        <select value={modal?.data?.culture_id || ""} onChange={e => updateModal("culture_id", e.target.value)} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm">
          <option value="">Sélectionner…</option>
          {cultures.map(c => <option key={c.id} value={c.id}>{c.nom}</option>)}
        </select>
        <label className="text-sm font-medium">Code BBCH *</label>
        <input value={modal?.data?.code || ""} onChange={e => updateModal("code", e.target.value)} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm font-mono" placeholder="ex: 09, 23, 65" />
        <label className="text-sm font-medium">Label *</label>
        <input value={modal?.data?.label || ""} onChange={e => updateModal("label", e.target.value)} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" placeholder="ex: Débourrement, Floraison" />
        <label className="text-sm font-medium">Description</label>
        <input value={modal?.data?.description || ""} onChange={e => updateModal("description", e.target.value)} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" placeholder="ex: Pointe verte visible" />
        <label className="text-sm font-medium">Ordre</label>
        <input type="number" value={modal?.data?.ordre || 0} onChange={e => updateModal("ordre", Number(e.target.value))} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" />
      </EditModal>
    </div>
  );
}
