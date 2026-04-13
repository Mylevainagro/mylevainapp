// ============================================================
// MyLevain Agro — Parseur PDF d'analyses de laboratoire
// Extraction automatique des valeurs d'analyse sol depuis un PDF
// Exigences : 6.1, 6.2
// ============================================================

import type { ParsedLaboValue, ParsedLaboResult } from '@/lib/types';

/**
 * Champs d'analyse sol à extraire, avec leurs patterns regex.
 * Chaque entrée mappe un champ de la table analyses_sol vers
 * un ensemble de patterns susceptibles d'apparaître dans un PDF labo.
 */
const CHAMPS_PATTERNS: { champ: string; patterns: RegExp[] }[] = [
  {
    champ: 'ph',
    patterns: [
      /\bpH\s*(?:eau|H2O|CaCl2)?\s*[:\-=]?\s*(\d+[.,]\d+)/i,
      /\bpH\s+(\d+[.,]\d+)/i,
    ],
  },
  {
    champ: 'matiere_organique_pct',
    patterns: [
      /mati[èe]re\s+organique\s*[:\-=]?\s*(\d+[.,]\d+)\s*%/i,
      /M\.?\s*O\.?\s*[:\-=]?\s*(\d+[.,]\d+)\s*%/i,
      /mati[èe]re\s+organique\s*[:\-=]?\s*(\d+[.,]\d+)/i,
    ],
  },
  {
    champ: 'rapport_c_n',
    patterns: [
      /rapport\s+C\s*\/\s*N\s*[:\-=]?\s*(\d+[.,]\d+)/i,
      /C\s*\/\s*N\s*[:\-=]?\s*(\d+[.,]\d+)/i,
    ],
  },
  {
    champ: 'azote_total',
    patterns: [
      /azote\s+total\s*[:\-=]?\s*(\d+[.,]\d+)/i,
      /N\s+total\s*[:\-=]?\s*(\d+[.,]\d+)/i,
    ],
  },
  {
    champ: 'phosphore',
    patterns: [
      /phosphore\s*(?:assimilable|Olsen|total)?\s*[:\-=]?\s*(\d+[.,]\d+)/i,
      /P2O5\s*[:\-=]?\s*(\d+[.,]\d+)/i,
      /P\s+(?:assimilable|Olsen)\s*[:\-=]?\s*(\d+[.,]\d+)/i,
    ],
  },
  {
    champ: 'potassium',
    patterns: [
      /potassium\s*(?:[ée]changeable|total)?\s*[:\-=]?\s*(\d+[.,]\d+)/i,
      /K2O\s*[:\-=]?\s*(\d+[.,]\d+)/i,
      /K\s+[ée]changeable\s*[:\-=]?\s*(\d+[.,]\d+)/i,
    ],
  },
  {
    champ: 'biomasse_microbienne',
    patterns: [
      /biomasse\s+microbienne\s*[:\-=]?\s*(\d+[.,]\d+)/i,
    ],
  },
  {
    champ: 'respiration_sol',
    patterns: [
      /respiration\s+(?:du\s+)?sol\s*[:\-=]?\s*(\d+[.,]\d+)/i,
    ],
  },
  {
    champ: 'cuivre_total',
    patterns: [
      /cuivre\s+total\s*[:\-=]?\s*(\d+[.,]\d+)/i,
      /Cu\s+total\s*[:\-=]?\s*(\d+[.,]\d+)/i,
    ],
  },
  {
    champ: 'cuivre_biodisponible',
    patterns: [
      /cuivre\s+(?:bio)?disponible\s*[:\-=]?\s*(\d+[.,]\d+)/i,
      /Cu\s+(?:bio)?disponible\s*[:\-=]?\s*(\d+[.,]\d+)/i,
      /Cu\s+DTPA\s*[:\-=]?\s*(\d+[.,]\d+)/i,
    ],
  },
  {
    champ: 'cadmium_total',
    patterns: [
      /cadmium\s+total\s*[:\-=]?\s*(\d+[.,]\d+)/i,
      /Cd\s+total\s*[:\-=]?\s*(\d+[.,]\d+)/i,
    ],
  },
  {
    champ: 'plomb_total',
    patterns: [
      /plomb\s+total\s*[:\-=]?\s*(\d+[.,]\d+)/i,
      /Pb\s+total\s*[:\-=]?\s*(\d+[.,]\d+)/i,
    ],
  },
  {
    champ: 'arsenic_total',
    patterns: [
      /arsenic\s+total\s*[:\-=]?\s*(\d+[.,]\d+)/i,
      /As\s+total\s*[:\-=]?\s*(\d+[.,]\d+)/i,
    ],
  },
  {
    champ: 'manganese_total',
    patterns: [
      /mangan[èe]se\s+total\s*[:\-=]?\s*(\d+[.,]\d+)/i,
      /Mn\s+total\s*[:\-=]?\s*(\d+[.,]\d+)/i,
    ],
  },
];

/**
 * Parse une valeur numérique depuis une chaîne capturée par regex.
 * Gère les virgules françaises (ex: "7,2" → 7.2).
 */
function parseNumericValue(raw: string): number {
  return parseFloat(raw.replace(',', '.'));
}

/**
 * Fonction pure de parsing du texte extrait d'un PDF labo.
 * Testable sans dépendance à pdf-parse.
 */
export function parseLaboText(text: string, fileName: string): ParsedLaboResult {
  const valeurs: ParsedLaboValue[] = CHAMPS_PATTERNS.map(({ champ, patterns }) => {
    for (const pattern of patterns) {
      const match = text.match(pattern);
      if (match && match[1]) {
        const raw = match[1];
        const num = parseNumericValue(raw);
        if (!isNaN(num)) {
          return {
            champ,
            valeur: num,
            confiance: 'haute' as const,
            valeur_brute: match[0].trim(),
          };
        }
        // Matched but couldn't parse number → moyenne confidence
        return {
          champ,
          valeur: null,
          confiance: 'moyenne' as const,
          valeur_brute: match[0].trim(),
        };
      }
    }
    // No pattern matched
    return {
      champ,
      valeur: null,
      confiance: 'non_detecte' as const,
    };
  });

  return {
    valeurs,
    texte_brut: text,
    fichier_nom: fileName,
  };
}

/**
 * Parse un fichier PDF d'analyse de laboratoire.
 * Utilise pdf-parse pour extraire le texte, puis parseLaboText pour le mapping.
 */
export async function parsePDFLabo(file: File): Promise<ParsedLaboResult> {
  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  // eslint-disable-next-line
  const pdfParseModule = await import('pdf-parse') as any;
  const pdfParse = pdfParseModule.default ?? pdfParseModule;
  const pdfData = await pdfParse(buffer);

  return parseLaboText(pdfData.text, file.name);
}
