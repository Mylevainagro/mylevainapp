import { describe, it, expect } from 'vitest';
import { validateBatch, prepareBatchRecords } from '@/lib/batch';
import type { BatchRangInput, SharedFields } from '@/lib/batch';

function validShared(): SharedFields {
  return {
    parcelle_id: 'abc-123',
    date: '2025-06-01',
    heure: '10:00',
    mois: 'juin',
    meteo: 'Ensoleillé',
    temperature: 22,
    humidite: 60,
    vent: 'Faible',
    humidite_sol: 'Humide',
  };
}

function validRang(rang: number): BatchRangInput {
  return {
    rang,
    modalite: 'Témoin',
    vigueur: 3,
    mildiou_presence: 1,
    mildiou_intensite: 10,
    pression_mildiou: 1,
    commentaires: null,
  };
}

describe('validateBatch', () => {
  it('returns all submitted when all rangs are valid', () => {
    const rangs = [validRang(1), validRang(2), validRang(3)];
    const result = validateBatch(rangs, validShared());
    expect(result.submitted).toBe(3);
    expect(result.errors).toHaveLength(0);
  });

  it('returns 0 submitted when shared fields are missing', () => {
    const rangs = [validRang(1), validRang(2)];
    const shared = { ...validShared(), parcelle_id: '', date: '' };
    const result = validateBatch(rangs, shared);
    expect(result.submitted).toBe(0);
    expect(result.errors).toHaveLength(2);
  });

  it('detects range errors on individual rangs', () => {
    const rangs = [
      validRang(1),
      { ...validRang(2), vigueur: 10 as any }, // out of range
      validRang(3),
    ];
    const result = validateBatch(rangs, validShared());
    expect(result.submitted).toBe(2);
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0].rang).toBe(2);
    expect(result.errors[0].errors.some((e) => e.champ === 'vigueur')).toBe(true);
  });

  it('handles empty rangs array', () => {
    const result = validateBatch([], validShared());
    expect(result.submitted).toBe(0);
    expect(result.errors).toHaveLength(0);
  });

  it('reports multiple errors on a single rang', () => {
    const rangs = [{ ...validRang(1), vigueur: 10 as any, mildiou_intensite: 200 }];
    const result = validateBatch(rangs, validShared());
    expect(result.submitted).toBe(0);
    expect(result.errors[0].errors.length).toBeGreaterThanOrEqual(2);
  });
});

describe('prepareBatchRecords', () => {
  it('returns records only for valid rangs', () => {
    const rangs = [
      validRang(1),
      { ...validRang(2), vigueur: 10 as any }, // invalid
      validRang(3),
    ];
    const records = prepareBatchRecords(rangs, validShared());
    expect(records).toHaveLength(2);
    expect(records.map((r) => r.rang)).toEqual([1, 3]);
  });

  it('merges shared fields into each record', () => {
    const shared = validShared();
    const records = prepareBatchRecords([validRang(1)], shared);
    expect(records[0].parcelle_id).toBe(shared.parcelle_id);
    expect(records[0].date).toBe(shared.date);
    expect(records[0].heure).toBe(shared.heure);
    expect(records[0].temperature).toBe(shared.temperature);
  });

  it('preserves rang-specific fields', () => {
    const rang = { ...validRang(1), vigueur: 4 as any, commentaires: 'test note' };
    const records = prepareBatchRecords([rang], validShared());
    expect(records[0].vigueur).toBe(4);
    expect(records[0].commentaires).toBe('test note');
  });

  it('returns empty array when all rangs are invalid', () => {
    const shared = { ...validShared(), parcelle_id: '' };
    const records = prepareBatchRecords([validRang(1)], shared);
    expect(records).toHaveLength(0);
  });

  it('returns 7 records for 7 valid rangs', () => {
    const rangs = Array.from({ length: 7 }, (_, i) => validRang(i + 1));
    const records = prepareBatchRecords(rangs, validShared());
    expect(records).toHaveLength(7);
  });
});
