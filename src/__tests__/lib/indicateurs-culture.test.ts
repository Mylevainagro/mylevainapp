import { describe, it, expect } from 'vitest';
import {
  getIndicateursForCulture,
  ALL_INDICATEURS,
} from '@/lib/indicateurs-culture';

describe('getIndicateursForCulture', () => {
  it('returns all indicators for viticulture', () => {
    const result = getIndicateursForCulture('viticulture');
    expect(result).toEqual([...ALL_INDICATEURS]);
  });

  it('returns all indicators for unknown culture type (fallback)', () => {
    const result = getIndicateursForCulture('unknown_type');
    expect(result).toEqual([...ALL_INDICATEURS]);
  });

  it('returns a non-empty subset for maraichage', () => {
    const result = getIndicateursForCulture('maraichage');
    expect(result.length).toBeGreaterThan(0);
    expect(result.length).toBeLessThan(ALL_INDICATEURS.length);
  });

  it('maraichage excludes mildiou/oidium/grappes indicators', () => {
    const result = getIndicateursForCulture('maraichage');
    expect(result).not.toContain('mildiou_presence');
    expect(result).not.toContain('mildiou_intensite');
    expect(result).not.toContain('localisation_mildiou');
    expect(result).not.toContain('pression_mildiou');
    expect(result).not.toContain('nb_grappes_par_cep');
    expect(result).not.toContain('taille_grappes');
    expect(result).not.toContain('homogeneite_grappes');
  });

  it('maraichage includes vigueur, humidite_sol, vie_biologique_visible, temperature, humidite', () => {
    const result = getIndicateursForCulture('maraichage');
    expect(result).toContain('vigueur');
    expect(result).toContain('humidite_sol');
    expect(result).toContain('vie_biologique_visible');
    expect(result).toContain('temperature');
    expect(result).toContain('humidite');
  });

  it('arboriculture excludes mildiou/oidium indicators', () => {
    const result = getIndicateursForCulture('arboriculture');
    expect(result).not.toContain('mildiou_presence');
    expect(result).not.toContain('mildiou_intensite');
    expect(result).not.toContain('pression_mildiou');
  });

  it('arboriculture includes rendement fields', () => {
    const result = getIndicateursForCulture('arboriculture');
    expect(result).toContain('rendement_estime');
    expect(result).toContain('rendement_reel');
    expect(result).toContain('nombre_grappes');
    expect(result).toContain('poids_moyen_grappe');
  });

  it('arboriculture includes vigueur, humidite_sol, vie_biologique_visible', () => {
    const result = getIndicateursForCulture('arboriculture');
    expect(result).toContain('vigueur');
    expect(result).toContain('humidite_sol');
    expect(result).toContain('vie_biologique_visible');
  });

  it('grandes_cultures returns minimal set', () => {
    const result = getIndicateursForCulture('grandes_cultures');
    expect(result).toContain('vigueur');
    expect(result).toContain('humidite_sol');
    expect(result).toContain('vie_biologique_visible');
  });

  it('grandes_cultures excludes mildiou, oidium, grappes, rendement', () => {
    const result = getIndicateursForCulture('grandes_cultures');
    expect(result).not.toContain('mildiou_presence');
    expect(result).not.toContain('mildiou_intensite');
    expect(result).not.toContain('nb_grappes_par_cep');
    expect(result).not.toContain('rendement_estime');
  });

  it('returns a new array each time (no shared reference)', () => {
    const a = getIndicateursForCulture('viticulture');
    const b = getIndicateursForCulture('viticulture');
    expect(a).not.toBe(b);
    expect(a).toEqual(b);
  });

  it('every returned indicator is part of ALL_INDICATEURS', () => {
    const cultures = ['viticulture', 'maraichage', 'arboriculture', 'grandes_cultures'];
    for (const culture of cultures) {
      const result = getIndicateursForCulture(culture);
      for (const ind of result) {
        expect(ALL_INDICATEURS).toContain(ind);
      }
    }
  });
});
