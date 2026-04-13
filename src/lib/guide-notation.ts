// ============================================================
// Mapping champ formulaire → code_indicateur guide_notation
// Exigences : 1.4, 1.5
// ============================================================

/**
 * Maps form field names (as used in ObservationForm state) to
 * the `code_indicateur` values stored in the `guide_notation` table.
 *
 * Only fields that have a corresponding fiche in guide_notation are listed.
 * The HelpIcon component already handles the case where no fiche exists
 * (it renders nothing), so this mapping is the single source of truth for
 * which fields get a contextual help icon.
 */
export const INDICATEUR_MAPPING: Record<string, string> = {
  // Maladies — mildiou
  mildiou_presence: "mildiou_frequence",
  mildiou_intensite: "mildiou_intensite",

  // Maladies — oïdium (pas encore de champ dédié dans le formulaire,
  // mais le mapping est prêt pour quand ils seront ajoutés)
  oidium_frequence: "oidium_frequence",
  oidium_intensite: "oidium_intensite",

  // État plante
  vigueur: "vigueur",

  // Météo / sol
  humidite_sol: "humidite_sol",

  // Sol — vie biologique
  vie_biologique_visible: "vie_biologique_visible",
};

/**
 * Returns the `code_indicateur` for a given form field name,
 * or `null` if no guide_notation fiche is mapped to that field.
 */
export function getCodeIndicateur(fieldName: string): string | null {
  if (Object.prototype.hasOwnProperty.call(INDICATEUR_MAPPING, fieldName)) {
    return INDICATEUR_MAPPING[fieldName];
  }
  return null;
}
