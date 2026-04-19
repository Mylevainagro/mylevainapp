// ============================================================
// MyLevain Agro — Rapport PDF professionnel
// Exigences : 4.1, 4.2, 4.3, 4.4, 4.5, 4.6
// ============================================================

import type { RapportConfig } from "@/lib/types";

// ---------------------------------------------------------------------------
// Interfaces
// ---------------------------------------------------------------------------

/** Summary record for observations table in the PDF */
export interface ObservationResume {
  date: string;
  rang: number;
  modalite: string;
  vigueur: number | null;
  score_plante: number | null;
  score_sanitaire: number | null;
}

/** Summary record for traitements table in the PDF */
export interface TraitementResume {
  date: string;
  produit: string;
  type_traitement: string | null;
  dose: string | null;
  rang: number;
  modalite: string;
}

/** Summary record for analyses_sol table in the PDF */
export interface AnalyseSolResume {
  date_prelevement: string;
  phase: string;
  ph: number | null;
  matiere_organique_pct: number | null;
  score_sante_sol: number | null;
}

/** All assembled data needed for the PDF report */
export interface RapportData {
  header: {
    site_nom: string;
    parcelle_nom: string;
    cepage: string;
    periode: string;
  };
  scores: {
    global: number | null;
    sol: number | null;
    plante: number | null;
    maladie: number | null;
    biostimulant: number | null;
  };
  observations: ObservationResume[];
  traitements: TraitementResume[];
  analyses_sol: AnalyseSolResume[];
  conclusion: string;
}


// ---------------------------------------------------------------------------
// Input types for assemblerDonneesRapport
// ---------------------------------------------------------------------------

interface SiteInput {
  nom: string;
}

interface ZoneInput {
  nom: string;
  cepage?: string | null;
}

interface ObservationInput {
  date: string;
  rang: number;
  modalite: string;
  vigueur: number | null;
  score_plante: number | null;
  score_sanitaire: number | null;
}

interface TraitementInput {
  date: string;
  produit: string;
  type_traitement: string | null;
  dose: string | null;
  rang: number;
  modalite: string;
}

interface AnalyseSolInput {
  date_prelevement: string;
  phase: string;
  ph: number | null;
  matiere_organique_pct: number | null;
  score_sante_sol: number | null;
  score_contamination_metaux?: number | null;
}

interface AssemblerInput {
  observations: ObservationInput[];
  traitements: TraitementInput[];
  analyses_sol: AnalyseSolInput[];
  site: SiteInput;
  zone: ZoneInput;
}

// ---------------------------------------------------------------------------
// Pure functions — data assembly
// ---------------------------------------------------------------------------

/**
 * Compute the average of non-null numbers. Returns null if no values.
 */
function moyenneNonNull(vals: (number | null | undefined)[]): number | null {
  const nums = vals.filter((v): v is number => v != null);
  if (nums.length === 0) return null;
  const sum = nums.reduce((a, b) => a + b, 0);
  return Math.round((sum / nums.length) * 10) / 10;
}

/**
 * Assemble all data needed for the PDF report.
 * Pure function — no side effects, no I/O.
 */
