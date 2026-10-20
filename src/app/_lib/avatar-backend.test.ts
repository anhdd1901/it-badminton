import { describe, expect, it } from "vitest";
import { avatarBackend } from "./avatar-backend";

describe("avatarBackend", () => {
  it("dùng token khi có BLOB_READ_WRITE_TOKEN", () => {
    expect(avatarBackend({ BLOB_READ_WRITE_TOKEN: "t", VERCEL: "1" })).toEqual({
      kind: "blob",
      token: "t",
    });
    expect(avatarBackend({ BLOB_READ_WRITE_TOKEN: "t" })).toEqual({ kind: "blob", token: "t" });
  });

  it("token được ưu tiên hơn BLOB_STORE_ID", () => {
    expect(avatarBackend({ BLOB_READ_WRITE_TOKEN: "t", BLOB_STORE_ID: "store_x" })).toEqual({
      kind: "blob",
      token: "t",
    });
  });

  it("không có token mà có BLOB_STORE_ID thì để SDK xác thực bằng OIDC", () => {
    expect(avatarBackend({ BLOB_STORE_ID: "store_x", VERCEL: "1" })).toEqual({
      kind: "blob",
      token: undefined,
    });
  });

  it("chạy ở máy không có biến Blob thì lưu trên đĩa", () => {
    expect(avatarBackend({})).toEqual({ kind: "local" });
  });

  it("chạy trên Vercel mà thiếu cả hai thì báo lỗi cấu hình", () => {
    expect(avatarBackend({ VERCEL: "1" })).toEqual({ kind: "misconfigured" });
  });

  it("bỏ qua giá trị rỗng", () => {
    expect(avatarBackend({ BLOB_READ_WRITE_TOKEN: "", BLOB_STORE_ID: "", VERCEL: "1" })).toEqual({
      kind: "misconfigured",
    });
    expect(avatarBackend({ BLOB_READ_WRITE_TOKEN: "", BLOB_STORE_ID: "" })).toEqual({
      kind: "local",
    });
  });
});
