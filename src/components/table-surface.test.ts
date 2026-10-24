import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

// The sticky first column is bg-surface; the scroll wrapper must be too, otherwise the
// sticky cell shows as a band against the page background when the table scrolls.
const TABLES = [
  "src/components/ranking/season-table.tsx",
  "src/components/ranking/elo-table.tsx",
  "src/components/stats/member-stats-table.tsx",
  "src/components/stats/pair-stats-table.tsx",
];

describe("bảng cuộn ngang", () => {
  it.each(TABLES)("%s: khung cuộn cùng nền bg-surface với cột dính", (file) => {
    const src = readFileSync(file, "utf8");
    expect(src).toMatch(/className="overflow-x-auto[^"]*\bbg-surface\b/);
  });
});
