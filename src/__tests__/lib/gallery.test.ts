import { describe, it, expect } from 'vitest';
import { filterAndSortPhotos, GalleryPhoto, GalleryFilters } from '@/lib/gallery';

function makePhoto(overrides: Partial<GalleryPhoto> = {}): GalleryPhoto {
  return {
    id: 'p1',
    observation_id: 'o1',
    type: 'feuille',
    url: 'https://example.com/photo.jpg',
    legende: null,
    created_at: '2025-01-01T00:00:00Z',
    date: '2025-06-15',
    rang: 1,
    ...overrides,
  };
}

describe('filterAndSortPhotos', () => {
  const photos: GalleryPhoto[] = [
    makePhoto({ id: 'p1', date: '2025-06-20', type: 'grappe', rang: 3 }),
    makePhoto({ id: 'p2', date: '2025-06-10', type: 'feuille', rang: 1 }),
    makePhoto({ id: 'p3', date: '2025-07-01', type: 'sol', rang: 2 }),
    makePhoto({ id: 'p4', date: '2025-06-15', type: 'feuille', rang: 5 }),
  ];

  it('returns all photos sorted by date ascending when no filters', () => {
    const result = filterAndSortPhotos(photos, {});
    expect(result.map((p) => p.id)).toEqual(['p2', 'p4', 'p1', 'p3']);
  });

  it('filters by type', () => {
    const result = filterAndSortPhotos(photos, { type: 'feuille' });
    expect(result).toHaveLength(2);
    expect(result.every((p) => p.type === 'feuille')).toBe(true);
    // Still sorted by date
    expect(result[0].id).toBe('p2');
    expect(result[1].id).toBe('p4');
  });

  it('filters by date_debut', () => {
    const result = filterAndSortPhotos(photos, { date_debut: '2025-06-16' });
    expect(result).toHaveLength(2);
    expect(result.every((p) => p.date >= '2025-06-16')).toBe(true);
  });

  it('filters by date_fin', () => {
    const result = filterAndSortPhotos(photos, { date_fin: '2025-06-15' });
    expect(result).toHaveLength(2);
    expect(result.every((p) => p.date <= '2025-06-15')).toBe(true);
  });

  it('filters by date range', () => {
    const result = filterAndSortPhotos(photos, {
      date_debut: '2025-06-12',
      date_fin: '2025-06-25',
    });
    expect(result).toHaveLength(2);
    expect(result.map((p) => p.id)).toEqual(['p4', 'p1']);
  });

  it('combines type and date filters', () => {
    const result = filterAndSortPhotos(photos, {
      type: 'feuille',
      date_debut: '2025-06-12',
    });
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('p4');
  });

  it('returns empty array when no photos match', () => {
    const result = filterAndSortPhotos(photos, { type: 'autre' });
    expect(result).toEqual([]);
  });

  it('handles empty input', () => {
    const result = filterAndSortPhotos([], {});
    expect(result).toEqual([]);
  });

  it('does not mutate the original array', () => {
    const original = [...photos];
    filterAndSortPhotos(photos, {});
    expect(photos.map((p) => p.id)).toEqual(original.map((p) => p.id));
  });
});
