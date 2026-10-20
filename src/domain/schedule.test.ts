import { describe, expect, it } from "vitest";
import { seededRng } from "./rng";
import { attendeeKey, generateSchedule, noDiagramMessage } from "./schedule";

describe("schedule", () => {
  it("attendeeKey bỏ trùng và không phụ thuộc thứ tự", () =>
    expect(attendeeKey(["c", "a", "b", "a"])).toBe(attendeeKey(["a", "b", "c"])));
  it("dưới 5 người", () =>
    expect(generateSchedule([{ id: "a", seed: 1 }], seededRng(1))).toEqual({
      ok: false,
      error: "NOT_ENOUGH",
      count: 1,
    }));
  it("thiếu sơ đồ", () => {
    const seven = ["a", "b", "c", "d", "e", "f", "g"].map((id) => ({ id, seed: 2 as const }));
    expect(generateSchedule(seven, seededRng(1))).toEqual({
      ok: false,
      error: "NO_DIAGRAM",
      seed1: 0,
      seed2: 7,
    });
    expect(noDiagramMessage(0, 7)).toBe(
      "Chưa có sơ đồ cho 0 Hạt giống 1 + 7 Hạt giống 2, liên hệ admin",
    );
  });
  it("7 người 3+4: Hạt giống 1 ở vị trí 1–3, mỗi người 4 trận, lặp lại được với cùng seed", () => {
    const att = [
      ...["a", "b", "c"].map((id) => ({ id, seed: 1 as const })),
      ...["d", "e", "f", "g"].map((id) => ({ id, seed: 2 as const })),
    ];
    const r1 = generateSchedule(att, seededRng(42));
    const r2 = generateSchedule(att, seededRng(42));
    expect(r1).toEqual(r2);
    if (!r1.ok) throw new Error();
    expect(r1.schedule.diagramId).toBe("7-3-4");
    for (const a of r1.schedule.assignments)
      expect(a.seed === 1 ? a.slot <= 3 : a.slot >= 5 && a.slot <= 8).toBe(true);
    const counts = new Map<string, number>();
    r1.schedule.matches.forEach((mt) =>
      [...mt.teamA, ...mt.teamB].forEach((id) => counts.set(id, (counts.get(id) ?? 0) + 1)),
    );
    expect([...counts.values()]).toEqual(Array(7).fill(4));
  });
  it("5 người bỏ qua hạt giống", () => {
    const five = ["a", "b", "c", "d", "e"].map((id, i) => ({ id, seed: (i < 4 ? 1 : 2) as 1 | 2 }));
    const r = generateSchedule(five, seededRng(7));
    expect(r.ok && r.schedule.diagramId).toBe("5");
  });
  it("cùng id khác hạt giống thì ném lỗi; cùng id cùng hạt giống thì bỏ trùng", () => {
    const base = ["a", "b", "c", "d", "e"].map((id) => ({ id, seed: 1 as const }));
    expect(() => generateSchedule([...base, { id: "a", seed: 2 }], seededRng(1))).toThrow(
      "Mem a xuất hiện nhiều lần với hạt giống khác nhau",
    );
    const r = generateSchedule([...base, { id: "a", seed: 1 }], seededRng(1));
    expect(r.ok && r.schedule.assignments).toHaveLength(5);
  });
});
