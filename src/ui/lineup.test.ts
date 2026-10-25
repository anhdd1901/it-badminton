import { describe, expect, it } from "vitest";
import { matchCounts } from "./lineup";

const t = (x: string, y: string) => [{ id: x }, { id: y }];

describe("matchCounts", () => {
  it("đếm số trận của từng người", () => {
    const counts = matchCounts([
      { teamA: t("a", "b"), teamB: t("c", "d") },
      { teamA: t("a", "c"), teamB: t("b", "e") },
    ]);
    expect(Object.fromEntries(counts)).toEqual({ a: 2, b: 2, c: 2, d: 1, e: 1 });
  });
});
