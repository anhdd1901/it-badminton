import { describe, expect, it } from "vitest";
import { memberTotals, pairKey, pairMembers, rankTotals, type ResultMatch, type Totals } from "./standings";

const m = (a: readonly [string, string], b: readonly [string, string], sa: number, sb: number, n = 1): ResultMatch =>
  ({ matchDay: "2026-10-17", number: n, teamA: a, teamB: b, scoreA: sa, scoreB: sb });

describe("standings", () => {
  it("cộng dồn cho từng mem", () => {
    const t = memberTotals([m(["a","b"],["c","d"],21,17)]);
    expect(t.get("a")).toEqual({ wins:1, pointsFor:21, pointsAgainst:17, played:1 });
    expect(t.get("d")).toEqual({ wins:0, pointsFor:17, pointsAgainst:21, played:1 });
  });
  it("pairMembers là nghịch đảo của pairKey", () => expect(pairMembers(pairKey(["b","a"]))).toEqual(["a","b"]));
  it("pairKey không phụ thuộc thứ tự", () => expect(pairKey(["b","a"])).toBe(pairKey(["a","b"])));
  it("thứ tự ưu tiên và ít trận xếp trên", () => {
    const rows = new Map<string, Totals>([
      ["x", { wins:2, pointsFor:42, pointsAgainst:30, played:3 }],
      ["y", { wins:2, pointsFor:42, pointsAgainst:30, played:2 }],   // ít trận hơn → trên x
      ["z", { wins:2, pointsFor:50, pointsAgainst:38, played:3 }],   // cùng hiệu số 12, cầu thắng nhiều hơn → trên cả hai
      ["w", { wins:3, pointsFor:60, pointsAgainst:70, played:4 }],   // thắng nhiều nhất
    ]);
    expect(rankTotals(rows).map(r => [r.key, r.rank])).toEqual([["w",1],["z",2],["y",3],["x",4]]);
  });
  it("đồng hạng kiểu 1, 1, 3", () => {
    const same = { wins:1, pointsFor:21, pointsAgainst:17, played:1 };
    const rows = new Map([["a", same], ["b", same], ["c", { wins:0, pointsFor:17, pointsAgainst:21, played:1 }]]);
    expect(rankTotals(rows).map(r => r.rank)).toEqual([1,1,3]);
  });
});
