import { existsSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const dir = join(process.cwd(), "src/fonts/barlow-condensed");
const ttfs = ["BarlowCondensed-SemiBoldItalic.ttf", "BarlowCondensed-BoldItalic.ttf"];

describe("Barlow Condensed", () => {
  it("có đủ file font và giấy phép", () => {
    for (const f of [...ttfs, "OFL.txt"]) expect(existsSync(join(dir, f))).toBe(true);
  });

  it("file font là bản đầy đủ (có glyph tiếng Việt), không phải bản cắt latin", () => {
    for (const f of ttfs) expect(statSync(join(dir, f)).size).toBeGreaterThan(60 * 1024);
  });

  it("globals.css khai báo font-display và tiện ích net", () => {
    const css = readFileSync(join(process.cwd(), "src/app/globals.css"), "utf8");
    expect(css).toContain("--font-display: var(--font-barlow-condensed)");
    expect(css).toContain("@utility net");
  });

  it("layout.tsx khai báo biến font", () => {
    const tsx = readFileSync(join(process.cwd(), "src/app/layout.tsx"), "utf8");
    expect(tsx).toContain('variable: "--font-barlow-condensed"');
  });
});
