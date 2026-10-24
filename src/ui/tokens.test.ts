import { existsSync, readFileSync } from "node:fs";
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
  ["text", "highlight"],
  ["text-2", "highlight"],
  ["win", "highlight"],
  ["loss", "highlight"],
  ["on-chrome", "chrome"],
  ["chrome-active", "chrome"],
  ["line", "surface"],
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
      bg: ["#E9E9E9", "#111111"],
      surface: ["#FDFDFD", "#222222"],
      "surface-2": ["#F0F0F0", "#333333"],
      border: ["#D6D6D6", "#333333"],
      text: ["#111111", "#FDFDFD"],
      "text-2": ["#555555", "#AAAAAA"],
      accent: ["#FF6B00", "#FF6B00"],
      "on-accent": ["#111111", "#111111"],
      "accent-text": ["#A84300", "#FF8A00"],
      "seed-1": ["#0066DD", "#4D9FFF"],
      "seed-2": ["#B0306E", "#FFA3CF"],
      win: ["#111111", "#FDFDFD"],
      loss: ["#5E5E5E", "#A6A6A6"],
      danger: ["#C62828", "#FF9A90"],
      highlight: ["#FFE0CC", "#4A2A14"],
      line: ["#6E6E6E", "#E6E6E6"],
      chrome: ["#181818", "#181818"],
      "on-chrome": ["#FDFDFD", "#FDFDFD"],
      "chrome-active": ["#FF6B00", "#FF6B00"],
    };
    for (const [name, [light, dark]] of Object.entries(expected)) {
      expect(token(name, "light"), `${name} sáng`).toBe(light);
      expect(token(name, "dark"), `${name} tối`).toBe(dark);
    }
    expect(tokens.size).toBe(19);
  });

  it("select và popover không dùng màu nhấn --accent cho hover", () => {
    for (const f of ["select.tsx", "popover.tsx"]) {
      const path = new URL(`../components/ui/${f}`, import.meta.url);
      expect(existsSync(path), f).toBe(true);
      const src = readFileSync(path, "utf8");
      expect(src, f).not.toContain("bg-accent");
      expect(src, f).not.toContain("text-accent-foreground");
    }
  });

  it("contrastRatio đúng công thức WCAG", () => {
    expect(contrastRatio("#FFFFFF", "#000000")).toBeCloseTo(21, 5);
    expect(contrastRatio("#777777", "#FFFFFF")).toBeCloseTo(4.48, 2);
  });
});
