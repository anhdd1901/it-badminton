import { describe, expect, it } from "vitest";
import { replayElo } from "./elo";
import type { ResultMatch } from "./standings";

const init = new Map([
  ["a", 10000],
  ["b", 10000],
  ["c", 10000],
  ["d", 10000],
]);
const mt = (day: string, n: number, sa: number, sb: number): ResultMatch => ({
  matchDay: day,
  number: n,
  teamA: ["a", "b"],
  teamB: ["c", "d"],
  scoreA: sa,
  scoreB: sb,
});

describe("replayElo", () => {
  it("một trận", () => {
    const s = replayElo({ initial: init, matches: [mt("2026-10-17", 1, 21, 15)], adjustments: [] });
    expect(s.current.get("a")).toBe(10160);
    expect(s.current.get("c")).toBe(9840);
    expect(s.lastMatchDayDelta.get("a")).toBe(160);
  });
  it("thứ tự theo ngày rồi số trận, không theo thứ tự mảng; pin current và lastMatchDayDelta", () => {
    const m1 = mt("2026-10-10", 1, 21, 15); // [a,b] thắng [c,d]
    const m2: ResultMatch = {
      matchDay: "2026-10-17",
      number: 1,
      teamA: ["c", "d"],
      teamB: ["a", "b"],
      scoreA: 21,
      scoreB: 10,
    };
    const m3: ResultMatch = {
      matchDay: "2026-10-17",
      number: 2,
      teamA: ["a", "c"],
      teamB: ["b", "d"],
      scoreA: 21,
      scoreB: 19,
    };
    const expectedCurrent = { a: 10145, b: 9826, c: 10175, d: 9854 };
    const expectedDelta = { a: -15, b: -334, c: 335, d: 14 };
    for (const matches of [
      [m1, m2, m3],
      [m3, m2, m1],
      [m2, m3, m1],
      [m3, m1, m2],
    ]) {
      const s = replayElo({ initial: init, matches, adjustments: [] });
      expect(Object.fromEntries(s.current)).toEqual(expectedCurrent);
      expect(Object.fromEntries(s.lastMatchDayDelta)).toEqual(expectedDelta);
    }
  });
  it("mem chỉ đánh ngày 10-10 giữ delta của ngày đó", () => {
    const withE = new Map([...init, ["e", 10000]]);
    const m1 = mt("2026-10-10", 1, 21, 15);
    const m2: ResultMatch = {
      matchDay: "2026-10-17",
      number: 1,
      teamA: ["a", "b"],
      teamB: ["c", "e"],
      scoreA: 21,
      scoreB: 10,
    };
    const s = replayElo({ initial: withE, matches: [m2, m1], adjustments: [] });
    expect(s.lastMatchDayDelta.get("d")).toBe(-160);
    expect(s.current.get("d")).toBe(9840);
    expect(s.lastMatchDayDelta.get("a")).toBe(149);
    expect(s.lastMatchDayDelta.get("e")).toBe(-149);
  });
  it("điều chỉnh trước 12:00 thứ 7 áp trước trận hôm đó; sau thì áp sau", () => {
    const before = { memberId: "a", eloTenths: 12000, at: new Date("2026-10-17T04:00:00Z") };
    const after = { memberId: "a", eloTenths: 12000, at: new Date("2026-10-17T06:00:00Z") };
    expect(
      replayElo({
        initial: init,
        matches: [mt("2026-10-17", 1, 21, 15)],
        adjustments: [after],
      }).current.get("a"),
    ).toBe(12000);
    expect(
      replayElo({
        initial: init,
        matches: [mt("2026-10-17", 1, 21, 15)],
        adjustments: [before],
      }).current.get("a"),
    ).not.toBe(12000);
  });
  it("điều chỉnh đúng 12:00 thứ 7 áp trước trận", () => {
    const at = { memberId: "a", eloTenths: 12000, at: new Date("2026-10-17T05:00:00Z") };
    expect(
      replayElo({
        initial: init,
        matches: [mt("2026-10-17", 1, 21, 15)],
        adjustments: [at],
      }).current.get("a"),
    ).not.toBe(12000);
  });
  it("mem trong trận không có ELO ban đầu thì ném lỗi", () => {
    expect(() =>
      replayElo({
        initial: new Map([["a", 10000]]),
        matches: [mt("2026-10-17", 1, 21, 15)],
        adjustments: [],
      }),
    ).toThrow(/ELO ban đầu/);
  });
});
