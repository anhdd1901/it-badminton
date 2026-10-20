import { describe, expect, it, vi } from "vitest";
import { MESSAGES } from "../errors";
import { useTestDb, vn } from "../test/db";
import { login } from "./login";
import { verifyPassword } from "./password";

vi.mock("./password", async (orig) => {
  const m = await orig<typeof import("./password")>();
  return { ...m, verifyPassword: vi.fn(m.verifyPassword) };
});

describe("login timing", () => {
  const t = useTestDb();

  it("username không tồn tại vẫn chạy verifyPassword", async () => {
    vi.mocked(verifyPassword).mockClear();
    const r = await login(
      t.db,
      { username: "khong.co", password: "mat-khau-bat-ky" },
      vn("2026-10-14T10:00"),
    );
    expect(r).toEqual({ ok: false, message: MESSAGES.badLogin });
    expect(verifyPassword).toHaveBeenCalledTimes(1);
  });
});
