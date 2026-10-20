import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { contrastRatio } from "./contrast";

const css = readFileSync(new URL("../app/globals.css", import.meta.url), "utf8");
const rootBlock = /:root\s*{([^}]*)}/.exec(css)?.[1] ?? "";
const tokens = new Map<string, [light: string, dark: string]>();
for (const m of rootBlock.matchAll(
  /--([\w-]+):\s*light-dark\(\s*(#[0-9a-fA-F]{6})\s*,\s*(#[0-9a-fA-F]{6})\s*\)\s*;/g,
)) {
  tokens.set(m[1], [m[2].toUpperCase(), m[3].toUpperCase()]);
}
function token(name: string, theme: "light" | "dark"): string {
  const v = tokens.get(name);
  if (!v) throw new Error(`Thiếu token --${name}`);
  return theme === "light" ? v[0] : v[1];
}

const PAIRS: [fg: string, bg: string][] = [
  ["text", "bg"],
  ["text", "surface"],
  ["text", "surface-2"],
  ["text-2", "bg"],
  ["text-2", "surface"],
  ["text-2", "surface-2"],
  ["on-accent", "accent"],
  ["accent-text", "bg"],
  ["accent-text", "surface"],
  ["seed-1", "surface"],
  ["seed-2", "surface"],
  ["win", "surface"],
  ["loss", "surface"],
  ["danger", "bg"],
  ["danger", "surface"],
];

describe("token màu (spec 8.1)", () => {
  it.each(["light", "dark"] as const)("mọi cặp chữ/nền đạt 4,5:1 ở theme %s", (theme) => {
    for (const [fg, bg] of PAIRS) {
      expect(
        contrastRatio(token(fg, theme), token(bg, theme)),
        `${fg}/${bg}`,
      ).toBeGreaterThanOrEqual(4.5);
    }
  });

  it("giá trị khớp spec 8.1", () => {
    const expected: Record<string, [light: string, dark: string]> = {
      bg: ["#F4F4F5", "#111111"],
      surface: ["#FFFFFF", "#1C1C1C"],
      "surface-2": ["#EDEDED", "#222222"],
      border: ["#E0E0E0", "#333333"],
      text: ["#111111", "#FDFDFD"],
      "text-2": ["#5C5C5C", "#AAAAAA"],
      accent: ["#FF6B00", "#FF6B00"],
      "on-accent": ["#111111", "#111111"],
      "seed-1": ["#1F5BD0", "#6EA0FF"],
      "seed-2": ["#13804B", "#4CC98A"],
      win: ["#111111", "#FDFDFD"],
      loss: ["#6B6B6B", "#8A8A8A"],
      danger: ["#C62828", "#FF5C5C"],
    };
    for (const [name, [light, dark]] of Object.entries(expected)) {
      expect(token(name, "light"), `${name} sáng`).toBe(light);
      expect(token(name, "dark"), `${name} tối`).toBe(dark);
    }
    expect(token("accent-text", "dark")).toBe("#FF6B00");
    expect(tokens.size).toBe(14);
  });

  it("contrastRatio đúng công thức WCAG", () => {
    expect(contrastRatio("#FFFFFF", "#000000")).toBeCloseTo(21, 5);
    expect(contrastRatio("#777777", "#FFFFFF")).toBeCloseTo(4.48, 2);
  });
});
