import path from "node:path";
import sharp from "sharp";
import { describe, expect, it } from "vitest";
import manifest from "./manifest";

const EXPECTED = [
  { src: "/icons/icon-192.png", sizes: "192x192", size: 192 },
  { src: "/icons/icon-512.png", sizes: "512x512", size: 512 },
  { src: "/icons/icon-maskable-512.png", sizes: "512x512", size: 512, purpose: "maskable" },
];

describe("manifest", () => {
  it("khai báo đủ icon PWA và các file có đúng kích thước", async () => {
    const icons = manifest().icons ?? [];
    expect(icons).toHaveLength(3);
    for (const e of EXPECTED) {
      const icon = icons.find((i) => i.src === e.src);
      expect(icon, e.src).toBeDefined();
      expect(icon?.sizes).toBe(e.sizes);
      expect(icon?.type).toBe("image/png");
      if (e.purpose) expect(icon?.purpose).toBe(e.purpose);
      const meta = await sharp(path.join("public", e.src)).metadata();
      expect([meta.width, meta.height]).toEqual([e.size, e.size]);
    }
  });

  it("tên app là ANH EM IT", () => {
    expect(manifest()).toMatchObject({ name: "ANH EM IT", short_name: "ANH EM IT" });
  });
});
