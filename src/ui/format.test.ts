import { describe, expect, it } from "vitest";
import { eloInputValue, formatDay, formatElo, formatEloDelta, formatSeason } from "./format";

describe("format", () => {
  it("formatElo", () => {
    expect(formatElo(10168)).toBe("1.016,8");
    expect(formatElo(9995)).toBe("999,5");
  });
  it("formatEloDelta", () => {
    expect(formatEloDelta(168)).toBe("▲ 16,8");
    expect(formatEloDelta(-112)).toBe("▼ 11,2");
    expect(formatEloDelta(0)).toBe("0,0");
    expect(formatEloDelta(null)).toBe("–");
  });
  it("formatDay không phụ thuộc múi giờ máy", () => {
    expect(formatDay("2026-10-17")).toBe("Thứ 7, 17/10/2026");
    expect(formatDay("2026-10-18")).toBe("Chủ nhật, 18/10/2026");
    expect(formatDay("2026-10-12")).toBe("Thứ 2, 12/10/2026");
  });
  it("formatSeason", () => {
    expect(formatSeason("2026-10")).toBe("Tháng 10/2026");
  });
});

describe("eloInputValue", () => {
  it("không dấu nghìn, dấu phẩy thập phân", () => {
    expect(eloInputValue(10168)).toBe("1016,8");
    expect(eloInputValue(10000)).toBe("1000,0");
  });
});
