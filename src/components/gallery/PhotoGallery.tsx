"use client";

import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/lib/supabase/client";
import { filterAndSortPhotos, GalleryPhoto, GalleryFilters } from "@/lib/gallery";

const PHOTO_TYPES = [
  { value: "", label: "Tous" },
  { value: "feuille", label: "🍃 Feuille" },
  { value: "grappe", label: "🍇 Grappe" },
  { value: "sol", label: "🟤 Sol" },
  { value: "rang", label: "🌿 Rang" },
  { value: "autre", label: "📷 Autre" },
] as const;

interface PhotoGalleryProps {
  parcelleId: string;
}

export function PhotoGallery({ parcelleId }: PhotoGalleryProps) {
  const [allPhotos, setAllPhotos] = useState<GalleryPhoto[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState<GalleryFilters>({});
  const [fullscreenIndex, setFullscreenIndex] = useState<number | null>(null);

  useEffect(() => {
    async function fetchPhotos() {
      setLoading(true);
      const { data, error } = await supabase
        .from("photos")
        .select("id, observation_id, type, url, legende, created_at, observations!inner(date, rang)")
        .eq("observations.parcelle_id", parcelleId);

      if (error) {
        console.error("Error fetching photos:", error);
        setLoading(false);
        return;
      }

      const mapped: GalleryPhoto[] = (data || []).map((row: Record<string, unknown>) => {
        const obs = row.observations as Record<string, unknown> | null;
        return {
          id: row.id as string,
          observation_id: row.observation_id as string,
          type: row.type as GalleryPhoto["type"],
          url: row.url as string,
          legende: row.legende as string | null,
          created_at: row.created_at as string,
          date: (obs?.date as string) ?? "",
          rang: (obs?.rang as number) ?? null,
        };
      });

      setAllPhotos(mapped);
      setLoading(false);
    }
    fetchPhotos();
  }, [parcelleId]);

  const filtered = filterAndSortPhotos(allPhotos, filters);

  const openFullscreen = (index: number) => setFullscreenIndex(index);
  const closeFullscreen = () => setFullscreenIndex(null);

  const navigateFullscreen = useCallback(
    (direction: 1 | -1) => {
      if (fullscreenIndex === null) return;
      const next = fullscreenIndex + direction;
      if (next >= 0 && next < filtered.length) {
        setFullscreenIndex(next);
      }
    },
    [fullscreenIndex, filtered.length]
  );

  // Keyboard navigation in fullscreen
  useEffect(() => {
    if (fullscreenIndex === null) return;
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") closeFullscreen();
      if (e.key === "ArrowRight") navigateFullscreen(1);
      if (e.key === "ArrowLeft") navigateFullscreen(-1);
    }
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [fullscreenIndex, navigateFullscreen]);

  if (loading) {
    return <div className="text-center text-gray-400 py-8">Chargement des photos…</div>;
  }

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-wrap gap-2">
        <select
          value={filters.type || ""}
          onChange={(e) =>
            setFilters((f) => ({
              ...f,
              type: (e.target.value || undefined) as GalleryFilters["type"],
            }))
          }
          className="rounded-lg border border-gray-200 px-3 py-2 text-sm bg-white"
        >
          {PHOTO_TYPES.map((t) => (
            <option key={t.value} value={t.value}>
              {t.label}
            </option>
          ))}
        </select>
        <input
          type="date"
          value={filters.date_debut || ""}
          onChange={(e) => setFilters((f) => ({ ...f, date_debut: e.target.value || undefined }))}
          className="rounded-lg border border-gray-200 px-3 py-2 text-sm bg-white"
          placeholder="Date début"
        />
        <input
          type="date"
          value={filters.date_fin || ""}
          onChange={(e) => setFilters((f) => ({ ...f, date_fin: e.target.value || undefined }))}
          className="rounded-lg border border-gray-200 px-3 py-2 text-sm bg-white"
          placeholder="Date fin"
        />
      </div>

      {/* Photo count */}
      <p className="text-xs text-gray-500">
        {filtered.length} photo{filtered.length !== 1 ? "s" : ""}
      </p>

      {/* Grid */}
      {filtered.length === 0 ? (
        <p className="text-center text-gray-400 py-8">Aucune photo pour cette parcelle.</p>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {filtered.map((photo, i) => (
            <button
              key={photo.id}
              onClick={() => openFullscreen(i)}
              className="text-left group"
            >
              <img
                src={photo.url}
                alt={photo.legende || `Photo ${photo.type}`}
                className="w-full h-32 object-cover rounded-lg border border-gray-200 group-hover:ring-2 ring-[#2d5016] transition"
                loading="lazy"
              />
              <div className="mt-1 space-y-0.5">
                <div className="text-xs text-gray-600 font-medium">{photo.date}</div>
                <div className="text-xs text-gray-400">
                  {photo.rang != null ? `Rang ${photo.rang}` : "—"} · {photo.type}
                </div>
                {photo.legende && (
                  <div className="text-xs text-gray-500 truncate">{photo.legende}</div>
                )}
              </div>
            </button>
          ))}
        </div>
      )}

      {/* Fullscreen overlay */}
      {fullscreenIndex !== null && filtered[fullscreenIndex] && (
        <div
          className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center"
          onClick={closeFullscreen}
        >
          {/* Close button */}
          <button
            className="absolute top-4 right-4 text-white text-2xl z-10"
            onClick={closeFullscreen}
          >
            ✕
          </button>

          {/* Previous */}
          {fullscreenIndex > 0 && (
            <button
              className="absolute left-4 text-white text-3xl z-10"
              onClick={(e) => {
                e.stopPropagation();
                navigateFullscreen(-1);
              }}
            >
              ‹
            </button>
          )}

          {/* Image */}
          <div className="max-w-full max-h-full p-8" onClick={(e) => e.stopPropagation()}>
            <img
              src={filtered[fullscreenIndex].url}
              alt={filtered[fullscreenIndex].legende || "Photo"}
              className="max-w-full max-h-[80vh] object-contain rounded"
            />
            <div className="text-white text-center mt-3 text-sm">
              <span>{filtered[fullscreenIndex].date}</span>
              {filtered[fullscreenIndex].rang != null && (
                <span> · Rang {filtered[fullscreenIndex].rang}</span>
              )}
              <span> · {filtered[fullscreenIndex].type}</span>
              {filtered[fullscreenIndex].legende && (
                <div className="text-gray-300 mt-1">{filtered[fullscreenIndex].legende}</div>
              )}
              <div className="text-gray-500 text-xs mt-1">
                {fullscreenIndex + 1} / {filtered.length}
              </div>
            </div>
          </div>

          {/* Next */}
          {fullscreenIndex < filtered.length - 1 && (
            <button
              className="absolute right-4 text-white text-3xl z-10"
              onClick={(e) => {
                e.stopPropagation();
                navigateFullscreen(1);
              }}
            >
              ›
            </button>
          )}
        </div>
      )}
    </div>
  );
}
