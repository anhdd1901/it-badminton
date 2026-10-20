import { describe, expect, it, vi } from "vitest";
import { MESSAGES } from "../errors";
import { makeMember, TEST_PASSWORD, useTestDb, vn } from "../test/db";
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

  it("mem đã ngưng với mật khẩu đúng vẫn chạy verifyPassword một lần", async () => {
    const m = await makeMember(t.db, { username: "da.ngung", active: false });
    vi.mocked(verifyPassword).mockClear();
    const r = await login(
      t.db,
      { username: m.username, password: TEST_PASSWORD },
      vn("2026-10-14T10:00"),
    );
    expect(r).toEqual({ ok: false, message: MESSAGES.badLogin });
    expect(verifyPassword).toHaveBeenCalledTimes(1);
  });
});
