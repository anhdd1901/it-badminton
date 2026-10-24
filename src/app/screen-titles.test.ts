import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

// Spec 8.1: tiêu đề màn dùng font hiển thị (Barlow Condensed, chỉ có nghiêng đậm).
const SCREENS = [
  "src/app/(app)/xep-hang/page.tsx",
  "src/app/(app)/thong-ke/page.tsx",
  "src/app/(app)/lich-su/page.tsx",
  "src/app/(app)/lich-su/[ngay]/page.tsx",
  "src/app/(app)/toi/quan-ly-mem/page.tsx",
];

describe("tiêu đề màn", () => {
  it.each(SCREENS)("%s: h1 dùng font-display italic font-bold", (file) => {
    const src = readFileSync(file, "utf8");
    expect(src).toMatch(
      /<h1 className="(?=[^"]*\bfont-display\b)(?=[^"]*\bitalic\b)(?=[^"]*\bfont-bold\b)/,
    );
  });
});
