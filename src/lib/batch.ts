import type { Observation, ValidationError, Note05, Note03 } from '@/lib/types';
import { validateObservation } from '@/lib/validation';

/**
 * Input pour un rang dans un lot batch.
 * Contient les champs spécifiques au rang (indicateurs, commentaires).
 */
export interface BatchRangInput {
  rang: number;
  modalite: string;
  vigueur: Note05 | null;
  mildiou_presence: Note05 | null;
  mildiou_intensite: number | null;
  pression_mildiou: Note03 | null;
  commentaires: string | null;
}

/**
 * Champs partagés entre tous les rangs d'un lot.
 */
export interface SharedFields {
  parcelle_id: string;
  date: string;
  heure: string;
  mois: string;
  meteo: string | null;
  temperature: number | null;
  humidite: number | null;
  vent: string | null;
  humidite_sol: string | null;
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
 * Retourne le nombre de rangs valides et les erreurs par rang invalide.
 */
export function validateBatch(rangs: BatchRangInput[], shared: SharedFields): BatchResult {
  const errors: { rang: number; errors: ValidationError[] }[] = [];
  let submitted = 0;

  for (const rang of rangs) {
    const obsData: Partial<Observation> = {
      parcelle_id: shared.parcelle_id,
      date: shared.date,
      rang: rang.rang,
      temperature: shared.temperature,
      humidite: shared.humidite,
      vigueur: rang.vigueur,
      mildiou_presence: rang.mildiou_presence,
      mildiou_intensite: rang.mildiou_intensite,
      pression_mildiou: rang.pression_mildiou,
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
 * Prépare les enregistrements pour insertion Supabase.
 * Fusionne les champs partagés avec les champs spécifiques de chaque rang valide.
 * Filtre les rangs invalides (ceux qui ont des erreurs de validation).
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
      meteo: shared.meteo as Observation['meteo'],
      temperature: shared.temperature,
      humidite: shared.humidite,
      vent: shared.vent as Observation['vent'],
      humidite_sol: shared.humidite_sol as Observation['humidite_sol'],
      vigueur: r.vigueur,
      mildiou_presence: r.mildiou_presence,
      mildiou_intensite: r.mildiou_intensite,
      pression_mildiou: r.pression_mildiou,
      commentaires: r.commentaires,
    }));
}
