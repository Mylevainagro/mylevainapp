import { describe, it, expect } from "vitest";
import {
  assemblerDonneesRapport,
  genererConclusionSynthetique,
  type RapportData,
} from "@/lib/rapport-pdf";
import type { RapportConfig } from "@/lib/types";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const baseConfig: RapportConfig = {
  site_id: "site-1",
  campagne: "2026",
};

const configWithDates: RapportConfig = {
  site_id: "site-1",
  campagne: "2026",
  date_debut: "2026-04-01",
  date_fin: "2026-09-30",
};

const site = { nom: "Château Test" };
const zone = { nom: "Parcelle A", cepage: "Merlot" };

function makeObs(overrides: Partial<{
  date: string; rang: number; modalite: string;
  vigueur: number | null; mildiou_presence: number | null;
  score_plante: number | null; score_sanitaire: number | null;
}> = {}) {
  return {
    date: "2026-06-15",
    rang: 1,
    modalite: "Témoin",
    vigueur: 4,
    mildiou_presence: 1,
    score_plante: 3.5,
    score_sanitaire: 4,
    ...overrides,
  };
}

function makeTraitement(overrides: Partial<{
  date: string; produit: string; type_traitement: string | null;
  dose: string | null; rang: number; modalite: string;
}> = {}) {
  return {
    date: "2026-06-10",
    produit: "Levain",
    type_traitement: "levain" as string | null,
    dose: "1/4",
    rang: 1,
    modalite: "Levain 1/4",
    ...overrides,
  };
}

function makeAnalyse(overrides: Partial<{
  date_prelevement: string; phase: string;
  ph: number | null; matiere_organique_pct: number | null;
  score_sante_sol: number | null; score_contamination_metaux: number | null;
}> = {}) {
  return {
    date_prelevement: "2026-04-01",
    phase: "T0",
    ph: 6.8,
    matiere_organique_pct: 3.2,
    score_sante_sol: 3.5,
    score_contamination_metaux: null as number | null,
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// assemblerDonneesRapport
// ---------------------------------------------------------------------------

describe("assemblerDonneesRapport", () => {
  it("should assemble header with site, zone, cepage and campagne period", () => {
    const result = assemblerDonneesRapport(baseConfig, {
      observations: [],
      traitements: [],
      analyses_sol: [],
      site,
      zone,
    });

    expect(result.header.site_nom).toBe("Château Test");
    expect(result.header.parcelle_nom).toBe("Parcelle A");
    expect(result.header.cepage).toBe("Merlot");
    expect(result.header.periode).toBe("Campagne 2026");
  });

  it("should use date range in period when dates are provided", () => {
    const result = assemblerDonneesRapport(configWithDates, {
      observations: [],
      traitements: [],
      analyses_sol: [],
      site,
      zone,
    });

    expect(result.header.periode).toBe("2026-04-01 — 2026-09-30");
  });

  it("should default cepage to 'Non spécifié' when null", () => {
    const result = assemblerDonneesRapport(baseConfig, {
      observations: [],
      traitements: [],
      analyses_sol: [],
      site,
      zone: { nom: "Zone B", cepage: null },
    });

    expect(result.header.cepage).toBe("Non spécifié");
  });

  it("should compute average scores from observations", () => {
    const obs = [
      makeObs({ score_plante: 4, score_sanitaire: 3, mildiou_presence: 2 }),
      makeObs({ score_plante: 2, score_sanitaire: 5, mildiou_presence: 0 }),
    ];

    const result = assemblerDonneesRapport(baseConfig, {
      observations: obs,
      traitements: [],
      analyses_sol: [],
      site,
      zone,
    });

    expect(result.scores.plante).toBe(3); // (4+2)/2
    expect(result.scores.maladie).toBe(1); // (2+0)/2
  });

  it("should compute sol score from analyses", () => {
    const analyses = [
      makeAnalyse({ score_sante_sol: 4 }),
      makeAnalyse({ score_sante_sol: 2 }),
    ];

    const result = assemblerDonneesRapport(baseConfig, {
      observations: [],
      traitements: [],
      analyses_sol: analyses,
      site,
      zone,
    });

    expect(result.scores.sol).toBe(3); // (4+2)/2
  });

  it("should return null scores when no data", () => {
    const result = assemblerDonneesRapport(baseConfig, {
      observations: [],
      traitements: [],
      analyses_sol: [],
      site,
      zone,
    });

    expect(result.scores.global).toBeNull();
    expect(result.scores.sol).toBeNull();
    expect(result.scores.plante).toBeNull();
    expect(result.scores.maladie).toBeNull();
    expect(result.scores.biostimulant).toBeNull();
  });

  it("should include all observations, traitements, and analyses in output", () => {
    const result = assemblerDonneesRapport(baseConfig, {
      observations: [makeObs(), makeObs({ rang: 2 })],
      traitements: [makeTraitement()],
      analyses_sol: [makeAnalyse()],
      site,
      zone,
    });

    expect(result.observations).toHaveLength(2);
    expect(result.traitements).toHaveLength(1);
    expect(result.analyses_sol).toHaveLength(1);
  });

  it("should generate a non-empty conclusion", () => {
    const result = assemblerDonneesRapport(baseConfig, {
      observations: [makeObs()],
      traitements: [],
      analyses_sol: [],
      site,
      zone,
    });

    expect(result.conclusion.length).toBeGreaterThan(0);
  });
});

// ---------------------------------------------------------------------------
// genererConclusionSynthetique
// ---------------------------------------------------------------------------

describe("genererConclusionSynthetique", () => {
  it("should return a non-empty string", () => {
    const scores: RapportData["scores"] = {
      global: 3.5,
      sol: 3,
      plante: 4,
      maladie: 1,
      biostimulant: 3.8,
    };

    const conclusion = genererConclusionSynthetique(scores);
    expect(conclusion.length).toBeGreaterThan(0);
  });

  it("should reference the global score", () => {
    const scores: RapportData["scores"] = {
      global: 4.2,
      sol: null,
      plante: null,
      maladie: null,
      biostimulant: null,
    };

    const conclusion = genererConclusionSynthetique(scores);
    expect(conclusion).toContain("4.2");
  });

  it("should reference plante score when available", () => {
    const scores: RapportData["scores"] = {
      global: null,
      sol: null,
      plante: 2.5,
      maladie: null,
      biostimulant: null,
    };

    const conclusion = genererConclusionSynthetique(scores);
    expect(conclusion).toContain("2.5");
  });

  it("should handle all null scores gracefully", () => {
    const scores: RapportData["scores"] = {
      global: null,
      sol: null,
      plante: null,
      maladie: null,
      biostimulant: null,
    };

    const conclusion = genererConclusionSynthetique(scores);
    expect(conclusion.length).toBeGreaterThan(0);
    expect(conclusion).toContain("données insuffisantes");
  });

  it("should describe high maladie as élevée", () => {
    const scores: RapportData["scores"] = {
      global: null,
      sol: null,
      plante: null,
      maladie: 4,
      biostimulant: null,
    };

    const conclusion = genererConclusionSynthetique(scores);
    expect(conclusion).toContain("élevée");
  });

  it("should describe low maladie as faible", () => {
    const scores: RapportData["scores"] = {
      global: null,
      sol: null,
      plante: null,
      maladie: 0.5,
      biostimulant: null,
    };

    const conclusion = genererConclusionSynthetique(scores);
    expect(conclusion).toContain("faible");
  });
});
