import { describe, expect, it } from "vitest";
import { directUrl, shouldMigrate } from "./deploy-env";

describe("shouldMigrate", () => {
  it("chỉ chạy migration ở production", () => {
    expect(shouldMigrate({ VERCEL_ENV: "production" })).toBe(true);
    expect(shouldMigrate({ VERCEL_ENV: "preview" })).toBe(false);
    expect(shouldMigrate({ VERCEL_ENV: "development" })).toBe(false);
    expect(shouldMigrate({})).toBe(false);
  });
});

describe("directUrl", () => {
  it("ưu tiên kết nối trực tiếp", () => {
    expect(directUrl({ DATABASE_URL_UNPOOLED: "a", DATABASE_URL: "b" })).toBe("a");
  });
  it("dùng DATABASE_URL khi không có bản trực tiếp", () => {
    expect(directUrl({ DATABASE_URL: "b" })).toBe("b");
    expect(directUrl({ DATABASE_URL_UNPOOLED: "", DATABASE_URL: "b" })).toBe("b");
  });
  it("báo lỗi khi thiếu cả hai", () => {
    expect(() => directUrl({})).toThrow("Thiếu DATABASE_URL");
  });
});
