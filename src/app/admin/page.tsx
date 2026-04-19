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
interface TypeCultureItem { id: string; code: string; nom: string; description: string | null; actif: boolean; }
interface EspeceItem { id: string; type_culture_id: string; code: string; nom: string; actif: boolean; }
interface SiteItem { id: string; nom: string; type_site: string | null; localisation: string | null; actif: boolean; }
interface ZoneCultureItem { id: string; site_id: string; type_culture_id: string; espece_id: string | null; nom: string; surface_ha: number | null; latitude: number | null; longitude: number | null; actif: boolean; }
interface ProtocoleItem { id: string; code: string; label: string; type: string; description: string | null; actif: boolean; ordre: number; }
interface ModaliteLevainItem { id: string; code: string; label: string; dilution: string | null; description: string | null; actif: boolean; ordre: number; }
interface ProduitItem { id: string; code: string; label: string; type: string; origine: string | null; description: string | null; actif: boolean; ordre: number; }
interface PlacetteItem { id: string; parcelle_id: string; modalite_id: string | null; nom: string; nb_ceps: number; description_position: string | null; pieds_marques: string | null; actif: boolean; }

// ---- Reset Section Component ----
function ResetSection({ showToast }: { showToast: (msg: string, type?: "success" | "error") => void }) {
  const currentYear = new Date().getFullYear().toString();
  const [resetMode, setResetMode] = useState<"campagne" | "periode">("campagne");
  const [campagne, setCampagne] = useState(currentYear);
  const [dateDebut, setDateDebut] = useState("");
  const [dateFin, setDateFin] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [confirmStep, setConfirmStep] = useState(0); // 0=idle, 1=first confirm, 2=final confirm

  async function handleReset() {
    if (confirmStep < 2) {
      setConfirmStep(confirmStep + 1);
      return;
    }

    setDeleting(true);
    try {
      let dateFilter: { gte: string; lte: string };

      if (resetMode === "campagne") {
        dateFilter = { gte: `${campagne}-01-01`, lte: `${campagne}-12-31` };
      } else {
        if (!dateDebut || !dateFin) {
          showToast("Précise les deux dates", "error");
          setDeleting(false);
          setConfirmStep(0);
          return;
        }
        dateFilter = { gte: dateDebut, lte: dateFin };
      }

      // 1. Supprimer maladies_observations liées aux observations de la période
      const { data: obsIds } = await supabase
        .from("observations")
        .select("id")
        .gte("date", dateFilter.gte)
        .lte("date", dateFilter.lte);

      if (obsIds && obsIds.length > 0) {
        const ids = obsIds.map((o: { id: string }) => o.id);
        await supabase.from("maladies_observations").delete().in("observation_id", ids);
        await supabase.from("photos").delete().in("observation_id", ids);
      }

      // 2. Supprimer traitement_rangs liés aux traitements de la période
      const { data: traitIds } = await supabase
        .from("traitements")
        .select("id")
        .gte("date", dateFilter.gte)
        .lte("date", dateFilter.lte);

      if (traitIds && traitIds.length > 0) {
        const ids = traitIds.map((t: { id: string }) => t.id);
        await supabase.from("traitement_rangs").delete().in("traitement_id", ids);
      }

      // 3. Supprimer observations
      const { error: obsErr } = await supabase
        .from("observations")
        .delete()
        .gte("date", dateFilter.gte)
        .lte("date", dateFilter.lte);

      // 4. Supprimer traitements
      const { error: traitErr } = await supabase
        .from("traitements")
        .delete()
        .gte("date", dateFilter.gte)
        .lte("date", dateFilter.lte);

      // 5. Supprimer analyses_sol
      const { error: anaErr } = await supabase
        .from("analyses_sol")
        .delete()
        .gte("date_prelevement", dateFilter.gte)
        .lte("date_prelevement", dateFilter.lte);

      if (obsErr || traitErr || anaErr) {
        showToast("Erreur lors de la suppression : " + (obsErr?.message || traitErr?.message || anaErr?.message), "error");
      } else {
        const label = resetMode === "campagne"
          ? `campagne ${campagne}`
          : `du ${new Date(dateDebut).toLocaleDateString("fr-FR")} au ${new Date(dateFin).toLocaleDateString("fr-FR")}`;
        showToast(`Données supprimées pour ${label} ✓`);
      }
    } catch (err) {
      showToast("Erreur inattendue", "error");
    }
    setDeleting(false);
    setConfirmStep(0);
  }

  const confirmLabel = resetMode === "campagne"
    ? `la campagne ${campagne}`
    : dateDebut && dateFin
      ? `du ${new Date(dateDebut).toLocaleDateString("fr-FR")} au ${new Date(dateFin).toLocaleDateString("fr-FR")}`
      : "la période sélectionnée";

  return (
    <div className="glass rounded-2xl p-4 border-2 border-red-200/50 space-y-4">
      <p className="text-xs text-gray-500">
        Supprime toutes les observations, traitements et analyses pour une campagne complète ou une période précise.
        Les données de structure (sites, parcelles, protocoles, modalités) ne sont pas affectées.
      </p>

      {/* Mode */}
      <div className="flex gap-2">
        <button type="button" onClick={() => { setResetMode("campagne"); setConfirmStep(0); }}
          className={`flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all ${resetMode === "campagne" ? "bg-red-600 text-white" : "bg-gray-100 text-gray-600"}`}>
          Par campagne
        </button>
        <button type="button" onClick={() => { setResetMode("periode"); setConfirmStep(0); }}
          className={`flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all ${resetMode === "periode" ? "bg-red-600 text-white" : "bg-gray-100 text-gray-600"}`}>
          Par période
        </button>
      </div>

      {resetMode === "campagne" ? (
        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-gray-700">Campagne (année)</label>
          <select value={campagne} onChange={(e) => { setCampagne(e.target.value); setConfirmStep(0); }}
            className="border border-gray-200 rounded-xl px-3 py-2.5 text-sm">
            {["2024", "2025", "2026", "2027"].map(y => <option key={y} value={y}>{y}</option>)}
          </select>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3">
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-gray-700">Du</label>
            <input type="date" value={dateDebut} onChange={(e) => { setDateDebut(e.target.value); setConfirmStep(0); }}
              className="border border-gray-200 rounded-xl px-3 py-2.5 text-sm" />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-gray-700">Au</label>
            <input type="date" value={dateFin} onChange={(e) => { setDateFin(e.target.value); setConfirmStep(0); }}
              className="border border-gray-200 rounded-xl px-3 py-2.5 text-sm" />
          </div>
        </div>
      )}

      {/* Confirmation progressive */}
      {confirmStep === 0 && (
        <button type="button" onClick={handleReset} disabled={deleting}
          className="w-full bg-red-100 text-red-700 rounded-xl py-3 font-semibold text-sm hover:bg-red-200 transition-colors">
          🗑️ Effacer les données
        </button>
      )}
      {confirmStep === 1 && (
        <div className="bg-red-50 border border-red-300 rounded-xl p-3 space-y-2">
          <p className="text-sm text-red-700 font-medium">
            ⚠️ Êtes-vous sûr de vouloir effacer les données pour {confirmLabel} ?
          </p>
          <p className="text-xs text-red-600">
            Cela supprimera toutes les observations, traitements, analyses, maladies et photos associées. Cette action est irréversible.
          </p>
          <div className="flex gap-2">
            <button type="button" onClick={() => setConfirmStep(0)}
              className="flex-1 bg-gray-100 text-gray-700 rounded-xl py-2.5 text-sm font-medium">
              Annuler
            </button>
            <button type="button" onClick={handleReset}
              className="flex-1 bg-red-600 text-white rounded-xl py-2.5 text-sm font-bold">
              Oui, confirmer la suppression
            </button>
          </div>
        </div>
      )}
      {confirmStep === 2 && (
        <div className="bg-red-100 border-2 border-red-500 rounded-xl p-3 space-y-2">
          <p className="text-sm text-red-800 font-bold">
            🚨 DERNIÈRE CONFIRMATION — Action irréversible
          </p>
          <p className="text-xs text-red-700">
            Toutes les données pour {confirmLabel} seront définitivement supprimées.
          </p>
          <div className="flex gap-2">
            <button type="button" onClick={() => setConfirmStep(0)}
              className="flex-1 bg-gray-100 text-gray-700 rounded-xl py-2.5 text-sm font-medium">
              Annuler
            </button>
            <button type="button" onClick={handleReset} disabled={deleting}
              className="flex-1 bg-red-700 text-white rounded-xl py-2.5 text-sm font-bold disabled:opacity-50">
              {deleting ? "Suppression en cours…" : "🗑️ SUPPRIMER DÉFINITIVEMENT"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default function AdminPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [vignobles, setVignobles] = useState<Vignoble[]>([]);
  const [parcelles, setParcelles] = useState<Parcelle[]>([]);
  const [modalites, setModalites] = useState<ModaliteRef[]>([]);
  const [configs, setConfigs] = useState<ConfigItem[]>([]);
  const [appUsers, setAppUsers] = useState<AppUserItem[]>([]);
  const [typesCulture, setTypesCulture] = useState<TypeCultureItem[]>([]);
  const [especes, setEspeces] = useState<EspeceItem[]>([]);
  const [sites, setSites] = useState<SiteItem[]>([]);
  const [zonesCulture, setZonesCulture] = useState<ZoneCultureItem[]>([]);
  const [protocolesList, setProtocolesList] = useState<ProtocoleItem[]>([]);
  const [modalitesLevain, setModalitesLevain] = useState<ModaliteLevainItem[]>([]);
  const [produitsList, setProduitsList] = useState<ProduitItem[]>([]);
  const [placettesList, setPlacettesList] = useState<PlacetteItem[]>([]);
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

      // Load multi-culture data
      const [tc, esp, sit, zc] = await Promise.all([
        supabase.from("types_culture").select("*").order("nom"),
        supabase.from("especes").select("*").order("nom"),
        supabase.from("sites").select("*").order("nom"),
        supabase.from("zones_culture").select("*").order("nom"),
      ]);
      if (tc.data) setTypesCulture(tc.data);
      if (esp.data) setEspeces(esp.data);
      if (sit.data) setSites(sit.data);
      if (zc.data) setZonesCulture(zc.data);

      // Load protocoles, modalités levain, produits
      const [proto, modLev, prod] = await Promise.all([
        supabase.from("protocoles").select("*").order("ordre"),
        supabase.from("modalites_levain").select("*").order("ordre"),
        supabase.from("produits").select("*").order("ordre"),
      ]);
      if (proto.data) setProtocolesList(proto.data);
      if (modLev.data) setModalitesLevain(modLev.data);
      if (prod.data) setProduitsList(prod.data);

      // Load placettes
      const { data: plData } = await supabase.from("placettes").select("*").order("nom");
      if (plData) setPlacettesList(plData);

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

  // ---- CRUD Sites ----
  async function saveSite() {
    setSaving(true);
    const d = modal?.data;
    if (d.id) {
      await supabase.from("sites").update({ nom: d.nom, type_site: d.type_site || null, localisation: d.localisation || null }).eq("id", d.id);
      showToast("Site modifié");
    } else {
      const { error } = await supabase.from("sites").insert({ nom: d.nom, type_site: d.type_site || null, localisation: d.localisation || null, actif: true });
      if (error) showToast(error.message, "error"); else showToast("Site ajouté");
    }
    setSaving(false); setModal(null);
    const { data } = await supabase.from("sites").select("*").order("nom");
    if (data) setSites(data);
  }

  async function deleteSite(id: string) {
    if (!confirm("Supprimer ce site et toutes ses zones ?")) return;
    await supabase.from("sites").delete().eq("id", id);
    setSites(s => s.filter(x => x.id !== id));
    showToast("Site supprimé");
  }

  // ---- CRUD Zones de culture ----
  async function saveZoneCulture() {
    setSaving(true);
    const d = modal?.data;
    if (d.id) {
      await supabase.from("zones_culture").update({
        nom: d.nom, site_id: d.site_id, type_culture_id: d.type_culture_id,
        espece_id: d.espece_id || null, surface_ha: d.surface_ha || null,
        latitude: d.latitude || null, longitude: d.longitude || null,
      }).eq("id", d.id);
      showToast("Zone modifiée");
    } else {
      const { error } = await supabase.from("zones_culture").insert({
        nom: d.nom, site_id: d.site_id, type_culture_id: d.type_culture_id,
        espece_id: d.espece_id || null, surface_ha: d.surface_ha || null,
        latitude: d.latitude || null, longitude: d.longitude || null, actif: true,
      });
      if (error) showToast(error.message, "error"); else showToast("Zone ajoutée");
    }
    setSaving(false); setModal(null);
    const { data } = await supabase.from("zones_culture").select("*").order("nom");
    if (data) setZonesCulture(data);
  }

  async function deleteZoneCulture(id: string) {
    if (!confirm("Supprimer cette zone de culture ?")) return;
    await supabase.from("zones_culture").delete().eq("id", id);
    setZonesCulture(z => z.filter(x => x.id !== id));
    showToast("Zone supprimée");
  }

  // ---- CRUD Espèces ----
  async function saveEspece() {
    setSaving(true);
    const d = modal?.data;
    if (d.id) {
      await supabase.from("especes").update({ nom: d.nom, code: d.code, type_culture_id: d.type_culture_id }).eq("id", d.id);
      showToast("Espèce modifiée");
    } else {
      const { error } = await supabase.from("especes").insert({ nom: d.nom, code: d.code, type_culture_id: d.type_culture_id, actif: true });
      if (error) showToast(error.message, "error"); else showToast("Espèce ajoutée");
    }
    setSaving(false); setModal(null);
    const { data } = await supabase.from("especes").select("*").order("nom");
    if (data) setEspeces(data);
  }

  // ---- CRUD Protocoles ----
  async function saveProtocole() {
    setSaving(true);
    const d = modal?.data;
    if (d.id) {
      await supabase.from("protocoles").update({ code: d.code, label: d.label, type: d.type, description: d.description || null, actif: d.actif ?? true, ordre: d.ordre }).eq("id", d.id);
      showToast("Protocole modifié");
    } else {
      const { error } = await supabase.from("protocoles").insert({ code: d.code, label: d.label, type: d.type || 'simple', description: d.description || null, actif: true, ordre: d.ordre || 1 });
      if (error) showToast(error.message, "error"); else showToast("Protocole ajouté");
    }
    setSaving(false); setModal(null);
    const { data } = await supabase.from("protocoles").select("*").order("ordre");
    if (data) setProtocolesList(data);
  }

  async function deleteProtocole(id: string) {
    if (!confirm("Supprimer ce protocole ?")) return;
    await supabase.from("protocoles").delete().eq("id", id);
    setProtocolesList(p => p.filter(x => x.id !== id));
    showToast("Protocole supprimé");
  }

  // ---- CRUD Modalités levain ----
  async function saveModaliteLevain() {
    setSaving(true);
    const d = modal?.data;
    if (d.id) {
      await supabase.from("modalites_levain").update({ code: d.code, label: d.label, dilution: d.dilution || null, description: d.description || null, actif: d.actif ?? true, ordre: d.ordre }).eq("id", d.id);
      showToast("Modalité levain modifiée");
    } else {
      const { error } = await supabase.from("modalites_levain").insert({ code: d.code, label: d.label, dilution: d.dilution || null, description: d.description || null, actif: true, ordre: d.ordre || 1 });
      if (error) showToast(error.message, "error"); else showToast("Modalité levain ajoutée");
    }
    setSaving(false); setModal(null);
    const { data } = await supabase.from("modalites_levain").select("*").order("ordre");
    if (data) setModalitesLevain(data);
  }

  async function deleteModaliteLevain(id: string) {
    if (!confirm("Supprimer cette modalité levain ?")) return;
    await supabase.from("modalites_levain").delete().eq("id", id);
    setModalitesLevain(m => m.filter(x => x.id !== id));
    showToast("Modalité levain supprimée");
  }

  // ---- CRUD Produits ----
  async function saveProduit() {
    setSaving(true);
    const d = modal?.data;
    if (d.id) {
      await supabase.from("produits").update({ code: d.code, label: d.label, type: d.type, origine: d.origine || null, description: d.description || null, actif: d.actif ?? true, ordre: d.ordre }).eq("id", d.id);
      showToast("Produit modifié");
    } else {
      const { error } = await supabase.from("produits").insert({ code: d.code, label: d.label, type: d.type || 'levain', origine: d.origine || null, description: d.description || null, actif: true, ordre: d.ordre || 1 });
      if (error) showToast(error.message, "error"); else showToast("Produit ajouté");
    }
    setSaving(false); setModal(null);
    const { data } = await supabase.from("produits").select("*").order("ordre");
    if (data) setProduitsList(data);
  }

  async function deleteProduit(id: string) {
    if (!confirm("Supprimer ce produit ?")) return;
    await supabase.from("produits").delete().eq("id", id);
    setProduitsList(p => p.filter(x => x.id !== id));
    showToast("Produit supprimé");
  }

  // ---- CRUD Placettes ----
  async function savePlacette() {
    setSaving(true);
    const d = modal?.data;
    if (d.id) {
      await supabase.from("placettes").update({ nom: d.nom, parcelle_id: d.parcelle_id, modalite_id: d.modalite_id || null, nb_ceps: d.nb_ceps || 7, description_position: d.description_position || null, pieds_marques: d.pieds_marques || null, actif: d.actif ?? true }).eq("id", d.id);
      showToast("Placette modifiée");
    } else {
      const { error } = await supabase.from("placettes").insert({ nom: d.nom, parcelle_id: d.parcelle_id, modalite_id: d.modalite_id || null, nb_ceps: d.nb_ceps || 7, description_position: d.description_position || null, pieds_marques: d.pieds_marques || null, actif: true });
      if (error) showToast(error.message, "error"); else showToast("Placette ajoutée");
    }
    setSaving(false); setModal(null);
    const { data } = await supabase.from("placettes").select("*").order("nom");
    if (data) setPlacettesList(data);
  }

  async function deletePlacette(id: string) {
    if (!confirm("Supprimer cette placette ?")) return;
    await supabase.from("placettes").delete().eq("id", id);
    setPlacettesList(p => p.filter(x => x.id !== id));
    showToast("Placette supprimée");
  }

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

      {/* ---- VIGNOBLES (legacy → Sites) ---- */}
      <AdminCard title="🏡 Sites (Vignobles)" onAdd={() => setModal({ type: "vignoble", data: { nom: "", localisation: "", appellation: "", type_sol: "" } })}>
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

      {/* ---- PLACETTES ---- */}
      <AdminCard title="📌 Placettes (unités d'observation)" onAdd={() => setModal({ type: "placette_new", data: { nom: "", parcelle_id: parcelles[0]?.id || "", modalite_id: "", nb_ceps: 7, description_position: "", pieds_marques: "" } })}>
        {placettesList.map(pl => (
          <div key={pl.id} className="flex items-center justify-between px-4 py-3">
            <div>
              <div className="font-medium text-sm">{pl.nom}</div>
              <div className="text-xs text-gray-500">
                {parcelles.find(p => p.id === pl.parcelle_id)?.nom || "?"} · {pl.nb_ceps} ceps
                {pl.modalite_id && ` · ${pl.modalite_id}`}
                {pl.description_position && ` · ${pl.description_position}`}
              </div>
              {pl.pieds_marques && <div className="text-[10px] text-gray-400">🏷️ {pl.pieds_marques}</div>}
            </div>
            <div className="flex gap-1.5">
              <button onClick={() => setModal({ type: "placette", data: { ...pl } })} className="text-xs bg-gray-100 px-2.5 py-1.5 rounded-lg active:scale-95">✏️</button>
              <button onClick={() => deletePlacette(pl.id)} className="text-xs bg-red-50 text-red-600 px-2.5 py-1.5 rounded-lg active:scale-95">🗑</button>
            </div>
          </div>
        ))}
        {placettesList.length === 0 && <p className="px-4 py-3 text-sm text-gray-400">Aucune placette — créez-en pour vos observations</p>}
      </AdminCard>

      {/* ---- MODALITÉS ---- */}
      <h2 className="text-lg font-bold gradient-text mt-6">🌍 Multi-cultures</h2>

      {/* ---- SITES ---- */}
      <AdminCard title="🏠 Sites / Exploitations" onAdd={() => setModal({ type: "site", data: { nom: "", type_site: "", localisation: "" } })}>
        {sites.map(s => (
          <div key={s.id} className="flex items-center justify-between px-4 py-3">
            <div>
              <div className="font-medium text-sm">{s.nom}</div>
              <div className="text-xs text-gray-500">{s.type_site || "—"} · {s.localisation || "—"}</div>
            </div>
            <div className="flex gap-1.5">
              <button onClick={() => setModal({ type: "site", data: { ...s } })} className="text-xs bg-gray-100 px-2.5 py-1.5 rounded-lg active:scale-95">✏️</button>
              <button onClick={() => deleteSite(s.id)} className="text-xs bg-red-50 text-red-600 px-2.5 py-1.5 rounded-lg active:scale-95">🗑</button>
            </div>
          </div>
        ))}
        {sites.length === 0 && <p className="px-4 py-3 text-sm text-gray-400">Aucun site</p>}
      </AdminCard>

      {/* ---- ZONES DE CULTURE ---- */}
      <AdminCard title="🌱 Zones de culture" onAdd={() => setModal({ type: "zone_culture", data: { nom: "", site_id: sites[0]?.id || "", type_culture_id: typesCulture[0]?.id || "", espece_id: "", surface_ha: null, latitude: null, longitude: null } })}>
        {zonesCulture.map(z => (
          <div key={z.id} className="flex items-center justify-between px-4 py-3">
            <div>
              <div className="font-medium text-sm">{z.nom}</div>
              <div className="text-xs text-gray-500">
                {sites.find(s => s.id === z.site_id)?.nom || "?"} · {typesCulture.find(t => t.id === z.type_culture_id)?.nom || "?"} · {especes.find(e => e.id === z.espece_id)?.nom || "—"}
                {z.surface_ha && ` · ${z.surface_ha} ha`}
              </div>
            </div>
            <div className="flex gap-1.5">
              <button onClick={() => setModal({ type: "zone_culture", data: { ...z } })} className="text-xs bg-gray-100 px-2.5 py-1.5 rounded-lg active:scale-95">✏️</button>
              <button onClick={() => deleteZoneCulture(z.id)} className="text-xs bg-red-50 text-red-600 px-2.5 py-1.5 rounded-lg active:scale-95">🗑</button>
            </div>
          </div>
        ))}
        {zonesCulture.length === 0 && <p className="px-4 py-3 text-sm text-gray-400">Aucune zone de culture</p>}
      </AdminCard>

      {/* ---- TYPES DE CULTURE ---- */}
      <AdminCard title="🏷️ Types de culture">
        {typesCulture.map(tc => (
          <div key={tc.id} className="flex items-center justify-between px-4 py-3">
            <div>
              <div className="font-medium text-sm">{tc.nom}</div>
              <div className="text-xs text-gray-500">{tc.code} · {tc.description || "—"}</div>
            </div>
            <span className={`text-xs px-2 py-0.5 rounded-full ${tc.actif ? 'bg-emerald-50 text-emerald-700' : 'bg-gray-100 text-gray-500'}`}>
              {tc.actif ? 'Actif' : 'Inactif'}
            </span>
          </div>
        ))}
        {typesCulture.length === 0 && <p className="px-4 py-3 text-sm text-gray-400">Aucun type (exécuter migration 008)</p>}
      </AdminCard>

      {/* ---- ESPÈCES ---- */}
      <AdminCard title="🌿 Espèces" onAdd={() => setModal({ type: "espece", data: { nom: "", code: "", type_culture_id: typesCulture[0]?.id || "" } })}>
        {especes.map(e => (
          <div key={e.id} className="flex items-center justify-between px-4 py-3">
            <div>
              <div className="font-medium text-sm">{e.nom}</div>
              <div className="text-xs text-gray-500">{e.code} · {typesCulture.find(t => t.id === e.type_culture_id)?.nom || "?"}</div>
            </div>
            <button onClick={() => setModal({ type: "espece", data: { ...e } })} className="text-xs bg-gray-100 px-2.5 py-1.5 rounded-lg active:scale-95">✏️</button>
          </div>
        ))}
        {especes.length === 0 && <p className="px-4 py-3 text-sm text-gray-400">Aucune espèce (exécuter migration 008)</p>}
      </AdminCard>

      <h2 className="text-lg font-bold gradient-text mt-6">🧪 Protocole & Produits</h2>

      {/* ---- PROTOCOLES ---- */}
      <AdminCard title="📋 Protocoles" onAdd={() => setModal({ type: "protocole_new", data: { code: "", label: "", type: "simple", description: "", ordre: protocolesList.length + 1 } })}>
        {protocolesList.map(p => (
          <div key={p.id} className={`flex items-center justify-between px-4 py-3 ${!p.actif ? "opacity-40" : ""}`}>
            <div className="flex items-center gap-3">
              <span className="w-12 text-xs font-mono font-bold text-emerald-700 bg-emerald-50 px-2 py-1 rounded-lg text-center">{p.code}</span>
              <div>
                <div className="font-medium text-sm">{p.label}</div>
                <div className="text-xs text-gray-500">{p.type} — {p.description || "—"}</div>
              </div>
            </div>
            <div className="flex gap-1.5">
              <button onClick={() => setModal({ type: "protocole", data: { ...p } })} className="text-xs bg-gray-100 px-2.5 py-1.5 rounded-lg active:scale-95">✏️</button>
              <button onClick={() => deleteProtocole(p.id)} className="text-xs bg-red-50 text-red-600 px-2.5 py-1.5 rounded-lg active:scale-95">🗑</button>
            </div>
          </div>
        ))}
        {protocolesList.length === 0 && <p className="px-4 py-3 text-sm text-gray-400">Aucun protocole</p>}
      </AdminCard>

      {/* ---- MODALITÉS LEVAIN ---- */}
      <AdminCard title="🧪 Modalités levain (M0/M1/M2)" onAdd={() => setModal({ type: "modalite_levain_new", data: { code: "", label: "", dilution: "", description: "", ordre: modalitesLevain.length + 1 } })}>
        {modalitesLevain.map(m => (
          <div key={m.id} className={`flex items-center justify-between px-4 py-3 ${!m.actif ? "opacity-40" : ""}`}>
            <div className="flex items-center gap-3">
              <span className="w-10 text-xs font-mono font-bold text-amber-700 bg-amber-50 px-2 py-1 rounded-lg text-center">{m.code}</span>
              <div>
                <div className="font-medium text-sm">{m.label}</div>
                <div className="text-xs text-gray-500">Dilution : {m.dilution || "—"} — {m.description || ""}</div>
              </div>
            </div>
            <div className="flex gap-1.5">
              <button onClick={() => setModal({ type: "modalite_levain", data: { ...m } })} className="text-xs bg-gray-100 px-2.5 py-1.5 rounded-lg active:scale-95">✏️</button>
              <button onClick={() => deleteModaliteLevain(m.id)} className="text-xs bg-red-50 text-red-600 px-2.5 py-1.5 rounded-lg active:scale-95">🗑</button>
            </div>
          </div>
        ))}
        {modalitesLevain.length === 0 && <p className="px-4 py-3 text-sm text-gray-400">Aucune modalité</p>}
      </AdminCard>

      {/* ---- PRODUITS ---- */}
      <AdminCard title="🌿 Produits MyLevain" onAdd={() => setModal({ type: "produit_new", data: { code: "", label: "", type: "levain", origine: "", description: "", ordre: produitsList.length + 1 } })}>
        {produitsList.map(p => (
          <div key={p.id} className="flex items-center justify-between px-4 py-3">
            <div className="flex items-center gap-3">
              <span className="w-10 text-xs font-mono font-bold text-blue-700 bg-blue-50 px-2 py-1 rounded-lg text-center">{p.code}</span>
              <div>
                <div className="font-medium text-sm">{p.label}</div>
                <div className="text-xs text-gray-500">{p.type} — {p.origine || "—"}</div>
              </div>
            </div>
            <div className="flex gap-1.5">
              <button onClick={() => setModal({ type: "produit", data: { ...p } })} className="text-xs bg-gray-100 px-2.5 py-1.5 rounded-lg active:scale-95">✏️</button>
              <button onClick={() => deleteProduit(p.id)} className="text-xs bg-red-50 text-red-600 px-2.5 py-1.5 rounded-lg active:scale-95">🗑</button>
            </div>
          </div>
        ))}
        {produitsList.length === 0 && <p className="px-4 py-3 text-sm text-gray-400">Aucun produit</p>}
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

      {/* ---- RESET DONNÉES ---- */}
      <h2 className="text-lg font-bold text-red-600 mt-6">🗑️ Reset données</h2>
      <ResetSection showToast={showToast} />

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

      {/* Modal Site */}
      <EditModal open={modal?.type === "site"} title={modal?.data?.id ? "Modifier site" : "Nouveau site"} onClose={() => setModal(null)} onSave={saveSite} saving={saving}>
        <label className="text-sm font-medium">Nom *</label>
        <input value={modal?.data?.nom || ""} onChange={e => updateModal("nom", e.target.value)} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" placeholder="ex: Ferme des Tomates" />
        <label className="text-sm font-medium">Type de site</label>
        <select value={modal?.data?.type_site || ""} onChange={e => updateModal("type_site", e.target.value)} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm">
          <option value="">Sélectionner...</option>
          <option value="chateau">Château</option>
          <option value="domaine">Domaine</option>
          <option value="exploitation">Exploitation</option>
          <option value="ferme">Ferme</option>
          <option value="serre">Serre</option>
          <option value="autre">Autre</option>
        </select>
        <label className="text-sm font-medium">Localisation</label>
        <input value={modal?.data?.localisation || ""} onChange={e => updateModal("localisation", e.target.value)} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" placeholder="ex: Lot-et-Garonne" />
      </EditModal>

      {/* Modal Zone de culture */}
      <EditModal open={modal?.type === "zone_culture"} title={modal?.data?.id ? "Modifier zone" : "Nouvelle zone de culture"} onClose={() => setModal(null)} onSave={saveZoneCulture} saving={saving}>
        <label className="text-sm font-medium">Nom *</label>
        <input value={modal?.data?.nom || ""} onChange={e => updateModal("nom", e.target.value)} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" placeholder="ex: Serre Tomates Roma" />
        <label className="text-sm font-medium">Site *</label>
        <select value={modal?.data?.site_id || ""} onChange={e => updateModal("site_id", e.target.value)} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm">
          <option value="">Sélectionner...</option>
          {sites.map(s => <option key={s.id} value={s.id}>{s.nom}</option>)}
        </select>
        <label className="text-sm font-medium">Type de culture *</label>
        <select value={modal?.data?.type_culture_id || ""} onChange={e => updateModal("type_culture_id", e.target.value)} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm">
          <option value="">Sélectionner...</option>
          {typesCulture.map(tc => <option key={tc.id} value={tc.id}>{tc.nom}</option>)}
        </select>
        <label className="text-sm font-medium">Espèce</label>
        <select value={modal?.data?.espece_id || ""} onChange={e => updateModal("espece_id", e.target.value)} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm">
          <option value="">Sélectionner...</option>
          {especes.filter(e => !modal?.data?.type_culture_id || e.type_culture_id === modal?.data?.type_culture_id).map(e => <option key={e.id} value={e.id}>{e.nom}</option>)}
        </select>
        <label className="text-sm font-medium">Surface (ha)</label>
        <input type="number" step="0.01" value={modal?.data?.surface_ha ?? ""} onChange={e => updateModal("surface_ha", e.target.value ? Number(e.target.value) : null)} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" />
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="text-xs font-medium">Latitude</label>
            <input type="number" step="0.0000001" value={modal?.data?.latitude ?? ""} onChange={e => updateModal("latitude", e.target.value ? Number(e.target.value) : null)} className="w-full border border-gray-200 rounded-lg px-2 py-2 text-sm" placeholder="44.8378" />
          </div>
          <div>
            <label className="text-xs font-medium">Longitude</label>
            <input type="number" step="0.0000001" value={modal?.data?.longitude ?? ""} onChange={e => updateModal("longitude", e.target.value ? Number(e.target.value) : null)} className="w-full border border-gray-200 rounded-lg px-2 py-2 text-sm" placeholder="-0.5792" />
          </div>
        </div>
      </EditModal>

      {/* Modal Espèce */}
      <EditModal open={modal?.type === "espece"} title={modal?.data?.id ? "Modifier espèce" : "Nouvelle espèce"} onClose={() => setModal(null)} onSave={saveEspece} saving={saving}>
        <label className="text-sm font-medium">Nom *</label>
        <input value={modal?.data?.nom || ""} onChange={e => updateModal("nom", e.target.value)} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" placeholder="ex: Tomate cerise" />
        <label className="text-sm font-medium">Code *</label>
        <input value={modal?.data?.code || ""} onChange={e => updateModal("code", e.target.value)} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm font-mono" placeholder="ex: tomate_cerise" />
        <label className="text-sm font-medium">Type de culture *</label>
        <select value={modal?.data?.type_culture_id || ""} onChange={e => updateModal("type_culture_id", e.target.value)} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm">
          <option value="">Sélectionner...</option>
          {typesCulture.map(tc => <option key={tc.id} value={tc.id}>{tc.nom}</option>)}
        </select>
      </EditModal>

      {/* Modal Protocole */}
      <EditModal open={modal?.type === "protocole" || modal?.type === "protocole_new"} title={modal?.data?.id ? "Modifier protocole" : "Nouveau protocole"} onClose={() => setModal(null)} onSave={saveProtocole} saving={saving}>
        <label className="text-sm font-medium">Code *</label>
        <input value={modal?.data?.code || ""} onChange={e => updateModal("code", e.target.value)} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm font-mono" placeholder="ex: P1S" />
        <label className="text-sm font-medium">Label *</label>
        <input value={modal?.data?.label || ""} onChange={e => updateModal("label", e.target.value)} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" placeholder="ex: Séquentiel levain" />
        <label className="text-sm font-medium">Type</label>
        <select value={modal?.data?.type || "simple"} onChange={e => updateModal("type", e.target.value)} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm">
          <option value="simple">Simple</option>
          <option value="sequentiel">Séquentiel</option>
          <option value="meme_temps">Même temps</option>
        </select>
        <label className="text-sm font-medium">Description</label>
        <input value={modal?.data?.description || ""} onChange={e => updateModal("description", e.target.value)} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" />
        <label className="text-sm font-medium">Ordre</label>
        <input type="number" value={modal?.data?.ordre || 1} onChange={e => updateModal("ordre", Number(e.target.value))} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" />
      </EditModal>

      {/* Modal Modalité levain */}
      <EditModal open={modal?.type === "modalite_levain" || modal?.type === "modalite_levain_new"} title={modal?.data?.id ? "Modifier modalité levain" : "Nouvelle modalité levain"} onClose={() => setModal(null)} onSave={saveModaliteLevain} saving={saving}>
        <label className="text-sm font-medium">Code *</label>
        <input value={modal?.data?.code || ""} onChange={e => updateModal("code", e.target.value)} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm font-mono" placeholder="ex: M0, M1, M2" />
        <label className="text-sm font-medium">Label *</label>
        <input value={modal?.data?.label || ""} onChange={e => updateModal("label", e.target.value)} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" placeholder="ex: Témoin, Levain 1/4" />
        <label className="text-sm font-medium">Dilution</label>
        <input value={modal?.data?.dilution || ""} onChange={e => updateModal("dilution", e.target.value)} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" placeholder="ex: 1/4, 1/2" />
        <label className="text-sm font-medium">Description</label>
        <input value={modal?.data?.description || ""} onChange={e => updateModal("description", e.target.value)} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" />
        <label className="text-sm font-medium">Ordre</label>
        <input type="number" value={modal?.data?.ordre || 1} onChange={e => updateModal("ordre", Number(e.target.value))} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" />
      </EditModal>

      {/* Modal Produit */}
      <EditModal open={modal?.type === "produit" || modal?.type === "produit_new"} title={modal?.data?.id ? "Modifier produit" : "Nouveau produit"} onClose={() => setModal(null)} onSave={saveProduit} saving={saving}>
        <label className="text-sm font-medium">Code *</label>
        <input value={modal?.data?.code || ""} onChange={e => updateModal("code", e.target.value)} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm font-mono" placeholder="ex: LEV01" />
        <label className="text-sm font-medium">Label *</label>
        <input value={modal?.data?.label || ""} onChange={e => updateModal("label", e.target.value)} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" placeholder="ex: Surnageant de levain" />
        <label className="text-sm font-medium">Type</label>
        <select value={modal?.data?.type || "levain"} onChange={e => updateModal("type", e.target.value)} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm">
          <option value="levain">Levain</option>
          <option value="phyto">Phyto</option>
          <option value="autre">Autre</option>
        </select>
        <label className="text-sm font-medium">Origine</label>
        <input value={modal?.data?.origine || ""} onChange={e => updateModal("origine", e.target.value)} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" placeholder="ex: Production interne" />
        <label className="text-sm font-medium">Description</label>
        <input value={modal?.data?.description || ""} onChange={e => updateModal("description", e.target.value)} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" />
        <label className="text-sm font-medium">Ordre</label>
        <input type="number" value={modal?.data?.ordre || 1} onChange={e => updateModal("ordre", Number(e.target.value))} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" />
      </EditModal>

      {/* Modal Placette */}
      <EditModal open={modal?.type === "placette" || modal?.type === "placette_new"} title={modal?.data?.id ? "Modifier placette" : "Nouvelle placette"} onClose={() => setModal(null)} onSave={savePlacette} saving={saving}>
        <label className="text-sm font-medium">Nom *</label>
        <input value={modal?.data?.nom || ""} onChange={e => updateModal("nom", e.target.value)} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" placeholder="ex: Placette 1" />
        <label className="text-sm font-medium">Parcelle *</label>
        <select value={modal?.data?.parcelle_id || ""} onChange={e => updateModal("parcelle_id", e.target.value)} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm">
          <option value="">Sélectionner...</option>
          {parcelles.map(p => <option key={p.id} value={p.id}>{p.nom} ({vignobles.find(v => v.id === p.vignoble_id)?.nom})</option>)}
        </select>
        <label className="text-sm font-medium">Modalité</label>
        <select value={modal?.data?.modalite_id || ""} onChange={e => updateModal("modalite_id", e.target.value)} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm">
          <option value="">Aucune (toutes)</option>
          {modalitesLevain.map(m => <option key={m.id} value={m.code}>{m.code} — {m.label}</option>)}
        </select>
        <label className="text-sm font-medium">Nombre de ceps</label>
        <input type="number" value={modal?.data?.nb_ceps || 7} onChange={e => updateModal("nb_ceps", Number(e.target.value))} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" />
        <label className="text-sm font-medium">Position dans le rang</label>
        <input value={modal?.data?.description_position || ""} onChange={e => updateModal("description_position", e.target.value)} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" placeholder="ex: début du rang 3, milieu rang 5" />
        <label className="text-sm font-medium">Pieds marqués</label>
        <input value={modal?.data?.pieds_marques || ""} onChange={e => updateModal("pieds_marques", e.target.value)} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" placeholder="ex: pieds 10 à 16" />
      </EditModal>
    </div>
  );
}
