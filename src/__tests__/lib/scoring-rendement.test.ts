import { describe, it, expect } from "vitest";
import { calcScoreRendement } from "@/lib/scoring";

describe("calcScoreRendement", () => {
  it("returns null when no rendement data", () => {
    expect(calcScoreRendement({})).toBeNull();
    expect(calcScoreRendement({ nombre_grappes: 10 })).toBeNull();
  });

  it("prefers rendement_reel over rendement_estime", () => {
    expect(calcScoreRendement({ rendement_reel: 3000, rendement_estime: 10000 })).toBe(2);
  });

  it("falls back to rendement_estime when rendement_reel is null", () => {
    expect(calcScoreRendement({ rendement_estime: 10000 })).toBe(4);
  });

  it("returns 0 for zero or negative values", () => {
    expect(calcScoreRendement({ rendement_reel: 0 })).toBe(0);
    expect(calcScoreRendement({ rendement_reel: -100 })).toBe(0);
  });

  it("scores by viticulture thresholds", () => {
    expect(calcScoreRendement({ rendement_reel: 1000 })).toBe(1);
    expect(calcScoreRendement({ rendement_reel: 2000 })).toBe(1);
    expect(calcScoreRendement({ rendement_reel: 4000 })).toBe(2);
    expect(calcScoreRendement({ rendement_reel: 5000 })).toBe(2);
    expect(calcScoreRendement({ rendement_reel: 7000 })).toBe(3);
    expect(calcScoreRendement({ rendement_reel: 8000 })).toBe(3);
    expect(calcScoreRendement({ rendement_reel: 10000 })).toBe(4);
    expect(calcScoreRendement({ rendement_reel: 12000 })).toBe(4);
    expect(calcScoreRendement({ rendement_reel: 15000 })).toBe(5);
  });
});
