import { describe, it, expect } from "vitest";
import { buildTimeline, filterTimeline, EVENT_TYPE_CONFIG } from "@/lib/timeline";
import type { Observation, Traitement, AnalyseSol } from "@/lib/types";

describe("timeline", () => {
  const obs: Partial<Observation>[] = [
    { id: "o1", date: "2025-06-01", rang: 1, modalite: "Témoin", commentaires: "RAS" },
    { id: "o2", date: "2025-07-15", rang: 3, modalite: "Levain 1/4", commentaires: "" },
  ];

  const traitements: Partial<Traitement>[] = [
    { id: "t1", date: "2025-06-10", produit: "Cuivre", dose: "3g/L", type_traitement: "cuivre", objectif: "Mildiou" },
  ];

  const analyses: Partial<AnalyseSol>[] = [
    { id: "a1", date_prelevement: "2025-05-20", phase: "T0", ph: 6.8 },
  ];

  describe("buildTimeline", () => {
    it("merges all event types into a single array", () => {
      const result = buildTimeline(obs, traitements, analyses);
      expect(result).toHaveLength(4);
    });

    it("sorts events by date descending", () => {
      const result = buildTimeline(obs, traitements, analyses);
      for (let i = 1; i < result.length; i++) {
        expect(result[i - 1].date >= result[i].date).toBe(true);
      }
    });

    it("assigns correct type, icone and couleur for observations", () => {
      const result = buildTimeline(obs, [], []);
      result.forEach((e) => {
        expect(e.type).toBe("observation");
        expect(e.icone).toBe("📋");
        expect(e.couleur).toBe("green");
      });
    });

    it("assigns correct type, icone and couleur for traitements", () => {
      const result = buildTimeline([], traitements, []);
      result.forEach((e) => {
        expect(e.type).toBe("traitement");
        expect(e.icone).toBe("💧");
        expect(e.couleur).toBe("brown");
      });
    });

    it("assigns correct type, icone and couleur for analyses sol", () => {
      const result = buildTimeline([], [], analyses);
      result.forEach((e) => {
        expect(e.type).toBe("analyse_sol");
        expect(e.icone).toBe("🧪");
        expect(e.couleur).toBe("blue");
      });
    });

    it("returns empty array for empty inputs", () => {
      expect(buildTimeline([], [], [])).toEqual([]);
    });
  });

  describe("filterTimeline", () => {
    const timeline = buildTimeline(obs, traitements, analyses);

    it("filters by type", () => {
      const result = filterTimeline(timeline, { type: "observation" });
      expect(result).toHaveLength(2);
      result.forEach((e) => expect(e.type).toBe("observation"));
    });

    it("filters by date_debut", () => {
      const result = filterTimeline(timeline, { date_debut: "2025-06-10" });
      result.forEach((e) => expect(e.date >= "2025-06-10").toBe(true));
    });

    it("filters by date_fin", () => {
      const result = filterTimeline(timeline, { date_fin: "2025-06-10" });
      result.forEach((e) => expect(e.date <= "2025-06-10").toBe(true));
    });

    it("combines type and period filters", () => {
      const result = filterTimeline(timeline, { type: "observation", date_debut: "2025-07-01" });
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe("o2");
    });

    it("returns all events when no filters applied", () => {
      expect(filterTimeline(timeline, {})).toHaveLength(timeline.length);
    });
  });

  describe("EVENT_TYPE_CONFIG", () => {
    it("has distinct icone+couleur for each type", () => {
      const combos = Object.values(EVENT_TYPE_CONFIG).map((c) => `${c.icone}|${c.couleur}`);
      expect(new Set(combos).size).toBe(combos.length);
    });
  });
});
