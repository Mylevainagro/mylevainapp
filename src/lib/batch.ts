import type { Observation, ValidationError, Note05 } from '@/lib/types';
import { validateObservation } from '@/lib/validation';

/**
 * Input pour un rang dans un lot batch v2.
 * Simplifié : vigueur + commentaires (maladies saisies séparément).
 */
export interface BatchRangInput {
  rang: number;
  modalite: string;
  vigueur: Note05 | null;
  commentaires: string | null;
}

/**
 * Champs partagés entre tous les rangs d'un lot v2.
 * Supprimé : météo (plus dans observations).
 */
export interface SharedFields {
  parcelle_id: string;
  date: string;
  heure: string;
  mois: string;
  stade_bbch: string | null;
  repetition: number | null;
}

/**
 * Résultat de la validation d'un lot.
 */
export interface BatchResult {
  submitted: number;
  errors: { rang: number; errors: ValidationError[] }[];
}

/**
 * Type pour un enregistrement prêt à être inséré dans Supabase.
 */
export type ObservationInsert = Omit<Observation, 'id' | 'created_at'>;

/**
 * Valide chaque rang individuellement.
 */
export function validateBatch(rangs: BatchRangInput[], shared: SharedFields): BatchResult {
  const errors: { rang: number; errors: ValidationError[] }[] = [];
  let submitted = 0;

  for (const rang of rangs) {
    const obsData: Partial<Observation> = {
      parcelle_id: shared.parcelle_id,
      date: shared.date,
      rang: rang.rang,
      vigueur: rang.vigueur,
    };

    const rangErrors = validateObservation(obsData);

    if (rangErrors.length > 0) {
      errors.push({ rang: rang.rang, errors: rangErrors });
    } else {
      submitted++;
    }
  }

  return { submitted, errors };
}

/**
 * Prépare les enregistrements pour insertion Supabase v2.
 */
export function prepareBatchRecords(
  rangs: BatchRangInput[],
  shared: SharedFields,
): Partial<Observation>[] {
  const { errors } = validateBatch(rangs, shared);
  const invalidRangs = new Set(errors.map((e) => e.rang));

  return rangs
    .filter((r) => !invalidRangs.has(r.rang))
    .map((r) => ({
      parcelle_id: shared.parcelle_id,
      rang: r.rang,
      modalite: r.modalite as Observation['modalite'],
      date: shared.date,
      heure: shared.heure,
      mois: shared.mois,
      stade_bbch: shared.stade_bbch,
      repetition: shared.repetition,
      vigueur: r.vigueur,
      commentaires: r.commentaires,
    }));
}
