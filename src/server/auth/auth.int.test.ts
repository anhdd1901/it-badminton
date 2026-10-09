import { eq } from "drizzle-orm";
import { describe, expect, it } from "vitest";
import { authSessions, loginAttempts, members } from "../db/schema";
import { MESSAGES, resultConflict } from "../errors";
import { makeMember, TEST_PASSWORD, useTestDb, vn } from "../test/db";
import { login } from "./login";
import { createSession, resolveSession, revokeSessions } from "./sessions";

describe("auth", () => {
  const t = useTestDb();

  it("đăng nhập đúng tạo phiên dùng được", async () => {
    await makeMember(t.db, { username: "minh.nt" });
    const r = await login(t.db, { username: " Minh.NT ", password: TEST_PASSWORD }, vn("2026-10-14T10:00"));
    if (!r.ok) throw new Error(r.message);
    expect((await resolveSession(t.db, r.token, vn("2026-10-14T10:01")))?.memberId).toBe(r.actor.memberId);
  });
  it("sai mật khẩu và khóa sau 5 lần", async () => {
    await makeMember(t.db, { username: "minh.nt" });
    const bad = { username: "minh.nt", password: "sai-mat-khau" };
    for (let i = 0; i < 4; i++)
      expect(await login(t.db, bad, vn("2026-10-14T10:00"))).toEqual({ ok: false, message: MESSAGES.badLogin });
    expect(await login(t.db, bad, vn("2026-10-14T10:00"))).toEqual({ ok: false, message: MESSAGES.loginLocked });
    expect(await login(t.db, { username: "minh.nt", password: TEST_PASSWORD }, vn("2026-10-14T10:14"))).toEqual({
      ok: false,
      message: MESSAGES.loginLocked,
    });
    expect((await login(t.db, { username: "minh.nt", password: TEST_PASSWORD }, vn("2026-10-14T10:15"))).ok).toBe(
      true,
    );
  });
  it("khóa không bị vượt qua khi đăng nhập song song", async () => {
    await makeMember(t.db, { username: "minh.nt" });
    const now = vn("2026-10-14T10:00");
    const bad = { username: "minh.nt", password: "sai-mat-khau" };
    const results = await Promise.all(Array.from({ length: 10 }, () => login(t.db, bad, now)));
    const messages = results.map((r) => (r.ok ? "ok" : r.message));
    expect(messages.filter((m) => m === MESSAGES.badLogin).length).toBeLessThanOrEqual(5);
    expect(messages.filter((m) => m === MESSAGES.loginLocked).length).toBeGreaterThanOrEqual(5);
    expect(await login(t.db, { username: "minh.nt", password: TEST_PASSWORD }, now)).toEqual({
      ok: false,
      message: MESSAGES.loginLocked,
    });
  });
  it("mem đã ngưng không đăng nhập được và phiên cũ vô hiệu", async () => {
    const m = await makeMember(t.db, { username: "a.b" });
    const r = await login(t.db, { username: "a.b", password: TEST_PASSWORD }, vn("2026-10-14T10:00"));
    await t.db.update(members).set({ active: false }).where(eq(members.id, m.id));
    if (!r.ok) throw new Error();
    expect(await resolveSession(t.db, r.token, vn("2026-10-14T10:01"))).toBeNull();
    expect(await login(t.db, { username: "a.b", password: TEST_PASSWORD }, vn("2026-10-14T10:02"))).toEqual({
      ok: false,
      message: MESSAGES.badLogin,
    });
  });
  it("revokeSessions giữ phiên được trừ ra", async () => {
    const m = await makeMember(t.db);
    const s1 = await createSession(t.db, m.id, vn("2026-10-14T10:00"));
    const s2 = await createSession(t.db, m.id, vn("2026-10-14T10:00"));
    await revokeSessions(t.db, m.id, s1.sessionId);
    expect(await resolveSession(t.db, s1.token, vn("2026-10-14T10:01"))).not.toBeNull();
    expect(await resolveSession(t.db, s2.token, vn("2026-10-14T10:01"))).toBeNull();
  });
  it("token không lưu dạng rõ", async () => {
    const m = await makeMember(t.db);
    const s = await createSession(t.db, m.id, vn("2026-10-14T10:00"));
    const rows = await t.db.select().from(authSessions);
    expect(rows[0].tokenHash).not.toBe(s.token);
    expect(rows[0].tokenHash).toMatch(/^[0-9a-f]{64}$/);
  });
  it("resultConflict", () => expect(resultConflict(21, 17)).toBe("Trận này vừa được nhập 21–17, hãy tải lại"));
  it("username sai định dạng: báo sai, không ghi bảng login_attempts", async () => {
    for (const username of ["ab", "đức", "x y", "a".repeat(31)])
      expect(await login(t.db, { username, password: "sai-mat-khau" }, vn("2026-10-14T10:00"))).toEqual({
        ok: false,
        message: MESSAGES.badLogin,
      });
    expect(await t.db.select().from(loginAttempts)).toHaveLength(0);
  });
});
