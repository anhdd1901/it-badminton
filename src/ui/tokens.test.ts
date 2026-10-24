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
      bg: ["#F2F5F0", "#0F3D2E"],
      surface: ["#FFFFFF", "#164A39"],
      "surface-2": ["#E3ECE5", "#1D5644"],
      border: ["#CFDDD4", "#2A6450"],
      text: ["#0D2B21", "#F7F3E6"],
      "text-2": ["#4A5F55", "#B7C8BE"],
      accent: ["#0F3D2E", "#E4F23A"],
      "on-accent": ["#E4F23A", "#0F3D2E"],
      "accent-text": ["#0F6B47", "#E4F23A"],
      "seed-1": ["#1F5BD0", "#9CC8FF"],
      "seed-2": ["#B0306E", "#FFA3CF"],
      win: ["#0D2B21", "#F7F3E6"],
      loss: ["#5E6E66", "#A9BDB2"],
      danger: ["#C62828", "#FF9A90"],
      highlight: ["#F1F7CF", "#2C4A1C"],
      line: ["#1A6B4B", "#DCE6DF"],
      chrome: ["#0F3D2E", "#0A2E22"],
      "on-chrome": ["#F7F3E6", "#F7F3E6"],
      "chrome-active": ["#E4F23A", "#E4F23A"],
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