export function assemblerDonneesRapport(
  config: RapportConfig,
  data: AssemblerInput
): RapportData {
  const { observations, traitements, analyses_sol, site, zone } = data;

  // Build period string from config
  const periode = config.date_debut && config.date_fin
    ? `${config.date_debut} — ${config.date_fin}`
    : `Campagne ${config.campagne}`;

  // Compute average scores from observations
  const scorePlante = moyenneNonNull(observations.map((o) => o.score_plante));
  const scoreSanitaire = moyenneNonNull(observations.map((o) => o.score_sanitaire));
  const scoreMaladie = moyenneNonNull(observations.map((o) => o.vigueur));

  // Compute sol score from analyses
  const scoreSol = moyenneNonNull(analyses_sol.map((a) => a.score_sante_sol));

  // Biostimulant score: average of plante + sanitaire for non-témoin observations
  const biostimObs = observations.filter(
    (o) => o.modalite !== "Témoin"
  );
  const biostimulant = moyenneNonNull([
    moyenneNonNull(biostimObs.map((o) => o.score_plante)),
    moyenneNonNull(biostimObs.map((o) => o.score_sanitaire)),
  ]);

  // Global score: average of all available sub-scores
  const global = moyenneNonNull([scorePlante, scoreSol, scoreSanitaire, biostimulant]);

  const scores: RapportData["scores"] = {
    global,
    sol: scoreSol,
    plante: scorePlante,
    maladie: scoreMaladie,
    biostimulant,
  };

  const conclusion = genererConclusionSynthetique(scores);

  return {
    header: {
      site_nom: site.nom,
      parcelle_nom: zone.nom,
      cepage: zone.cepage ?? "Non spécifié",
      periode,
    },
    scores,
    observations: observations.map((o) => ({
      date: o.date,
      rang: o.rang,
      modalite: o.modalite,
      vigueur: o.vigueur,
      score_plante: o.score_plante,
      score_sanitaire: o.score_sanitaire,
    })),
    traitements: traitements.map((t) => ({
      date: t.date,
      produit: t.produit,
      type_traitement: t.type_traitement,
      dose: t.dose,
      rang: t.rang,
      modalite: t.modalite,
    })),
    analyses_sol: analyses_sol.map((a) => ({
      date_prelevement: a.date_prelevement,
      phase: a.phase,
      ph: a.ph,
      matiere_organique_pct: a.matiere_organique_pct,
      score_sante_sol: a.score_sante_sol,
    })),
    conclusion,
  };
}


// ---------------------------------------------------------------------------
// Conclusion generation — pure function
// ---------------------------------------------------------------------------

/**
 * Generate a French conclusion text from scores.
 * Always returns a non-empty string referencing the main scores.
 */
export function genererConclusionSynthetique(
  scores: RapportData["scores"]
): string {
  const parts: string[] = [];

  // Opening
  parts.push("Synthèse de la campagne :");

  // Global score
  if (scores.global != null) {
    parts.push(`Le score global du site est de ${scores.global}/5.`);
  } else {
    parts.push("Le score global n'a pas pu être calculé (données insuffisantes).");
  }

  // Plante
  if (scores.plante != null) {
    if (scores.plante >= 3.5) {
      parts.push(`L'état des plantes est bon (score plante : ${scores.plante}/5).`);
    } else if (scores.plante >= 2) {
      parts.push(`L'état des plantes est moyen (score plante : ${scores.plante}/5).`);
    } else {
      parts.push(`L'état des plantes est préoccupant (score plante : ${scores.plante}/5).`);
    }
  }

  // Sol
  if (scores.sol != null) {
    if (scores.sol >= 3.5) {
      parts.push(`La santé du sol est satisfaisante (score sol : ${scores.sol}/5).`);
    } else if (scores.sol >= 2) {
      parts.push(`La santé du sol est moyenne (score sol : ${scores.sol}/5).`);
    } else {
      parts.push(`La santé du sol nécessite une attention particulière (score sol : ${scores.sol}/5).`);
    }
  }

  // Maladie
  if (scores.maladie != null) {
    if (scores.maladie <= 1) {
      parts.push(`La pression maladie est faible (score maladie : ${scores.maladie}/5).`);
    } else if (scores.maladie <= 3) {
      parts.push(`La pression maladie est modérée (score maladie : ${scores.maladie}/5).`);
    } else {
      parts.push(`La pression maladie est élevée (score maladie : ${scores.maladie}/5).`);
    }
  }

  // Biostimulant
  if (scores.biostimulant != null) {
    parts.push(`L'effet biostimulant observé est de ${scores.biostimulant}/5.`);
  }

  return parts.join(" ");
}

// ---------------------------------------------------------------------------
// PDF generation — async with dynamic imports (SSR-safe)
// ---------------------------------------------------------------------------

/**
 * Generate a PDF Blob from assembled rapport data.
 * Uses jspdf via dynamic import to avoid SSR issues.
 * Tables are rendered as simple text lines (no autoTable dependency).
 */
