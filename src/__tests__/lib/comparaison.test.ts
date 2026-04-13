import { describe, it, expect } from 'vitest';
import { calcPourcentageEvolution } from '@/lib/comparaison';

describe('calcPourcentageEvolution', () => {
  it('returns null when valeurN1 is 0', () => {
    expect(calcPourcentageEvolution(5, 0)).toBeNull();
    expect(calcPourcentageEvolution(0, 0)).toBeNull();
  });

  it('returns 0 when both values are equal and non-zero', () => {
    expect(calcPourcentageEvolution(10, 10)).toBe(0);
  });

  it('returns positive percentage for increase', () => {
    // (12 - 10) / 10 * 100 = 20
    expect(calcPourcentageEvolution(12, 10)).toBe(20);
  });

  it('returns negative percentage for decrease', () => {
    // (8 - 10) / 10 * 100 = -20
    expect(calcPourcentageEvolution(8, 10)).toBe(-20);
  });

  it('returns -100 when valeurN is 0 and valeurN1 is non-zero', () => {
    expect(calcPourcentageEvolution(0, 5)).toBe(-100);
  });

  it('returns 100 when value doubles', () => {
    expect(calcPourcentageEvolution(10, 5)).toBe(100);
  });
});
