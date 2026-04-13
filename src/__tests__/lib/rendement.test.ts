import { describe, it, expect } from "vitest";
import {
  grouperRendementParModalite,
  RendementParModalite,
} from "../../lib/rendement";
import { Observation } from "../../lib/types";

/** Minimal observation factory — only fields relevant to rendement grouping */
function makeObs(
  overrides: Partial<Observation> & Pick<Observation, "modalite">,
): Observation {
  const { modalite, ...rest } = overrides;
  return {
    id: "test-id",
    parcelle_id: "p1",
    rang: 1,
    modalite,
    date: "2025-06-01",
    heure: "10:00",
    mois: "juin",
    meteo: null,
    temperature: null,
    humidite: null,
    vent: null,
    pluie_recente: null,
    derniere_pluie: null,
    humidite_sol: null,
    volume_applique_l: null,
    ph_surnageant: null,
    surnageant_l: null,
    eau_l: null,
    cuivre: null,
    date_surnageant: null,
    date_cuivre: null,
    vigueur: null,
    croissance: null,
    homogeneite: null,
    couleur_feuilles: null,
    epaisseur_feuilles: null,
    turgescence: null,
    brulures: null,
    necroses: null,
    deformations: null,
    mildiou_presence: null,
    mildiou_intensite: null,
    localisation_mildiou: null,
    progression: null,
    pression_mildiou: null,
    nb_grappes_par_cep: null,
    taille_grappes: null,
    homogeneite_grappes: null,
    nombre_grappes: null,
    poids_moyen_grappe: null,
    rendement_estime: null,
    rendement_reel: null,
    score_plante: null,
    score_sanitaire: null,
    commentaires: null,
    created_at: "2025-06-01T00:00:00Z",
    ...rest,
  } as Observation;
}

describe("grouperRendementParModalite", () => {
  it("returns empty array for empty input", () => {
    expect(grouperRendementParModalite([])).toEqual([]);
  });

  it("groups by modalite and computes averages", () => {
    const obs = [
      makeObs({ modalite: "Témoin", rendement_estime: 6000, rendement_reel: 5500 }),
      makeObs({ modalite: "Témoin", rendement_estime: 8000, rendement_reel: 7500 }),
      makeObs({ modalite: "Levain 1/4", rendement_estime: 9000, rendement_reel: 8500 }),
    ];

    const result = grouperRendementParModalite(obs);

    expect(result).toHaveLength(2);
    // Sorted alphabetically: Levain 1/4 < Témoin
    expect(result[0].modalite).toBe("Levain 1/4");
    expect(result[0].moyenne_estime).toBe(9000);
    expect(result[0].moyenne_reel).toBe(8500);
    expect(result[0].count).toBe(1);

    expect(result[1].modalite).toBe("Témoin");
    expect(result[1].moyenne_estime).toBe(7000);
    expect(result[1].moyenne_reel).toBe(6500);
    expect(result[1].count).toBe(2);
  });

  it("ignores null rendement values in averages", () => {
    const obs = [
      makeObs({ modalite: "Témoin", rendement_estime: 6000, rendement_reel: null }),
      makeObs({ modalite: "Témoin", rendement_estime: null, rendement_reel: 7000 }),
    ];

    const result = grouperRendementParModalite(obs);

    expect(result).toHaveLength(1);
    expect(result[0].moyenne_estime).toBe(6000);
    expect(result[0].moyenne_reel).toBe(7000);
    expect(result[0].count).toBe(2);
  });

  it("returns null averages when all rendement values are null", () => {
    const obs = [
      makeObs({ modalite: "Témoin", rendement_estime: null, rendement_reel: null }),
      makeObs({ modalite: "Témoin", rendement_estime: null, rendement_reel: null }),
    ];

    const result = grouperRendementParModalite(obs);

    expect(result).toHaveLength(1);
    expect(result[0].moyenne_estime).toBeNull();
    expect(result[0].moyenne_reel).toBeNull();
    expect(result[0].count).toBe(2);
  });

  it("sorts results alphabetically by modalite", () => {
    const obs = [
      makeObs({ modalite: "Témoin", rendement_estime: 5000 }),
      makeObs({ modalite: "Levain 1/2 + Cuivre", rendement_estime: 7000 }),
      makeObs({ modalite: "Levain 1/4", rendement_estime: 6000 }),
    ];

    const result = grouperRendementParModalite(obs);
    const modalites = result.map((r) => r.modalite);

    expect(modalites).toEqual([...modalites].sort((a, b) => a.localeCompare(b)));
  });
});