export async function genererRapportPDF(
  rapportData: RapportData
): Promise<Blob> {
  const jspdfModule = await import("jspdf");
  const jsPDF = jspdfModule.default ?? jspdfModule.jsPDF;

  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  let y = 20;

  function checkPage(needed: number) {
    if (y + needed > pageHeight - 20) {
      doc.addPage();
      y = 20;
    }
  }

  // ---- Header ----
  doc.setFontSize(20);
  doc.setFont("helvetica", "bold");
  doc.text("Rapport de Campagne", pageWidth / 2, y, { align: "center" });
  y += 10;

  doc.setFontSize(14);
  doc.text(rapportData.header.site_nom, pageWidth / 2, y, { align: "center" });
  y += 8;

  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.text(`Parcelle : ${rapportData.header.parcelle_nom} | Cépage : ${rapportData.header.cepage}`, pageWidth / 2, y, { align: "center" });
  y += 6;
  doc.text(`Période : ${rapportData.header.periode}`, pageWidth / 2, y, { align: "center" });
  y += 12;

  // ---- Scores ----
  doc.setFontSize(13);
  doc.setFont("helvetica", "bold");
  doc.text("Scores", 14, y);
  y += 7;

  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  const { scores } = rapportData;
  const scoreItems = [
    ["Score global", scores.global],
    ["Score plante", scores.plante],
    ["Score sanitaire / maladie", scores.maladie],
    ["Score sol", scores.sol],
    ["Score biostimulant", scores.biostimulant],
  ];
  for (const [label, val] of scoreItems) {
    doc.text(`${label} : ${val ?? "N/A"} / 5`, 18, y);
    y += 5;
  }
  y += 8;

  // ---- Simple table helper ----
  function drawTable(title: string, headers: string[], rows: string[][]) {
    checkPage(20 + rows.length * 5);
    doc.setFontSize(13);
    doc.setFont("helvetica", "bold");
    doc.text(title, 14, y);
    y += 7;

    const colWidth = (pageWidth - 28) / headers.length;

    // Header row
    doc.setFontSize(8);
    doc.setFont("helvetica", "bold");
    doc.setFillColor(240, 240, 240);
    doc.rect(14, y - 3.5, pageWidth - 28, 5, "F");
    headers.forEach((h, i) => {
      doc.text(h, 16 + i * colWidth, y, { maxWidth: colWidth - 2 });
    });
    y += 5;

    // Data rows
    doc.setFont("helvetica", "normal");
    for (const row of rows) {
      checkPage(6);
      row.forEach((cell, i) => {
        doc.text(String(cell), 16 + i * colWidth, y, { maxWidth: colWidth - 2 });
      });
      y += 4.5;
    }
    y += 6;
  }

  // ---- Observations table ----
  if (rapportData.observations.length > 0) {
    drawTable(
      `Observations (${rapportData.observations.length})`,
      ["Date", "Rang", "Modalité", "Vigueur", "Sc.Plante", "Sc.Sanit."],
      rapportData.observations.map((o) => [
        o.date, String(o.rang), o.modalite,
        o.vigueur != null ? String(o.vigueur) : "-",
        o.score_plante != null ? String(o.score_plante) : "-",
        o.score_sanitaire != null ? String(o.score_sanitaire) : "-",
      ])
    );
  }

  // ---- Traitements table ----
  if (rapportData.traitements.length > 0) {
    drawTable(
      `Traitements (${rapportData.traitements.length})`,
      ["Date", "Produit", "Type", "Dose", "Rang", "Modalité"],
      rapportData.traitements.map((t) => [
        t.date, t.produit, t.type_traitement ?? "-",
        t.dose ?? "-", String(t.rang), t.modalite,
      ])
    );
  }

  // ---- Analyses sol table ----
  if (rapportData.analyses_sol.length > 0) {
    drawTable(
      `Analyses Sol (${rapportData.analyses_sol.length})`,
      ["Date", "Phase", "pH", "MO (%)", "Score Sol"],
      rapportData.analyses_sol.map((a) => [
        a.date_prelevement, a.phase,
        a.ph != null ? String(a.ph) : "-",
        a.matiere_organique_pct != null ? String(a.matiere_organique_pct) : "-",
        a.score_sante_sol != null ? String(a.score_sante_sol) : "-",
      ])
    );
  }

  // ---- Conclusion ----
  checkPage(30);
  doc.setFontSize(13);
  doc.setFont("helvetica", "bold");
  doc.text("Conclusion", 14, y);
  y += 7;

  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  const conclusionLines = doc.splitTextToSize(rapportData.conclusion, pageWidth - 28);
  doc.text(conclusionLines, 14, y);

  return doc.output("blob");
}
