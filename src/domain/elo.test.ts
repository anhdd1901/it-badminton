import { describe, expect, it } from "vitest";
import { eloMatchDeltas } from "./elo";

describe("eloMatchDeltas", () => {
  it("hai đội ngang nhau", () =>
    expect(eloMatchDeltas({ a1: 10000, a2: 10000, b1: 10000, b2: 10000 }, "A")).toEqual({ a1: 160, a2: 160, b1: -160, b2: -160 }));
  it("đội mạnh hơn thắng", () =>
    expect(eloMatchDeltas({ a1: 11000, a2: 11000, b1: 10000, b2: 10000 }, "A")).toEqual({ a1: 115, a2: 115, b1: -115, b2: -115 }));
  it("đồng đội lệch trình, A+B thắng", () =>
    expect(eloMatchDeltas({ a1: 7500, a2: 12000, b1: 11000, b2: 9800 }, "A")).toEqual({ a1: 211, a2: 168, b1: -191, b2: -188 }));
  it("đồng đội lệch trình, A+B thua", () =>
    expect(eloMatchDeltas({ a1: 7500, a2: 12000, b1: 11000, b2: 9800 }, "B")).toEqual({ a1: -112, a2: -149, b1: 129, b2: 132 }));
  it("tổng luôn bằng 0", () => {
    const d = eloMatchDeltas({ a1: 9137, a2: 10421, b1: 11888, b2: 8765 }, "B");
    expect(d.a1 + d.a2 + d.b1 + d.b2).toBe(0);
  });
  it("chênh ≥ 2000 thì m = 1", () => {
    const d = eloMatchDeltas({ a1: 5000, a2: 30000, b1: 10000, b2: 10000 }, "A");
    expect(d.a1 + d.a2 + d.b1 + d.b2).toBe(0);
  });
});

describe("eloMatchDeltas clamp", () => {
  const r = { a1: 5000, a2: 30000, b1: 10000, b2: 10000 };
  it("A thắng", () => expect(eloMatchDeltas(r, "A")).toEqual({ a1: 8, a2: 0, b1: -4, b2: -4 }));
  it("B thắng", () => expect(eloMatchDeltas(r, "B")).toEqual({ a1: -32, a2: -600, b1: 316, b2: 316 }));
});
