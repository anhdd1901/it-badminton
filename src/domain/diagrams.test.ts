import { describe, expect, it } from "vitest";
import { DIAGRAMS, findDiagram, validateDiagram, type Diagram } from "./diagrams";

describe("diagrams", () => {
  it("có đúng 16 sơ đồ", () => expect(DIAGRAMS).toHaveLength(16));
  it.each(DIAGRAMS.map((d) => [d.id, d] as const))("sơ đồ %s hợp lệ", (_id, d) =>
    expect(validateDiagram(d)).toEqual([]),
  );
  it("validateDiagram bắt lỗi", () => {
    const bad: Diagram = {
      id: "x",
      seed1: null,
      seed2: null,
      matches: [
        [
          [1, 1],
          [2, 3],
        ],
      ],
    };
    expect(validateDiagram(bad).length).toBeGreaterThan(0);
  });
  it("findDiagram", () => {
    expect(findDiagram(5, 3, 2)?.id).toBe("5");
    expect(findDiagram(7, 3, 4)?.id).toBe("7-3-4");
    expect(findDiagram(7, 0, 7)).toBeNull();
    expect(findDiagram(4, 2, 2)).toBeNull();
  });
  it("trận 1 của 10-4-6 là 1+3 / 2+4", () =>
    expect(findDiagram(10, 4, 6)?.matches[0]).toEqual([
      [1, 3],
      [2, 4],
    ]));
});
