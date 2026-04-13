"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase/client";
import { useAuth } from "@/components/AuthProvider";
import { AdminCard } from "@/components/admin/AdminCard";
import { EditModal } from "@/components/admin/EditModal";
import { Toast } from "@/components/Toast";
import { ListSkeleton } from "@/components/Skeleton";

// ---- Types locaux ----
interface Vignoble { id: string; nom: string; localisation: string; appellation: string | null; type_sol: string | null; }
interface Parcelle { id: string; vignoble_id: string; nom: string; cepage: string | null; nb_rangs: number; }
interface ModaliteRef { rang: number; modalite: string; description: string | null; surnageant_l: number; eau_l: number; volume_l: number; actif: boolean; }
interface ConfigItem { cle: string; valeur: string; categorie: string; description: string | null; }
interface AppUserItem { id: string; email: string; nom: string; role: string; approved: boolean; created_at: string; last_login: string | null; }

export default function AdminPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [vignobles, setVignobles] = useState<Vignoble[]>([]);
  const [parcelles, setParcelles] = useState<Parcelle[]>([]);
  const [modalites, setModalites] = useState<ModaliteRef[]>([]);
  const [configs, setConfigs] = useState<ConfigItem[]>([]);
  const [appUsers, setAppUsers] = useState<AppUserItem[]>([]);
  const [toast, setToast] = useState({ message: "", type: "success" as "success" | "error", visible: false });
  const hideToast = useCallback(() => setToast(t => ({ ...t, visible: false })), []);

  // Modal state
  const [modal, setModal] = useState<{ type: string; data: any } | null>(null);
  const [saving, setSaving] = useState(false);

  // Admin guard — redirect non-admin users
  useEffect(() => {
    if (user && user.role !== 'admin') {
      router.push('/');
    }
  }, [user, router]);

  // ---- Chargement initial ----
  useEffect(() => {
    async function load() {
      const [v, p, m, c] = await Promise.all([
        supabase.from("vignobles").select("*").order("nom"),
        supabase.from("parcelles").select("*").order("nom"),
        supabase.from("referentiel_modalites").select("*").order("rang"),
        supabase.from("app_config").select("*").order("categorie"),
      ]);
      if (v.data) setVignobles(v.data);
      if (p.data) setParcelles(p.data);
      if (m.data) setModalites(m.data);
      if (c.data) setConfigs(c.data);

      // Load users
      const usersRes = await fetch('/api/auth/users');
      if (usersRes.ok) {
        const usersData = await usersRes.json();
        setAppUsers(usersData.users || []);
      }

      setLoading(false);
    }
    load();
  }, []);

  function showToast(message: string, type: "success" | "error" = "success") {
    setToast({ message, type, visible: true });
  }

  // ---- CRUD Vignobles ----
  async function saveVignoble() {
    setSaving(true);
    const d = modal?.data;
    if (d.id) {
      const { error } = await supabase.from("vignobles").update({ nom: d.nom, localisation: d.localisation, appellation: d.appellation, type_sol: d.type_sol }).eq("id", d.id);
      if (error) { showToast(error.message, "error"); } else { showToast("Vignoble modifié"); }
    } else {
      const { error } = await supabase.from("vignobles").insert({ nom: d.nom, localisation: d.localisation, appellation: d.appellation, type_sol: d.type_sol });
      if (error) { showToast(error.message, "error"); } else { showToast("Vignoble ajouté"); }
    }
    setSaving(false);
    setModal(null);
    const { data } = await supabase.from("vignobles").select("*").order("nom");
    if (data) setVignobles(data);
  }

  async function deleteVignoble(id: string) {
    if (!confirm("Supprimer ce vignoble et toutes ses parcelles ?")) return;
    await supabase.from("vignobles").delete().eq("id", id);
    setVignobles(v => v.filter(x => x.id !== id));
    showToast("Vignoble supprimé");
  }

  // ---- CRUD Parcelles ----
  async function saveParcelle() {
    setSaving(true);
    const d = modal?.data;
    if (d.id) {
      const { error } = await supabase.from("parcelles").update({ nom: d.nom, vignoble_id: d.vignoble_id, cepage: d.cepage, nb_rangs: d.nb_rangs }).eq("id", d.id);
      if (error) { showToast(error.message, "error"); } else { showToast("Parcelle modifiée"); }
    } else {
      const { error } = await supabase.from("parcelles").insert({ nom: d.nom, vignoble_id: d.vignoble_id, cepage: d.cepage, nb_rangs: d.nb_rangs || 7 });
      if (error) { showToast(error.message, "error"); } else { showToast("Parcelle ajoutée"); }
    }
    setSaving(false);
    setModal(null);
    const { data } = await supabase.from("parcelles").select("*").order("nom");
    if (data) setParcelles(data);
  }

  async function deleteParcelle(id: string) {
    if (!confirm("Supprimer cette parcelle et toutes ses observations ?")) return;
    await supabase.from("parcelles").delete().eq("id", id);
    setParcelles(p => p.filter(x => x.id !== id));
    showToast("Parcelle supprimée");
  }

  // ---- CRUD Modalités ----
  async function saveModalite() {
    setSaving(true);
    const d = modal?.data;
    const isNew = modal?.type === "modalite_new";
    if (isNew) {
      const { error } = await supabase.from("referentiel_modalites").insert({
        rang: d.rang, modalite: d.modalite, description: d.description,
        surnageant_l: d.surnageant_l || 0, eau_l: d.eau_l || 0, volume_l: d.volume_l || 0, actif: true,
      });
      if (error) { showToast(error.message, "error"); } else { showToast("Modalité ajoutée"); }
    } else {
      const { error } = await supabase.from("referentiel_modalites").update({
        modalite: d.modalite, description: d.description,
        surnageant_l: d.surnageant_l, eau_l: d.eau_l, volume_l: d.volume_l, actif: d.actif,
      }).eq("rang", d.rang);
      if (error) { showToast(error.message, "error"); } else { showToast("Modalité modifiée"); }
    }
    setSaving(false);
    setModal(null);
    const { data } = await supabase.from("referentiel_modalites").select("*").order("rang");
    if (data) setModalites(data);
  }

  // ---- CRUD Config ----
  async function saveConfig() {
    setSaving(true);
    const d = modal?.data;
    const isNew = modal?.type === "config_new";
    if (isNew) {
      const { error } = await supabase.from("app_config").insert({ cle: d.cle, valeur: d.valeur, categorie: d.categorie, description: d.description });
      if (error) { showToast(error.message, "error"); } else { showToast("Paramètre ajouté"); }
    } else {
      const { error } = await supabase.from("app_config").update({ valeur: d.valeur, description: d.description }).eq("cle", d.cle);
      if (error) { showToast(error.message, "error"); } else { showToast("Paramètre modifié"); }
    }
    setSaving(false);
    setModal(null);
    const { data } = await supabase.from("app_config").select("*").order("categorie");
    if (data) setConfigs(data);
  }

  function updateModal(field: string, value: any) {
    setModal(m => m ? { ...m, data: { ...m.data, [field]: value } } : null);
  }

  // ---- User management ----
  async function toggleUserApproval(userId: string, approved: boolean) {
    const res = await fetch('/api/auth/users', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_id: userId, approved }),
    });
    if (res.ok) {
      setAppUsers(users => users.map(u => u.id === userId ? { ...u, approved } : u));
      showToast(approved ? 'Utilisateur approuvé' : 'Accès révoqué');
    } else {
      showToast('Erreur', 'error');
    }
  }

  async function deleteUser(userId: string) {
    if (!confirm('Supprimer cet utilisateur ?')) return;
    const res = await fetch('/api/auth/users', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_id: userId }),
    });
    if (res.ok) {
      setAppUsers(users => users.filter(u => u.id !== userId));
      showToast('Utilisateur supprimé');
    } else {
      const data = await res.json();
      showToast(data.error || 'Erreur', 'error');
    }
  }

  if (user?.role !== 'admin') return null;

  // ---- RENDER ----
  if (loading) return <div className="pt-4"><ListSkeleton count={4} /></div>;

  return (
    <div className="space-y-4">
      <Toast message={toast.message} type={toast.type} visible={toast.visible} onClose={hideToast} />

      <h1 className="text-xl font-bold gradient-text">⚙️ Administration</h1>

      {/* ---- UTILISATEURS ---- */}
      <AdminCard title="👥 Gestion des utilisateurs">
        {appUsers.map(u => (
          <div key={u.id} className="flex items-center justify-between px-4 py-3">
            <div className="flex items-center gap-3">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                u.role === 'admin' ? 'bg-amber-100 text-amber-700' : u.approved ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-500'
              }`}>
                {u.role === 'admin' ? '👑' : u.approved ? '✓' : '⏳'}
              </div>
              <div>
                <div className="font-medium text-sm">{u.nom}</div>
                <div className="text-xs text-gray-500">{u.email}</div>
                <div className="text-[10px] text-gray-400">
                  {u.role === 'admin' ? 'Administrateur' : u.approved ? 'Approuvé' : 'En attente'}
                  {u.last_login && ` · Dernière connexion : ${new Date(u.last_login).toLocaleDateString('fr-FR')}`}
                </div>
              </div>
            </div>
            {u.role !== 'admin' && (
              <div className="flex gap-1.5">
                <button
                  onClick={() => toggleUserApproval(u.id, !u.approved)}
                  className={`text-xs px-2.5 py-1.5 rounded-lg active:scale-95 ${
                    u.approved ? 'bg-orange-50 text-orange-600' : 'bg-emerald-50 text-emerald-600'
                  }`}
                >
                  {u.approved ? '🚫 Révoquer' : '✅ Approuver'}
                </button>
                <button
                  onClick={() => deleteUser(u.id)}
                  className="text-xs bg-red-50 text-red-600 px-2.5 py-1.5 rounded-lg active:scale-95"
                >
                  🗑
                </button>
              </div>
            )}
          </div>
        ))}
        {appUsers.length === 0 && <p className="px-4 py-3 text-sm text-gray-400">Aucun utilisateur</p>}
      </AdminCard>

      {/* ---- VIGNOBLES ---- */}
      <AdminCard title="🏡 Vignobles" onAdd={() => setModal({ type: "vignoble", data: { nom: "", localisation: "", appellation: "", type_sol: "" } })}>
        {vignobles.map(v => (
          <div key={v.id} className="flex items-center justify-between px-4 py-3">
            <div>
              <div className="font-medium text-sm">{v.nom}</div>
              <div className="text-xs text-gray-500">{v.localisation} {v.appellation && `— ${v.appellation}`}</div>
            </div>
            <div className="flex gap-1.5">
              <button onClick={() => setModal({ type: "vignoble", data: { ...v } })} className="text-xs bg-gray-100 px-2.5 py-1.5 rounded-lg active:scale-95">✏️</button>
              <button onClick={() => deleteVignoble(v.id)} className="text-xs bg-red-50 text-red-600 px-2.5 py-1.5 rounded-lg active:scale-95">🗑</button>
            </div>
          </div>
        ))}
        {vignobles.length === 0 && <p className="px-4 py-3 text-sm text-gray-400">Aucun vignoble</p>}
      </AdminCard>

      {/* ---- PARCELLES ---- */}
      <AdminCard title="🌿 Parcelles" onAdd={() => setModal({ type: "parcelle", data: { nom: "", vignoble_id: vignobles[0]?.id || "", cepage: "", nb_rangs: 7 } })}>
        {parcelles.map(p => (
          <div key={p.id} className="flex items-center justify-between px-4 py-3">
            <div>
              <div className="font-medium text-sm">{p.nom}</div>
              <div className="text-xs text-gray-500">
                {vignobles.find(v => v.id === p.vignoble_id)?.nom || "?"} — {p.nb_rangs} rangs {p.cepage && `— ${p.cepage}`}
              </div>
            </div>
            <div className="flex gap-1.5">
              <button onClick={() => setModal({ type: "parcelle", data: { ...p } })} className="text-xs bg-gray-100 px-2.5 py-1.5 rounded-lg active:scale-95">✏️</button>
              <button onClick={() => deleteParcelle(p.id)} className="text-xs bg-red-50 text-red-600 px-2.5 py-1.5 rounded-lg active:scale-95">🗑</button>
            </div>
          </div>
        ))}
        {parcelles.length === 0 && <p className="px-4 py-3 text-sm text-gray-400">Aucune parcelle</p>}
      </AdminCard>

      {/* ---- MODALITÉS ---- */}
      <AdminCard title="🧪 Modalités (protocole)" onAdd={() => setModal({ type: "modalite_new", data: { rang: modalites.length + 1, modalite: "", description: "", surnageant_l: 0, eau_l: 0, volume_l: 0, actif: true } })}>
        {modalites.map(m => (
          <div key={m.rang} className={`flex items-center justify-between px-4 py-3 ${!m.actif ? "opacity-40" : ""}`}>
            <div className="flex items-center gap-3">
              <span className="w-7 h-7 rounded-full bg-[#2d5016]/10 text-[#2d5016] flex items-center justify-center text-xs font-bold">{m.rang}</span>
              <div>
                <div className="font-medium text-sm">{m.modalite}</div>
                <div className="text-xs text-gray-500">{m.description} — {m.volume_l}L</div>
              </div>
            </div>
            <button onClick={() => setModal({ type: "modalite", data: { ...m } })} className="text-xs bg-gray-100 px-2.5 py-1.5 rounded-lg active:scale-95">✏️</button>
          </div>
        ))}
      </AdminCard>

      {/* ---- CONFIG / PARAMÈTRES ---- */}
      <AdminCard title="📊 Paramètres & Seuils" onAdd={() => setModal({ type: "config_new", data: { cle: "", valeur: "", categorie: "general", description: "" } })}>
        {configs.map(c => (
          <div key={c.cle} className="flex items-center justify-between px-4 py-3">
            <div className="flex-1 min-w-0">
              <div className="font-medium text-sm truncate">{c.cle}</div>
              <div className="text-xs text-gray-500 truncate">{c.description || c.categorie}</div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <span className="text-xs bg-[#2d5016]/10 text-[#2d5016] px-2 py-1 rounded-lg font-mono">{c.valeur}</span>
              <button onClick={() => setModal({ type: "config", data: { ...c } })} className="text-xs bg-gray-100 px-2.5 py-1.5 rounded-lg active:scale-95">✏️</button>
            </div>
          </div>
        ))}
      </AdminCard>

      {/* ---- MODALS ---- */}

      {/* Modal Vignoble */}
      <EditModal open={modal?.type === "vignoble"} title={modal?.data?.id ? "Modifier vignoble" : "Nouveau vignoble"} onClose={() => setModal(null)} onSave={saveVignoble} saving={saving}>
        <label className="text-sm font-medium">Nom</label>
        <input value={modal?.data?.nom || ""} onChange={e => updateModal("nom", e.target.value)} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" />
        <label className="text-sm font-medium">Localisation</label>
        <input value={modal?.data?.localisation || ""} onChange={e => updateModal("localisation", e.target.value)} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" />
        <label className="text-sm font-medium">Appellation</label>
        <input value={modal?.data?.appellation || ""} onChange={e => updateModal("appellation", e.target.value)} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" />
        <label className="text-sm font-medium">Type de sol</label>
        <input value={modal?.data?.type_sol || ""} onChange={e => updateModal("type_sol", e.target.value)} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" />
      </EditModal>

      {/* Modal Parcelle */}
      <EditModal open={modal?.type === "parcelle"} title={modal?.data?.id ? "Modifier parcelle" : "Nouvelle parcelle"} onClose={() => setModal(null)} onSave={saveParcelle} saving={saving}>
        <label className="text-sm font-medium">Nom</label>
        <input value={modal?.data?.nom || ""} onChange={e => updateModal("nom", e.target.value)} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" />
        <label className="text-sm font-medium">Vignoble</label>
        <select value={modal?.data?.vignoble_id || ""} onChange={e => updateModal("vignoble_id", e.target.value)} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm">
          <option value="">Sélectionner...</option>
          {vignobles.map(v => <option key={v.id} value={v.id}>{v.nom}</option>)}
        </select>
        <label className="text-sm font-medium">Cépage</label>
        <input value={modal?.data?.cepage || ""} onChange={e => updateModal("cepage", e.target.value)} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" />
        <label className="text-sm font-medium">Nombre de rangs</label>
        <input type="number" value={modal?.data?.nb_rangs || 7} onChange={e => updateModal("nb_rangs", Number(e.target.value))} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" />
      </EditModal>

      {/* Modal Modalité */}
      <EditModal open={modal?.type === "modalite" || modal?.type === "modalite_new"} title={modal?.type === "modalite_new" ? "Nouvelle modalité" : "Modifier modalité"} onClose={() => setModal(null)} onSave={saveModalite} saving={saving}>
        <label className="text-sm font-medium">Rang</label>
        <input type="number" value={modal?.data?.rang || ""} onChange={e => updateModal("rang", Number(e.target.value))} disabled={modal?.type === "modalite"} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm disabled:bg-gray-50" />
        <label className="text-sm font-medium">Nom de la modalité</label>
        <input value={modal?.data?.modalite || ""} onChange={e => updateModal("modalite", e.target.value)} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" />
        <label className="text-sm font-medium">Description</label>
        <input value={modal?.data?.description || ""} onChange={e => updateModal("description", e.target.value)} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" />
        <div className="grid grid-cols-3 gap-2">
          <div>
            <label className="text-xs font-medium">Surnageant (L)</label>
            <input type="number" step="0.5" value={modal?.data?.surnageant_l ?? 0} onChange={e => updateModal("surnageant_l", Number(e.target.value))} className="w-full border border-gray-200 rounded-lg px-2 py-2 text-sm" />
          </div>
          <div>
            <label className="text-xs font-medium">Eau (L)</label>
            <input type="number" step="0.5" value={modal?.data?.eau_l ?? 0} onChange={e => updateModal("eau_l", Number(e.target.value))} className="w-full border border-gray-200 rounded-lg px-2 py-2 text-sm" />
          </div>
          <div>
            <label className="text-xs font-medium">Volume (L)</label>
            <input type="number" step="0.5" value={modal?.data?.volume_l ?? 0} onChange={e => updateModal("volume_l", Number(e.target.value))} className="w-full border border-gray-200 rounded-lg px-2 py-2 text-sm" />
          </div>
        </div>
        {modal?.type === "modalite" && (
          <div className="flex items-center gap-2 pt-2">
            <input type="checkbox" id="actif" checked={modal?.data?.actif ?? true} onChange={e => updateModal("actif", e.target.checked)} className="rounded" />
            <label htmlFor="actif" className="text-sm">Modalité active</label>
          </div>
        )}
      </EditModal>

      {/* Modal Config */}
      <EditModal open={modal?.type === "config" || modal?.type === "config_new"} title={modal?.type === "config_new" ? "Nouveau paramètre" : "Modifier paramètre"} onClose={() => setModal(null)} onSave={saveConfig} saving={saving}>
        <label className="text-sm font-medium">Clé</label>
        <input value={modal?.data?.cle || ""} onChange={e => updateModal("cle", e.target.value)} disabled={modal?.type === "config"} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm disabled:bg-gray-50 font-mono" />
        <label className="text-sm font-medium">Valeur</label>
        <input value={modal?.data?.valeur || ""} onChange={e => updateModal("valeur", e.target.value)} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm font-mono" />
        <label className="text-sm font-medium">Catégorie</label>
        <select value={modal?.data?.categorie || "general"} onChange={e => updateModal("categorie", e.target.value)} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm">
          <option value="general">Général</option>
          <option value="ui">Interface (textes)</option>
          <option value="protocole">Protocole</option>
          <option value="scoring">Scoring / Seuils</option>
        </select>
        <label className="text-sm font-medium">Description</label>
        <input value={modal?.data?.description || ""} onChange={e => updateModal("description", e.target.value)} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" />
      </EditModal>
    </div>
  );
}
