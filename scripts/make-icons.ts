import { mkdirSync } from "node:fs";
import path from "node:path";
import sharp from "sharp";

const BG = "#111111";
const ACCENT = "#FF6B00";
const FONT_FILE = path.resolve("src/fonts/be-vietnam-pro/BeVietnamPro-Bold.ttf");

/** "AE" in Be Vietnam Pro Bold, orange on near-black; `textShare` = text width / icon width. */
async function makeIcon(size: number, textShare: number, out: string): Promise<void> {
  const textWidth = Math.round(size * textShare);
  const text = await sharp({
    text: {
      text: `<span foreground="${ACCENT}">AE</span>`,
      font: "Be Vietnam Pro Bold",
      fontfile: FONT_FILE,
      width: textWidth,
      height: Math.round(textWidth * 0.62),
      rgba: true,
      align: "center",
    },
  })
    .png()
    .toBuffer();
  mkdirSync(path.dirname(out), { recursive: true });
  await sharp({ create: { width: size, height: size, channels: 4, background: BG } })
    .composite([{ input: text, gravity: "centre" }])
    .png()
    .toFile(out);
  console.log(`Đã tạo ${out}`);
}

async function main(): Promise<void> {
  await makeIcon(192, 0.55, "public/icons/icon-192.png");
  await makeIcon(512, 0.55, "public/icons/icon-512.png");
  // Maskable icons may be cropped to a circle: keep the text inside the central safe zone.
  await makeIcon(512, 0.4, "public/icons/icon-maskable-512.png");
  await makeIcon(180, 0.55, "src/app/apple-icon.png");
  await makeIcon(32, 0.7, "src/app/icon.png");
}

main().catch((e: unknown) => {
  console.error(e);
  process.exit(1);
});
