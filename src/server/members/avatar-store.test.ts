import { beforeEach, describe, expect, it, vi } from "vitest";

const put = vi.fn();
const del = vi.fn();
vi.mock("@vercel/blob", () => ({
  put: (...a: unknown[]) => put(...a),
  del: (...a: unknown[]) => del(...a),
}));

import { blobAvatarStore } from "./avatar-store";

beforeEach(() => {
  put
    .mockReset()
    .mockResolvedValue({ url: "https://x.public.blob.vercel-storage.com/avatars/a.webp" });
  del.mockReset().mockResolvedValue(undefined);
});

describe("blobAvatarStore", () => {
  it("truyền token khi có", async () => {
    const store = blobAvatarStore("tok");
    await store.put(Buffer.from("x"));
    await store.remove("https://x.public.blob.vercel-storage.com/avatars/a.webp");
    expect(put.mock.calls[0][2]).toMatchObject({
      access: "public",
      contentType: "image/webp",
      token: "tok",
    });
    expect(del.mock.calls[0][1]).toEqual({ token: "tok" });
  });

  it("không truyền token khi dùng OIDC (SDK tự lấy từ môi trường)", async () => {
    const store = blobAvatarStore(undefined);
    await store.put(Buffer.from("x"));
    await store.remove("https://x.public.blob.vercel-storage.com/avatars/a.webp");
    expect(put.mock.calls[0][2]).not.toHaveProperty("token");
    expect(del.mock.calls[0][1]).not.toHaveProperty("token");
  });
});
