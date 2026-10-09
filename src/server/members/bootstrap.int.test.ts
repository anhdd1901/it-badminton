import { eq } from "drizzle-orm";
import { describe, expect, it } from "vitest";
import { login } from "../auth/login";
import { createSession, resolveSession } from "../auth/sessions";
import { members } from "../db/schema";
import { MESSAGES } from "../errors";
import { makeMember, TEST_PASSWORD, useTestDb, vn } from "../test/db";
import { createFirstAdmin, resetPasswordByUsername } from "./bootstrap";

describe("admin bootstrap", () => {
  const t = useTestDb();
  const now = vn("2026-10-14T10:00");

  it("tạo admin đầu tiên với ELO đã nhập; lần hai bị chặn", async () => {
    const { id } = await createFirstAdmin(
      t.db,
      { username: "Boss", displayName: "Sếp", password: "matkhau123", initialElo: "1100,5" },
      now,
    );
    const [row] = await t.db.select().from(members).where(eq(members.id, id));
    expect(row).toMatchObject({ username: "boss", role: "admin", active: true, initialEloTenths: 11005 });
    await expect(
      createFirstAdmin(t.db, { username: "boss2", displayName: "B", password: "matkhau123", initialElo: 1000 }, now),
    ).rejects.toMatchObject({ code: "VALIDATION", message: "Đã có admin, dùng chức năng chuyển quyền trong app" });
  });

  it("đặt lại mật khẩu: đăng nhập được bằng mật khẩu mới, phiên cũ bị thu hồi", async () => {
    const m = await makeMember(t.db, { username: "minh.nt" });
    const { token } = await createSession(t.db, m.id, now);
    await resetPasswordByUsername(t.db, "Minh.NT", "matkhaumoi99");
    expect(await resolveSession(t.db, token, now)).toBeNull();
    expect((await login(t.db, { username: "minh.nt", password: "matkhaumoi99" }, now)).ok).toBe(true);
    expect((await login(t.db, { username: "minh.nt", password: TEST_PASSWORD }, now)).ok).toBe(false);
  });

  it("username không tồn tại → NOT_FOUND; mật khẩu ngắn → VALIDATION", async () => {
    await expect(resetPasswordByUsername(t.db, "khong.co", "matkhaumoi99")).rejects.toMatchObject({
      code: "NOT_FOUND",
      message: MESSAGES.memberNotFound,
    });
    await makeMember(t.db, { username: "a.b" });
    await expect(resetPasswordByUsername(t.db, "a.b", "ngan")).rejects.toMatchObject({ code: "VALIDATION" });
  });
});
