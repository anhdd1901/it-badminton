import { describe, expect, it } from "vitest";
import { parseRankingParams, parseStatsParams } from "./params";

describe("parseRankingParams", () => {
  it("mặc định là bảng mùa của tháng hiện tại", () => {
    expect(parseRankingParams({}, "2026-10")).toEqual({ board: "mua", season: "2026-10" });
  });
  it("bang=elo chọn bảng ELO, giá trị khác về mùa", () => {
    expect(parseRankingParams({ bang: "elo" }, "2026-10").board).toBe("elo");
    expect(parseRankingParams({ bang: "x" }, "2026-10").board).toBe("mua");
  });
  it("mua hợp lệ được giữ", () => {
    expect(parseRankingParams({ mua: "2026-03" }, "2026-10").season).toBe("2026-03");
  });
  it("mùa sau mùa hiện tại bị đưa về mùa hiện tại", () => {
    expect(parseRankingParams({ mua: "2999-01" }, "2026-10").season).toBe("2026-10");
  });
  it.each([["abc"], ["2026-13"], ["2026-00"], [["2026-01", "2026-02"]]])(
    "mua sai %j về mùa hiện tại",
    (mua) => {
      expect(parseRankingParams({ mua }, "2026-10").season).toBe("2026-10");
    },
  );
});

describe("parseStatsParams", () => {
  it("mặc định xem theo mem", () => {
    expect(parseStatsParams({})).toEqual({ view: "mem" });
  });
  it("xem=cap", () => {
    expect(parseStatsParams({ xem: "cap" }).view).toBe("cap");
  });
  it("bỏ giá trị sai", () => {
    const r = parseStatsParams({ tu: "2026-13", den: "zz", mem: "x" });
    expect(r.from).toBeUndefined();
    expect(r.to).toBeUndefined();
    expect(r.memberId).toBeUndefined();
  });
  it("from > to thì đổi chỗ", () => {
    expect(parseStatsParams({ tu: "2026-08", den: "2026-03" })).toMatchObject({
      from: "2026-03",
      to: "2026-08",
    });
  });
  it("nhận uuid", () => {
    const id = "123e4567-e89b-42d3-a456-426614174000";
    expect(parseStatsParams({ mem: id }).memberId).toBe(id);
  });
});
