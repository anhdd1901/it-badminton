import { describe, expect, it } from "vitest";
import { canChangeAttendance, canEditResults, matchDayStatus } from "./match-day";

describe("match day", () => {
  const day = "2026-10-17";
  const at = (iso: string) => new Date(iso);
  it("matchDayStatus", () => {
    expect(matchDayStatus(day, at("2026-10-17T04:59:59Z"), 0)).toBe("open");
    expect(matchDayStatus(day, at("2026-10-17T04:59:59Z"), 1)).toBe("locked");
    expect(matchDayStatus(day, at("2026-10-17T05:00:00Z"), 0)).toBe("closed");
  });
  it("canChangeAttendance", () => {
    expect(canChangeAttendance(day, at("2026-10-11T17:00:00Z"), 0)).toBe(true); // 00:00 T2
    expect(canChangeAttendance(day, at("2026-10-11T16:59:59Z"), 0)).toBe(false); // tuần trước
    expect(canChangeAttendance(day, at("2026-10-16T10:00:00Z"), 1)).toBe(false); // đã khóa
  });
  it("canEditResults", () => {
    expect(canEditResults(day, at("2026-10-16T16:59:59Z"), "admin")).toBe(false); // trước 00:00 T7
    expect(canEditResults(day, at("2026-10-16T17:00:00Z"), "subadmin")).toBe(true);
    expect(canEditResults(day, at("2026-10-18T16:00:00Z"), "subadmin")).toBe(true); // CN cùng tuần
    expect(canEditResults(day, at("2026-10-18T17:00:00Z"), "subadmin")).toBe(false); // buổi đã qua
    expect(canEditResults(day, at("2026-10-18T17:00:00Z"), "admin")).toBe(true);
    expect(canEditResults(day, at("2026-10-17T03:00:00Z"), "member")).toBe(false);
  });
});
