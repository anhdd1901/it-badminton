import { mkdtemp, readdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import sharp from "sharp";
import { describe, expect, it } from "vitest";
import { MESSAGES } from "../errors";
import { localAvatarStore } from "./avatar-store";
import { MAX_AVATAR_BYTES, processAvatar } from "./avatar";

const solid = (w: number, h: number) => ({
  create: { width: w, height: h, channels: 3 as const, background: "#3366cc" },
});

describe("processAvatar", () => {
  it("PNG 800x600 thành webp 256x256", async () => {
    const png = await sharp(solid(800, 600)).png().toBuffer();
    const out = await processAvatar(png);
    const meta = await sharp(out).metadata();
    expect(meta).toMatchObject({ format: "webp", width: 256, height: 256 });
  });

  it("JPG 300x100 có EXIF: xoay theo orientation, bỏ metadata", async () => {
    const jpg = await sharp(solid(300, 100))
      .jpeg()
      .withMetadata({ orientation: 6, exif: { IFD0: { Copyright: "x" } } })
      .toBuffer();
    expect((await sharp(jpg).metadata()).exif).toBeDefined();
    const meta = await sharp(await processAvatar(jpg)).metadata();
    expect(meta).toMatchObject({ format: "webp", width: 256, height: 256 });
    expect(meta.exif).toBeUndefined();
    expect(meta.orientation).toBeUndefined();
  });

  it("GIF bị từ chối", async () => {
    const gif = await sharp(solid(20, 20)).gif().toBuffer();
    await expect(processAvatar(gif)).rejects.toMatchObject({
      code: "VALIDATION",
      message: MESSAGES.avatarFormat,
    });
  });

  it("ảnh định dạng heif (AVIF/HEIC dùng cùng container) bị từ chối", async () => {
    const avif = await sharp(solid(20, 20)).avif().toBuffer();
    expect((await sharp(avif).metadata()).format).toBe("heif");
    await expect(processAvatar(avif)).rejects.toMatchObject({
      code: "VALIDATION",
      message: MESSAGES.avatarFormat,
    });
  });

  it("dữ liệu không phải ảnh bị từ chối", async () => {
    await expect(processAvatar(Buffer.from("hello"))).rejects.toMatchObject({
      code: "VALIDATION",
      message: MESSAGES.avatarFormat,
    });
  });

  it("ảnh hỏng (cắt cụt) bị từ chối", async () => {
    const png = await sharp(solid(800, 600)).png().toBuffer();
    await expect(processAvatar(png.subarray(0, 40))).rejects.toMatchObject({
      code: "VALIDATION",
      message: MESSAGES.avatarFormat,
    });
  });

  it("quá 5 MB bị từ chối trước khi gọi sharp", async () => {
    const big = new Uint8Array(MAX_AVATAR_BYTES + 1);
    await expect(processAvatar(big)).rejects.toMatchObject({
      code: "VALIDATION",
      message: MESSAGES.avatarTooLarge,
    });
  });

  it("đúng 5 MB không bị chặn vì kích thước (lỗi định dạng thay vì quá lớn)", async () => {
    await expect(processAvatar(new Uint8Array(MAX_AVATAR_BYTES))).rejects.toMatchObject({
      message: MESSAGES.avatarFormat,
    });
  });

  it("ảnh 10000x10000 vượt giới hạn điểm ảnh", async () => {
    const png = await sharp(solid(10000, 10000)).png().toBuffer();
    expect(png.length).toBeLessThan(MAX_AVATAR_BYTES);
    await expect(processAvatar(png)).rejects.toMatchObject({
      code: "VALIDATION",
      message: MESSAGES.avatarFormat,
    });
  });
});

describe("localAvatarStore", () => {
  it("put ghi file uuid.webp và remove xóa nó", async () => {
    const dir = await mkdtemp(path.join(tmpdir(), "avatar-"));
    try {
      const store = localAvatarStore(dir, "/avatars");
      const url = await store.put(Buffer.from("x"));
      expect(url).toMatch(/^\/avatars\/[0-9a-f-]{36}\.webp$/);
      expect(await readdir(dir)).toHaveLength(1);
      await store.remove(url);
      expect(await readdir(dir)).toHaveLength(0);
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  it("remove với đường dẫn lạ không xóa gì", async () => {
    const dir = await mkdtemp(path.join(tmpdir(), "avatar-"));
    try {
      await writeFile(path.join(dir, "keep.txt"), "k");
      const store = localAvatarStore(path.join(dir, "sub"), "/avatars");
      await store.put(Buffer.from("x"));
      await writeFile(path.join(dir, "secret.webp"), "s");
      for (const bad of [
        "../../etc/passwd",
        "/avatars/../secret.webp",
        "/avatars/..%2Fsecret.webp",
        "/avatars/keep.txt",
        "",
      ])
        await store.remove(bad);
      expect(await readdir(dir)).toEqual(expect.arrayContaining(["keep.txt", "secret.webp"]));
      expect(await readdir(path.join(dir, "sub"))).toHaveLength(1);
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });
});
