import { describe, expect, it } from "vitest";
import type { Pair } from "./types";
import { pairKey, type ResultMatch } from "./standings";
import { memberStats, pairStats, seasonStandings } from "./stats";

const M = (day: string, a: Pair, b: Pair, sa: number, sb: number): ResultMatch =>
  ({ matchDay: day, number: 1, teamA: a, teamB: b, scoreA: sa, scoreB: sb });
const ms = [M("2026-09-26",["a","b"],["c","d"],21,10), M("2026-10-03",["a","c"],["b","d"],21,19), M("2026-10-10",["b","c"],["a","d"],21,5)];

describe("stats", () => {
  it("seasonStandings chỉ lấy trận trong tháng", () =>
    expect(seasonStandings(ms, "2026-09").find(r => r.key === "a")?.totals.played).toBe(1));
  it("lọc khoảng thời gian", () => {
    const rows = memberStats(ms, new Set(), { fromSeason: "2026-10" });
    expect(rows.find(r => r.key === "a")?.totals).toEqual({ wins:1, pointsFor:26, pointsAgainst:40, played:2 });
  });
  it("podium chỉ tính mùa đã kết thúc trong khoảng", () => {
    const all = memberStats(ms, new Set(["2026-09"]), {});
    expect(all.find(r => r.key === "a")?.podium.first).toBe(1);
    const oct = memberStats(ms, new Set(["2026-09"]), { fromSeason: "2026-10" });
    expect(oct.find(r => r.key === "a")?.podium.first).toBe(0);
  });
  it("lọc mem", () => {
    expect(memberStats(ms, new Set(), { memberId: "d" }).map(r => r.key)).toEqual(["d"]);
    expect(pairStats(ms, { memberId: "d" }).every(r => r.key.split("|").includes("d"))).toBe(true);
  });
  it("pairStats gộp cặp không phân thứ tự", () => {
    const p = pairStats([M("2026-10-03",["a","b"],["c","d"],21,10), M("2026-10-10",["b","a"],["c","d"],15,21)], {});
    expect(p.find(r => r.key === pairKey(["a","b"]))?.totals.played).toBe(2);
  });
});
