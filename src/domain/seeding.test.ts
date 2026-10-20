import { describe, expect, it } from "vitest";
import { computeSeeds, type SeedCandidate } from "./seeding";

const c = (id: string, elo: number, day: number): SeedCandidate => ({
  id,
  eloTenths: elo,
  joinedAt: new Date(Date.UTC(2026, 0, day)),
});

describe("computeSeeds", () => {
  it("top 4 là Hạt giống 1", () => {
    const s = computeSeeds([
      c("a", 11000, 1),
      c("b", 10500, 1),
      c("c", 10400, 1),
      c("d", 10300, 1),
      c("e", 10200, 1),
    ]);
    expect(
      [...s]
        .filter(([, v]) => v === 1)
        .map(([k]) => k)
        .sort(),
    ).toEqual(["a", "b", "c", "d"]);
    expect(s.get("e")).toBe(2);
  });
  it("bằng ELO ở hạng 4: người vào sớm hơn thắng, rồi tới id", () => {
    const s = computeSeeds([
      c("a", 11000, 1),
      c("b", 11000, 1),
      c("c", 11000, 1),
      c("e", 10000, 5),
      c("d", 10000, 2),
      c("f", 10000, 2),
    ]);
    expect(s.get("d")).toBe(1);
    expect(s.get("e")).toBe(2);
    expect(s.get("f")).toBe(2);
  });
});
