// ============================================================
// Gallery — Pure functions for photo filtering and sorting
// ============================================================

export interface GalleryPhoto {
  id: string;
  observation_id: string;
  type: 'feuille' | 'grappe' | 'sol' | 'rang' | 'autre';
  url: string;
  legende: string | null;
  created_at: string;
  // Joined from observation
  date: string;
  rang: number | null;
}

export interface GalleryFilters {
  type?: 'feuille' | 'grappe' | 'sol' | 'rang' | 'autre';
  date_debut?: string;
  date_fin?: string;
}

/**
 * Filter and sort photos by criteria.
 * Photos are sorted by observation date ascending.
 * Filters: type (feuille, grappe, sol, rang, autre), period (date_debut, date_fin).
 */
export function filterAndSortPhotos(
  photos: GalleryPhoto[],
  filters: GalleryFilters
): GalleryPhoto[] {
  let result = [...photos];

  if (filters.type) {
    result = result.filter((p) => p.type === filters.type);
  }

  if (filters.date_debut) {
    result = result.filter((p) => p.date >= filters.date_debut!);
  }

  if (filters.date_fin) {
    result = result.filter((p) => p.date <= filters.date_fin!);
  }

  // Sort by observation date ascending
  result.sort((a, b) => a.date.localeCompare(b.date));

  return result;
}
