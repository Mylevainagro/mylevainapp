"use client";

import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/lib/supabase/client";
import { getLocalGuideNotation } from "@/lib/guide-notation-data";
import type { GuideNotation } from "@/lib/types";

interface GuideNotationDrawerProps {
  codeIndicateur: string;
  isOpen: boolean;
  onClose: () => void;
  triggerRef?: React.RefObject<HTMLElement>;
}

export function GuideNotationDrawer({
  codeIndicateur,
  isOpen,
  onClose,
  triggerRef,
}: GuideNotationDrawerProps) {
  const [fiche, setFiche] = useState<GuideNotation | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch fiche from Supabase when opened
  useEffect(() => {
    if (!isOpen || !codeIndicateur) return;

    let cancelled = false;
    setLoading(true);
    setError(null);

    supabase
      .from("guide_notation")
      .select("*")
      .eq("code_indicateur", codeIndicateur)
      .eq("actif", true)
      .single()
      .then(({ data, error: err }) => {
        if (cancelled) return;
        if (err || !data) {
          // Fallback to local data
          const local = getLocalGuideNotation(codeIndicateur);
          if (local) {
            setFiche(local);
          } else {
            setError("Impossible de charger la fiche.");
            setFiche(null);
          }
        } else {
          setFiche(data as GuideNotation);
        }
        setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [isOpen, codeIndicateur]);

  // Close on Escape key
  useEffect(() => {
    if (!isOpen) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [isOpen, onClose]);

  // Restore focus on close (Exigence 1.6)
  const handleClose = useCallback(() => {
    onClose();
    // Use requestAnimationFrame to restore focus after the drawer unmounts
    requestAnimationFrame(() => {
      triggerRef?.current?.focus();
    });
  }, [onClose, triggerRef]);

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/40 z-40 transition-opacity"
        onClick={handleClose}
        aria-hidden="true"
      />

      {/* Drawer panel — slides from bottom on mobile, right on desktop */}
      <div
        role="dialog"
        aria-modal="true"
        aria-label={fiche?.nom_indicateur ?? "Guide de notation"}
        className="fixed z-50 bg-white shadow-xl overflow-y-auto
          inset-x-0 bottom-0 max-h-[85vh] rounded-t-2xl
          sm:inset-y-0 sm:right-0 sm:left-auto sm:w-[420px] sm:max-h-full sm:rounded-t-none sm:rounded-l-2xl
          animate-slide-up sm:animate-slide-left"
      >
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-100 px-5 py-4 flex items-center justify-between">
          <h2 className="font-semibold text-base text-gray-900 truncate">
            {loading ? "Chargement…" : fiche?.nom_indicateur ?? "Guide"}
          </h2>
          <button
            type="button"
            onClick={handleClose}
            className="text-gray-400 hover:text-gray-600 text-xl leading-none p-1"
            aria-label="Fermer"
          >
            ✕
          </button>
        </div>

        {/* Body */}
        <div className="px-5 py-4 space-y-5">
          {loading && <LoadingSkeleton />}

          {error && (
            <p className="text-sm text-red-500">{error}</p>
          )}

          {!loading && fiche && (
            <>
              {fiche.description && (
                <DrawerSection title="📋 Description" content={fiche.description} />
              )}

              {fiche.pourquoi_mesurer && (
                <DrawerSection title="🎯 Pourquoi mesurer" content={fiche.pourquoi_mesurer} />
              )}

              {fiche.methode_mesure && (
                <DrawerSection title="📏 Méthode de mesure" content={fiche.methode_mesure} />
              )}

              {fiche.points_attention && (
                <DrawerSection title="⚠️ Points d'attention" content={fiche.points_attention} />
              )}

              {fiche.seuils_json && Object.keys(fiche.seuils_json).length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold text-gray-700 mb-2">📊 Échelle de notation</h3>
                  <div className="space-y-1.5">
                    {Object.entries(fiche.seuils_json).map(([seuil, label]) => (
                      <div key={seuil} className="flex gap-2 text-sm">
                        <span className="font-mono font-bold text-emerald-700 w-10 shrink-0 text-right">
                          {seuil}{fiche.unite ? fiche.unite : ""}
                        </span>
                        <span className="text-gray-600">{label}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {fiche.exemple && (
                <DrawerSection title="💡 Exemple" content={fiche.exemple} />
              )}

              {fiche.unite && (
                <div className="text-sm text-gray-500">
                  <span className="font-medium">Unité :</span> {fiche.unite}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </>
  );
}

function DrawerSection({ title, content }: { title: string; content: string }) {
  return (
    <div>
      <h3 className="text-sm font-semibold text-gray-700 mb-1">{title}</h3>
      <p className="text-sm text-gray-600 leading-relaxed">{content}</p>
    </div>
  );
}

function LoadingSkeleton() {
  return (
    <div className="space-y-4 animate-pulse">
      {[1, 2, 3, 4].map((i) => (
        <div key={i}>
          <div className="h-4 bg-gray-200 rounded w-32 mb-2" />
          <div className="h-3 bg-gray-100 rounded w-full mb-1" />
          <div className="h-3 bg-gray-100 rounded w-3/4" />
        </div>
      ))}
    </div>
  );
}
