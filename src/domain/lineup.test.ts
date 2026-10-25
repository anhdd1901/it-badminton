import { describe, expect, it } from "vitest";
import { checkLineup } from "./lineup";

describe("checkLineup", () => {
  const roster = new Set(["a", "b", "c", "d", "e"]);

  it("4 người khác nhau trong lịch: hợp lệ", () =>
    expect(checkLineup({ teamA: ["a", "b"], teamB: ["c", "e"] }, roster)).toBe(true));
  it("trùng người trong cùng cặp", () =>
    expect(checkLineup({ teamA: ["a", "a"], teamB: ["c", "d"] }, roster)).toBe(false));
  it("trùng người khác cặp", () =>
    expect(checkLineup({ teamA: ["a", "b"], teamB: ["b", "d"] }, roster)).toBe(false));
  it("người ngoài lịch", () =>
    expect(checkLineup({ teamA: ["a", "b"], teamB: ["c", "x"] }, roster)).toBe(false));
});
