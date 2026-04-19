import type { Observation, ValidationError } from '@/lib/types';

/**
 * Plages numériques autorisées par champ.
 * Chaque entrée : [min, max, label descriptif]
 * v2 : supprimé epaisseur_feuilles, mildiou_presence, pression_mildiou, mildiou_intensite, température, humidité
 */
const RANGE_RULES: Record<string, [number, number, string]> = {
  // État plante — notes 0-5
  vigueur: [0, 5, 'La note doit être entre 0 et 5'],
  croissance: [0, 5, 'La note doit être entre 0 et 5'],
  homogeneite: [0, 5, 'La note doit être entre 0 et 5'],
  couleur_feuilles: [0, 5, 'La note doit être entre 0 et 5'],
  turgescence: [0, 5, 'La note doit être entre 0 et 5'],

  // Symptômes — notes 0-5
  brulures: [0, 5, 'La note doit être entre 0 et 5'],
  necroses: [0, 5, 'La note doit être entre 0 et 5'],
  deformations: [0, 5, 'La note doit être entre 0 et 5'],

  // Grappes — notes 0-5
  taille_grappes: [0, 5, 'La note doit être entre 0 et 5'],
  homogeneite_grappes: [0, 5, 'La note doit être entre 0 et 5'],

  // Rendement
  poids_100_baies: [0, 500, 'Le poids 100 baies doit être entre 0 et 500 g'],

  // Répétition
  repetition: [1, 10, 'La répétition doit être entre 1 et 10'],
};

/**
 * Valide les données d'une observation.
 * Retourne un tableau vide si tout est valide.
 */
export function validateObservation(data: Partial<Observation>): ValidationError[] {
  const errors: ValidationError[] = [];

  // --- Champs obligatoires ---
  if (!data.parcelle_id || data.parcelle_id.trim() === '') {
    errors.push({ champ: 'parcelle_id', message: 'La parcelle est obligatoire', type: 'required' });
  }

  if (data.rang == null || data.rang === undefined) {
    errors.push({ champ: 'rang', message: 'Le rang est obligatoire', type: 'required' });
  }

  if (!data.date || data.date.trim() === '') {
    errors.push({ champ: 'date', message: 'La date est obligatoire', type: 'required' });
  }

  // --- Plages numériques ---
  for (const [champ, [min, max, message]] of Object.entries(RANGE_RULES)) {
    const value = (data as Record<string, unknown>)[champ];
    if (value != null && typeof value === 'number') {
      if (value < min || value > max) {
        errors.push({ champ, message, type: 'range' });
      }
    }
  }

  return errors;
}
