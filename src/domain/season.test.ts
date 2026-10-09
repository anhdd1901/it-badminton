import { describe, expect, it } from "vitest";
import { isSeasonEnded, podiumCounts, seasonEndsAt } from "./season";
import type { Ranked } from "./standings";

const noon = new Date("2026-10-31T05:00:00Z");
describe("seasonEndsAt", () => {
  it("nhập đủ lúc 10:30 thì kết thúc lúc 10:30", () => {
    const t = new Date("2026-10-31T03:30:00Z");
    expect(seasonEndsAt("2026-10", { officialMatchCount: 2, resultEnteredAts: [new Date("2026-10-31T02:00:00Z"), t] })).toEqual(t);
  });
  it("chưa đủ kết quả hoặc không có lịch thì kết thúc lúc 12:00", () => {
    expect(seasonEndsAt("2026-10", { officialMatchCount: 2, resultEnteredAts: [new Date("2026-10-31T02:00:00Z")] })).toEqual(noon);
    expect(seasonEndsAt("2026-10", { officialMatchCount: 0, resultEnteredAts: [] })).toEqual(noon);
  });
  it("nhập đủ sau 12:00 thì vẫn là 12:00", () =>
    expect(seasonEndsAt("2026-10", { officialMatchCount: 1, resultEnteredAts: [new Date("2026-10-31T09:00:00Z")] })).toEqual(noon));
});

describe("isSeasonEnded", () => {
  it("so sánh now với seasonEndsAt", () => {
    const lastDay = { officialMatchCount: 0, resultEnteredAts: [] };
    expect(isSeasonEnded("2026-10", lastDay, new Date("2026-10-31T04:59:59Z"))).toBe(false);
    expect(isSeasonEnded("2026-10", lastDay, noon)).toBe(true);
  });
});

describe("podiumCounts", () => {
  it("podiumCounts tính cả đồng hạng", () => {
    const r = (key: string, rank: number): Ranked<string> => ({ key, rank, diff: 0, totals: { wins:0, pointsFor:0, pointsAgainst:0, played:1 } });
    const p = podiumCounts([[r("a",1), r("b",1), r("c",3), r("d",4)], [r("a",2)]]);
    expect(p.get("a")).toEqual({ first:1, second:1, third:0, fourth:0 });
    expect(p.get("b")?.first).toBe(1); expect(p.get("c")?.third).toBe(1); expect(p.get("d")?.fourth).toBe(1);
  });
  it("chỉ thành viên có hạng 1–4 mới có entry", () => {
    const r = (key: string, rank: number): Ranked<string> => ({ key, rank, diff: 0, totals: { wins:0, pointsFor:0, pointsAgainst:0, played:1 } });
    const p = podiumCounts([[r("a",5), r("b",2)]]);
    expect(p.has("a")).toBe(false);
    expect(p.get("b")).toEqual({ first:0, second:1, third:0, fourth:0 });
  });
});
