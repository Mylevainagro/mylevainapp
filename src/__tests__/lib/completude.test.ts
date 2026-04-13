import { describe, it, expect } from 'vitest';
import { evaluerCompletude, type CompletudeInput } from '@/lib/completude';

/** Helper: all data present */
function completeInput(): CompletudeInput {
  return {
    has_site: true,
    has_zone: true,
    has_observations: true,
    has_modalite: true,
    indicateurs_remplis: 5,
    has_traitements: true,
    has_scores: true,
    has_analyses_sol: true,
  };
}

/** Helper: minimum data only */
function minimumInput(): CompletudeInput {
  return {
    has_site: true,
    has_zone: true,
    has_observations: true,
    has_modalite: false,
    indicateurs_remplis: 0,
    has_traitements: false,
    has_scores: false,
    has_analyses_sol: false,
  };
}

/** Helper: empty / no data */
function emptyInput(): CompletudeInput {
  return {
    has_site: false,
    has_zone: false,
    has_observations: false,
    has_modalite: false,
    indicateurs_remplis: 0,
    has_traitements: false,
    has_scores: false,
    has_analyses_sol: false,
  };
}

describe('evaluerCompletude', () => {
  // ---- Status: complete ----

  it('returns "complete" when all data is present', () => {
    const result = evaluerCompletude(completeInput());
    expect(result.status).toBe('complete');
    expect(result.missing_required).toEqual([]);
    expect(result.message).toContain('complet');
  });

  // ---- Status: incomplete ----

  it('returns "incomplete" when no data is present', () => {
    const result = evaluerCompletude(emptyInput());
    expect(result.status).toBe('incomplete');
    expect(result.missing_required).toContain('Site');
    expect(result.missing_required).toContain('Zone de culture');
    expect(result.missing_required).toContain('Observations');
  });

  it('returns "incomplete" when site is missing', () => {
    const result = evaluerCompletude({ ...minimumInput(), has_site: false });
    expect(result.status).toBe('incomplete');
    expect(result.missing_required).toContain('Site');
  });

  it('returns "incomplete" when zone is missing', () => {
    const result = evaluerCompletude({ ...minimumInput(), has_zone: false });
    expect(result.status).toBe('incomplete');
    expect(result.missing_required).toContain('Zone de culture');
  });

  it('returns "incomplete" when observations are missing', () => {
    const result = evaluerCompletude({ ...minimumInput(), has_observations: false });
    expect(result.status).toBe('incomplete');
    expect(result.missing_required).toContain('Observations');
  });

  // ---- Status: partial ----

  it('returns "partial" when minimum is present but not complete', () => {
    const result = evaluerCompletude(minimumInput());
    expect(result.status).toBe('partial');
    expect(result.missing_required).toEqual([]);
    expect(result.missing_recommended.length).toBeGreaterThan(0);
  });

  it('returns "partial" when traitements are missing', () => {
    const result = evaluerCompletude({ ...completeInput(), has_traitements: false });
    expect(result.status).toBe('partial');
    expect(result.missing_recommended).toContain('Traitements');
  });

  it('returns "partial" when scores are missing', () => {
    const result = evaluerCompletude({ ...completeInput(), has_scores: false });
    expect(result.status).toBe('partial');
    expect(result.missing_recommended).toContain('Scores calculés');
  });

  it('returns "partial" when analyses_sol are missing', () => {
    const result = evaluerCompletude({ ...completeInput(), has_analyses_sol: false });
    expect(result.status).toBe('partial');
    expect(result.missing_recommended).toContain('Analyses de sol');
  });

  // ---- can_export is ALWAYS true (Exigence 5.7) ----

  it('can_export is true for complete data', () => {
    expect(evaluerCompletude(completeInput()).can_export).toBe(true);
  });

  it('can_export is true for partial data', () => {
    expect(evaluerCompletude(minimumInput()).can_export).toBe(true);
  });

  it('can_export is true for incomplete data', () => {
    expect(evaluerCompletude(emptyInput()).can_export).toBe(true);
  });

  // ---- missing_recommended lists ----

  it('lists modalite as recommended when missing', () => {
    const result = evaluerCompletude({ ...completeInput(), has_modalite: false });
    expect(result.missing_recommended).toContain('Modalité');
  });

  it('lists indicateurs when fewer than 3 are filled', () => {
    const result = evaluerCompletude({ ...completeInput(), indicateurs_remplis: 2 });
    expect(result.missing_recommended).toContain('Indicateurs clés (min. 3)');
  });

  it('does not list indicateurs when 3 or more are filled', () => {
    const result = evaluerCompletude({ ...completeInput(), indicateurs_remplis: 3 });
    expect(result.missing_recommended).not.toContain('Indicateurs clés (min. 3)');
  });

  // ---- Message ----

  it('message is a non-empty string', () => {
    expect(evaluerCompletude(completeInput()).message.length).toBeGreaterThan(0);
    expect(evaluerCompletude(minimumInput()).message.length).toBeGreaterThan(0);
    expect(evaluerCompletude(emptyInput()).message.length).toBeGreaterThan(0);
  });

  it('message mentions missing required items for incomplete', () => {
    const result = evaluerCompletude(emptyInput());
    expect(result.message).toContain('Site');
  });

  it('message mentions missing recommended items for partial', () => {
    const result = evaluerCompletude(minimumInput());
    expect(result.message).toContain('Traitements');
  });
});
