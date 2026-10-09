import { describe, expect, it } from "vitest";
import {
  checkInClosesAt,
  isPastMatchDay,
  lastMatchDayOfSeason,
  matchDayOfWeek,
  matchDayStart,
  seasonOf,
  weekEnd,
  weekStart,
} from "./time";

describe("time", () => {
  it("matchDayOfWeek theo giờ VN", () => {
    expect(matchDayOfWeek(new Date("2026-10-11T17:00:00Z"))).toBe("2026-10-17"); // 00:00 T2 12/10 VN
    expect(matchDayOfWeek(new Date("2026-10-11T16:59:59Z"))).toBe("2026-10-10"); // 23:59:59 CN 11/10 VN
    expect(matchDayOfWeek(new Date("2026-10-18T16:59:59Z"))).toBe("2026-10-17"); // CN cuối tuần
  });
  it("checkInClosesAt là 12:00 thứ 7 giờ VN", () => {
    expect(checkInClosesAt("2026-10-17").toISOString()).toBe("2026-10-17T05:00:00.000Z");
  });
  it("weekStart, weekEnd, matchDayStart", () => {
    expect(weekStart("2026-10-17").toISOString()).toBe("2026-10-11T17:00:00.000Z");
    expect(weekEnd("2026-10-17").toISOString()).toBe("2026-10-18T17:00:00.000Z");
    expect(matchDayStart("2026-10-17").toISOString()).toBe("2026-10-16T17:00:00.000Z");
  });
  it("seasonOf và lastMatchDayOfSeason", () => {
    expect(seasonOf("2026-10-31")).toBe("2026-10");
    expect(lastMatchDayOfSeason("2026-10")).toBe("2026-10-31"); // 31/10/2026 là thứ 7
    expect(lastMatchDayOfSeason("2026-11")).toBe("2026-11-28");
  });
  it("isPastMatchDay", () => {
    expect(isPastMatchDay("2026-10-17", new Date("2026-10-18T16:59:59Z"))).toBe(false);
    expect(isPastMatchDay("2026-10-17", new Date("2026-10-18T17:00:00Z"))).toBe(true);
  });
});
