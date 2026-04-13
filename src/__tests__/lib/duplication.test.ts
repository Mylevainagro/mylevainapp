import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { dupliquerObservation } from "@/lib/duplication";
import type { Observation } from "@/lib/types";

// Fixture: a complete observation
const sourceObservation: Observation = {
  id: "abc-123-original",
  parcelle_id: "parcelle-1",
  rang: 3,
  modalite: "Levain 1/2",
  date: "2025-03-15",
  heure: "09:30",
  mois: "mars",
  meteo: "Ensoleillé",
  temperature: 18,
  humidite: 65,
  vent: "Faible",
  pluie_recente: false,
  derniere_pluie: "2025-03-10",
  humidite_sol: "Humide",
  volume_applique_l: 10,
  ph_surnageant: 4.5,
  surnageant_l: 2,
  eau_l: 8,
  cuivre: false,
  date_surnageant: "2025-03-14",
  date_cuivre: null,
  vigueur: 4,
  croissance: 3,
  homogeneite: 3,
  couleur_feuilles: 4,
  epaisseur_feuilles: 3,
  turgescence: 4,
  brulures: 0,
  necroses: 1,
  deformations: 0,
  mildiou_presence: 2,
  mildiou_intensite: 15,
  localisation_mildiou: "Feuilles",
  progression: "Stable",
  pression_mildiou: 1,
  nb_grappes_par_cep: 12,
  taille_grappes: 3,
  homogeneite_grappes: 3,
  nombre_grappes: 10,
  poids_moyen_grappe: 150,
  rendement_estime: 8000,
  rendement_reel: null,
  score_plante: 3.5,
  score_sanitaire: 4.2,
  commentaires: "Observation de test",
  created_at: "2025-03-15T09:30:00Z",
};

describe("dupliquerObservation", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2025-06-20T14:45:00"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("should update date to current day (YYYY-MM-DD)", () => {
    const result = dupliquerObservation(sourceObservation);
    expect(result.date).toBe("2025-06-20");
  });

  it("should update heure to current time (HH:MM)", () => {
    const result = dupliquerObservation(sourceObservation);
    expect(result.heure).toBe("14:45");
  });

  it("should update mois to current month in French", () => {
    const result = dupliquerObservation(sourceObservation);
    expect(result.mois).toBe("juin");
  });

  it("should not include id in the result", () => {
    const result = dupliquerObservation(sourceObservation);
    expect(result).not.toHaveProperty("id");
  });

  it("should not include created_at in the result", () => {
    const result = dupliquerObservation(sourceObservation);
    expect(result).not.toHaveProperty("created_at");
  });

  it("should not include score_plante in the result", () => {
    const result = dupliquerObservation(sourceObservation);
    expect(result).not.toHaveProperty("score_plante");
  });

  it("should not include score_sanitaire in the result", () => {
    const result = dupliquerObservation(sourceObservation);
    expect(result).not.toHaveProperty("score_sanitaire");
  });

  it("should copy parcelle_id from source", () => {
    const result = dupliquerObservation(sourceObservation);
    expect(result.parcelle_id).toBe("parcelle-1");
  });

  it("should copy rang from source", () => {
    const result = dupliquerObservation(sourceObservation);
    expect(result.rang).toBe(3);
  });

  it("should copy modalite from source", () => {
    const result = dupliquerObservation(sourceObservation);
    expect(result.modalite).toBe("Levain 1/2");
  });

  it("should copy all plant state fields from source", () => {
    const result = dupliquerObservation(sourceObservation);
    expect(result.vigueur).toBe(4);
    expect(result.croissance).toBe(3);
    expect(result.homogeneite).toBe(3);
    expect(result.couleur_feuilles).toBe(4);
    expect(result.epaisseur_feuilles).toBe(3);
    expect(result.turgescence).toBe(4);
  });

  it("should copy disease fields from source", () => {
    const result = dupliquerObservation(sourceObservation);
    expect(result.mildiou_presence).toBe(2);
    expect(result.mildiou_intensite).toBe(15);
    expect(result.pression_mildiou).toBe(1);
  });

  it("should copy meteo fields from source", () => {
    const result = dupliquerObservation(sourceObservation);
    expect(result.meteo).toBe("Ensoleillé");
    expect(result.temperature).toBe(18);
    expect(result.humidite).toBe(65);
  });

  it("should copy commentaires from source", () => {
    const result = dupliquerObservation(sourceObservation);
    expect(result.commentaires).toBe("Observation de test");
  });

  it("should copy rendement fields from source", () => {
    const result = dupliquerObservation(sourceObservation);
    expect(result.nombre_grappes).toBe(10);
    expect(result.poids_moyen_grappe).toBe(150);
    expect(result.rendement_estime).toBe(8000);
    expect(result.rendement_reel).toBeNull();
  });
});
