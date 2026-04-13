import { describe, it, expect } from "vitest";
import { calcCorrelation } from "@/lib/correlation";

describe("calcCorrelation", () => {
  it("returns null for arrays of different lengths", () => {
    expect(calcCorrelation([1, 2], [1])).toBeNull();
  });

  it("returns null for arrays with fewer than 2 elements", () => {
    expect(calcCorrelation([1], [2])).toBeNull();
    expect(calcCorrelation([], [])).toBeNull();
  });

  it("returns null when standard deviation of xs is 0", () => {
    expect(calcCorrelation([3, 3, 3], [1, 2, 3])).toBeNull();
  });

  it("returns null when standard deviation of ys is 0", () => {
    expect(calcCorrelation([1, 2, 3], [5, 5, 5])).toBeNull();
  });

  it("returns 1 for perfect positive correlation", () => {
    expect(calcCorrelation([1, 2, 3, 4], [2, 4, 6, 8])).toBeCloseTo(1, 10);
  });

  it("returns -1 for perfect negative correlation", () => {
    expect(calcCorrelation([1, 2, 3, 4], [8, 6, 4, 2])).toBeCloseTo(-1, 10);
  });

  it("returns 0 for uncorrelated data", () => {
    // Orthogonal deviations around mean
    expect(calcCorrelation([1, 0, -1, 0], [0, 1, 0, -1])).toBeCloseTo(0, 10);
  });

  it("computes a known correlation value", () => {
    // xs = [10, 20, 30, 40, 50], ys = [12, 24, 28, 38, 52]
    const r = calcCorrelation([10, 20, 30, 40, 50], [12, 24, 28, 38, 52]);
    expect(r).not.toBeNull();
    expect(r!).toBeCloseTo(0.9860, 3);
  });

  it("result is always between -1 and 1", () => {
    const r = calcCorrelation([1, 5, 3, 9, 7], [2, 8, 1, 6, 4]);
    expect(r).not.toBeNull();
    expect(r!).toBeGreaterThanOrEqual(-1);
    expect(r!).toBeLessThanOrEqual(1);
  });
});
