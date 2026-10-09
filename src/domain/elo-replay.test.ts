import { describe, expect, it } from "vitest";
import { replayElo } from "./elo";
import type { ResultMatch } from "./standings";

const init = new Map([["a",10000],["b",10000],["c",10000],["d",10000]]);
const mt = (day: string, n: number, sa: number, sb: number): ResultMatch =>
  ({ matchDay: day, number: n, teamA: ["a","b"], teamB: ["c","d"], scoreA: sa, scoreB: sb });

describe("replayElo", () => {
  it("một trận", () => {
    const s = replayElo({ initial: init, matches: [mt("2026-10-17",1,21,15)], adjustments: [] });
    expect(s.current.get("a")).toBe(10160); expect(s.current.get("c")).toBe(9840);
    expect(s.lastMatchDayDelta.get("a")).toBe(160);
  });
  it("thứ tự theo ngày rồi số trận, không theo thứ tự mảng", () => {
    const ms = [mt("2026-10-17",2,15,21), mt("2026-10-10",1,21,15), mt("2026-10-17",1,21,15)];
    const shuffled = replayElo({ initial: init, matches: ms, adjustments: [] });
    const sorted = replayElo({ initial: init, matches: [ms[1], ms[2], ms[0]], adjustments: [] });
    expect(shuffled.current).toEqual(sorted.current);
  });
  it("điều chỉnh trước 12:00 thứ 7 áp trước trận hôm đó; sau thì áp sau", () => {
    const before = { memberId: "a", eloTenths: 12000, at: new Date("2026-10-17T04:00:00Z") };
    const after  = { memberId: "a", eloTenths: 12000, at: new Date("2026-10-17T06:00:00Z") };
    expect(replayElo({ initial: init, matches: [mt("2026-10-17",1,21,15)], adjustments: [after] }).current.get("a")).toBe(12000);
    expect(replayElo({ initial: init, matches: [mt("2026-10-17",1,21,15)], adjustments: [before] }).current.get("a")).not.toBe(12000);
  });
  it("điều chỉnh đúng 12:00 thứ 7 áp trước trận", () => {
    const at = { memberId: "a", eloTenths: 12000, at: new Date("2026-10-17T05:00:00Z") };
    expect(replayElo({ initial: init, matches: [mt("2026-10-17",1,21,15)], adjustments: [at] }).current.get("a")).not.toBe(12000);
  });
  it("mem trong trận không có ELO ban đầu thì ném lỗi", () => {
    expect(() => replayElo({ initial: new Map([["a",10000]]), matches: [mt("2026-10-17",1,21,15)], adjustments: [] }))
      .toThrow(/ELO ban đầu/);
  });
});
