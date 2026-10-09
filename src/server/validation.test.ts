import { describe, expect, it } from "vitest";
import {
  parseDisplayName,
  parseEloInput,
  parseLocalDate,
  parseMemberId,
  parsePassword,
  parseSeasonId,
  parseUsername,
} from "./validation";

describe("validation", () => {
  it("username chuẩn hóa", () => expect(parseUsername(" Minh.NT ")).toBe("minh.nt"));
  it.each(["ab", "minh nt", "đức", "a".repeat(31)])("username sai %s", (s) =>
    expect(() => parseUsername(s)).toThrow(/3–30 ký tự/),
  );
  it("ELO", () => {
    expect(parseEloInput("1012,5")).toBe(10125);
    expect(parseEloInput("1012.5")).toBe(10125);
    expect(parseEloInput(1000)).toBe(10000);
    expect(parseEloInput("5000")).toBe(50000);
    for (const bad of ["0", "5000,1", "1012,55", "abc", -5]) expect(() => parseEloInput(bad)).toThrow(/ELO phải là số/);
  });
  it("ngày thi đấu phải là thứ 7 có thật", () => {
    expect(parseLocalDate("2026-10-17")).toBe("2026-10-17");
    for (const bad of ["2026-10-16", "2026-02-30", "17/10/2026"])
      expect(() => parseLocalDate(bad)).toThrow("Ngày thi đấu không hợp lệ");
  });
  it("tháng", () => {
    expect(parseSeasonId("2026-10")).toBe("2026-10");
    expect(() => parseSeasonId("2026-13")).toThrow("Tháng không hợp lệ");
  });
  it("mã mem", () => {
    const id = "3f2b8c1e-9a4d-4e7b-8c2a-1d5e6f7a8b9c";
    expect(parseMemberId(id)).toBe(id);
    for (const bad of ["not-a-uuid", "", "3f2b8c1e-9a4d-4e7b-8c2a"])
      expect(() => parseMemberId(bad)).toThrow(expect.objectContaining({ code: "NOT_FOUND", message: "Không tìm thấy mem" }));
  });
  it("tên hiển thị và mật khẩu", () => {
    expect(parseDisplayName("  Đức  ")).toBe("Đức");
    expect(() => parseDisplayName("   ")).toThrow("Tên hiển thị dài 1–50 ký tự");
    expect(() => parsePassword("1234567")).toThrow("Mật khẩu tối thiểu 8 ký tự");
  });
});
