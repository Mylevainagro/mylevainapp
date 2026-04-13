import { describe, it, expect } from 'vitest';
import { validateObservation } from '@/lib/validation';
import type { Observation } from '@/lib/types';

/** Helper: minimal valid observation data */
function validObs(): Partial<Observation> {
  return {
    parcelle_id: 'abc-123',
    rang: 1,
    date: '2025-06-01',
  };
}

describe('validateObservation', () => {
  // ---- Required fields ----

  it('returns 3 errors for an empty object', () => {
    const errors = validateObservation({});
    const requiredFields = errors.filter((e) => e.type === 'required').map((e) => e.champ);
    expect(requiredFields).toContain('parcelle_id');
    expect(requiredFields).toContain('rang');
    expect(requiredFields).toContain('date');
    expect(requiredFields).toHaveLength(3);
  });

  it('returns error when parcelle_id is empty string', () => {
    const errors = validateObservation({ ...validObs(), parcelle_id: '  ' });
    expect(errors.some((e) => e.champ === 'parcelle_id' && e.type === 'required')).toBe(true);
  });

  it('returns error when date is empty string', () => {
    const errors = validateObservation({ ...validObs(), date: '' });
    expect(errors.some((e) => e.champ === 'date' && e.type === 'required')).toBe(true);
  });

  it('returns error when rang is missing', () => {
    const { rang, ...rest } = validObs();
    const errors = validateObservation(rest);
    expect(errors.some((e) => e.champ === 'rang' && e.type === 'required')).toBe(true);
  });

  // ---- Valid observation ----

  it('returns empty array for a valid observation', () => {
    expect(validateObservation(validObs())).toEqual([]);
  });

  it('returns empty array when optional numeric fields are null', () => {
    const errors = validateObservation({ ...validObs(), vigueur: null, temperature: null });
    expect(errors).toEqual([]);
  });

  // ---- Range validation: notes 0-5 ----

  it.each([
    'vigueur', 'croissance', 'homogeneite', 'couleur_feuilles',
    'epaisseur_feuilles', 'turgescence', 'brulures', 'necroses',
    'deformations', 'mildiou_presence', 'taille_grappes', 'homogeneite_grappes',
  ] as const)('rejects %s = 6 (above 5)', (field) => {
    const errors = validateObservation({ ...validObs(), [field]: 6 });
    expect(errors.some((e) => e.champ === field && e.type === 'range')).toBe(true);
  });

  it.each([
    'vigueur', 'croissance', 'homogeneite', 'couleur_feuilles',
    'epaisseur_feuilles', 'turgescence', 'brulures', 'necroses',
    'deformations', 'mildiou_presence', 'taille_grappes', 'homogeneite_grappes',
  ] as const)('rejects %s = -1 (below 0)', (field) => {
    const errors = validateObservation({ ...validObs(), [field]: -1 });
    expect(errors.some((e) => e.champ === field && e.type === 'range')).toBe(true);
  });

  it('accepts vigueur = 0 and vigueur = 5 (boundary)', () => {
    expect(validateObservation({ ...validObs(), vigueur: 0 })).toEqual([]);
    expect(validateObservation({ ...validObs(), vigueur: 5 })).toEqual([]);
  });

  // ---- Range validation: pression_mildiou 0-3 ----

  it('rejects pression_mildiou = 4', () => {
    const errors = validateObservation({ ...validObs(), pression_mildiou: 4 as any });
    expect(errors.some((e) => e.champ === 'pression_mildiou' && e.type === 'range')).toBe(true);
  });

  it('accepts pression_mildiou = 3', () => {
    expect(validateObservation({ ...validObs(), pression_mildiou: 3 })).toEqual([]);
  });

  // ---- Range validation: mildiou_intensite 0-100 ----

  it('rejects mildiou_intensite = 101', () => {
    const errors = validateObservation({ ...validObs(), mildiou_intensite: 101 });
    expect(errors.some((e) => e.champ === 'mildiou_intensite' && e.type === 'range')).toBe(true);
  });

  it('accepts mildiou_intensite = 100', () => {
    expect(validateObservation({ ...validObs(), mildiou_intensite: 100 })).toEqual([]);
  });

  // ---- Range validation: temperature -10 to 50 ----

  it('rejects temperature = 60', () => {
    const errors = validateObservation({ ...validObs(), temperature: 60 });
    expect(errors.some((e) => e.champ === 'temperature' && e.type === 'range')).toBe(true);
  });

  it('rejects temperature = -15', () => {
    const errors = validateObservation({ ...validObs(), temperature: -15 });
    expect(errors.some((e) => e.champ === 'temperature' && e.type === 'range')).toBe(true);
  });

  it('accepts temperature = -10 and temperature = 50 (boundary)', () => {
    expect(validateObservation({ ...validObs(), temperature: -10 })).toEqual([]);
    expect(validateObservation({ ...validObs(), temperature: 50 })).toEqual([]);
  });

  // ---- Range validation: humidite 0-100 ----

  it('rejects humidite = 105', () => {
    const errors = validateObservation({ ...validObs(), humidite: 105 });
    expect(errors.some((e) => e.champ === 'humidite' && e.type === 'range')).toBe(true);
  });

  it('accepts humidite = 0 and humidite = 100 (boundary)', () => {
    expect(validateObservation({ ...validObs(), humidite: 0 })).toEqual([]);
    expect(validateObservation({ ...validObs(), humidite: 100 })).toEqual([]);
  });

  // ---- Multiple errors ----

  it('returns both required and range errors together', () => {
    const errors = validateObservation({ vigueur: 10, temperature: 60 });
    const types = errors.map((e) => e.type);
    expect(types).toContain('required');
    expect(types).toContain('range');
    expect(errors.length).toBeGreaterThanOrEqual(5); // 3 required + 2 range
  });
});
