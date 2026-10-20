import { eq } from "drizzle-orm";
import { describe, expect, it } from "vitest";
import type { Role } from "@/domain/types";
import type { Actor } from "../actor";
import { login } from "../auth/login";
import { createSession, resolveSession } from "../auth/sessions";
import { members } from "../db/schema";
import { MESSAGES } from "../errors";
import { makeMember, TEST_PASSWORD, useTestDb, vn } from "../test/db";
import {
  changeOwnPassword,
  changeUsername,
  createMember,
  resetPassword,
  updateDisplayName,
} from "./profile";

describe("member profile", () => {
  const t = useTestDb();
  const actorOf = (m: { id: string; role: Role }): Actor => ({
    memberId: m.id,
    role: m.role,
    sessionId: "s",
  });

  it("admin tạo mem; username trùng bị chặn không phân biệt hoa thường", async () => {
    const admin = actorOf(await makeMember(t.db, { role: "admin" }));
    await createMember(
      t.db,
      admin,
      { username: "Minh.NT", displayName: "Minh", password: "matkhau123", initialElo: "1012,5" },
      vn("2026-10-14T10:00"),
    );
    const row = (await t.db.select().from(members).where(eq(members.username, "minh.nt")))[0];
    expect(row).toMatchObject({
      displayName: "Minh",
      initialEloTenths: 10125,
      role: "member",
      active: true,
    });
    await expect(
      createMember(
        t.db,
        admin,
        { username: " MINH.nt", displayName: "X", password: "matkhau123", initialElo: 1000 },
        vn("2026-10-14T10:00"),
      ),
    ).rejects.toMatchObject({ code: "CONFLICT", message: MESSAGES.usernameTaken });
  });

  it("hai lần tạo đồng thời cùng username: một thành công, một CONFLICT", async () => {
    const admin = actorOf(await makeMember(t.db, { role: "admin" }));
    const input = {
      username: "dong.thoi",
      displayName: "X",
      password: "matkhau123",
      initialElo: 1000,
    };
    const results = await Promise.allSettled([
      createMember(t.db, admin, input, vn("2026-10-14T10:00")),
      createMember(t.db, admin, input, vn("2026-10-14T10:00")),
    ]);
    expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(1);
    const failed = results.find((r) => r.status === "rejected");
    expect(failed).toMatchObject({ reason: { code: "CONFLICT", message: MESSAGES.usernameTaken } });
  });

  it("subadmin và mem không tạo được mem", async () => {
    const sub = actorOf(await makeMember(t.db, { role: "subadmin" }));
    await expect(
      createMember(
        t.db,
        sub,
        { username: "x.y", displayName: "X", password: "matkhau123", initialElo: 1000 },
        vn("2026-10-14T10:00"),
      ),
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("mem tự đổi tên hiển thị, không đổi được của người khác; chỉ admin đổi username", async () => {
    const a = await makeMember(t.db);
    const b = await makeMember(t.db);
    await updateDisplayName(t.db, actorOf(a), a.id, "Tuấn");
    await expect(updateDisplayName(t.db, actorOf(a), b.id, "X")).rejects.toMatchObject({
      code: "FORBIDDEN",
    });
    await expect(changeUsername(t.db, actorOf(a), a.id, "moi.ten")).rejects.toMatchObject({
      code: "FORBIDDEN",
    });
  });

  it("admin đổi username (chuẩn hóa, chặn trùng); mem không tồn tại báo NOT_FOUND", async () => {
    const admin = actorOf(await makeMember(t.db, { role: "admin" }));
    const a = await makeMember(t.db);
    await makeMember(t.db, { username: "da.co" });
    await changeUsername(t.db, admin, a.id, " Moi.Ten ");
    expect((await t.db.select().from(members).where(eq(members.id, a.id)))[0].username).toBe(
      "moi.ten",
    );
    await expect(changeUsername(t.db, admin, a.id, "DA.CO")).rejects.toMatchObject({
      code: "CONFLICT",
      message: MESSAGES.usernameTaken,
    });
    await expect(changeUsername(t.db, admin, a.id, "moi.ten")).resolves.toBeUndefined();
    await expect(
      updateDisplayName(t.db, admin, "00000000-0000-0000-0000-000000000000", "X"),
    ).rejects.toMatchObject({
      code: "NOT_FOUND",
      message: MESSAGES.memberNotFound,
    });
  });

  it("đổi mật khẩu của mình thu hồi phiên khác; admin đặt lại thu hồi mọi phiên", async () => {
    const m = await makeMember(t.db);
    const admin = actorOf(await makeMember(t.db, { role: "admin" }));
    const s1 = await createSession(t.db, m.id, vn("2026-10-14T10:00"));
    const s2 = await createSession(t.db, m.id, vn("2026-10-14T10:00"));
    const me = { memberId: m.id, role: "member" as const, sessionId: s1.sessionId };
    await expect(changeOwnPassword(t.db, me, "sai", "matkhaumoi1")).rejects.toMatchObject({
      code: "VALIDATION",
      message: MESSAGES.wrongPassword,
    });
    await expect(changeOwnPassword(t.db, me, TEST_PASSWORD, "ngan")).rejects.toMatchObject({
      code: "VALIDATION",
      message: "Mật khẩu tối thiểu 8 ký tự",
    });
    await changeOwnPassword(t.db, me, TEST_PASSWORD, "matkhaumoi1");
    expect(await resolveSession(t.db, s1.token, vn("2026-10-14T10:01"))).not.toBeNull();
    expect(await resolveSession(t.db, s2.token, vn("2026-10-14T10:01"))).toBeNull();
    await resetPassword(t.db, admin, m.id, "matkhaumoi2");
    expect(await resolveSession(t.db, s1.token, vn("2026-10-14T10:02"))).toBeNull();
  });

  it("admin đặt lại mật khẩu gỡ khóa đăng nhập", async () => {
    const m = await makeMember(t.db, { username: "minh.nt" });
    const admin = actorOf(await makeMember(t.db, { role: "admin" }));
    const now = vn("2026-10-14T10:00");
    for (let i = 0; i < 5; i++)
      await login(t.db, { username: "minh.nt", password: "sai-mat-khau" }, now);
    expect(await login(t.db, { username: "minh.nt", password: TEST_PASSWORD }, now)).toEqual({
      ok: false,
      message: MESSAGES.loginLocked,
    });
    await resetPassword(t.db, admin, m.id, "matkhaumoi2");
    expect((await login(t.db, { username: "minh.nt", password: "matkhaumoi2" }, now)).ok).toBe(
      true,
    );
  });

  it("admin không tự đặt lại mật khẩu của mình: VALIDATION, mật khẩu và phiên giữ nguyên", async () => {
    const adminMember = await makeMember(t.db, { username: "quan.tri", role: "admin" });
    const admin = actorOf(adminMember);
    const now = vn("2026-10-14T10:00");
    const s = await createSession(t.db, adminMember.id, now);
    await expect(resetPassword(t.db, admin, adminMember.id, "matkhaumoi2")).rejects.toMatchObject({
      code: "VALIDATION",
      message: "Hãy đổi mật khẩu của mình ở màn Tôi",
    });
    await expect(
      resetPassword(t.db, admin, adminMember.id.toUpperCase(), "matkhaumoi2"),
    ).rejects.toMatchObject({ code: "VALIDATION" });
    expect(await resolveSession(t.db, s.token, vn("2026-10-14T10:01"))).not.toBeNull();
    expect(
      (await login(t.db, { username: "quan.tri", password: TEST_PASSWORD }, vn("2026-10-14T10:02")))
        .ok,
    ).toBe(true);
  });

  it("mã mem sai định dạng: NOT_FOUND", async () => {
    const admin = actorOf(await makeMember(t.db, { role: "admin" }));
    const notFound = { code: "NOT_FOUND", message: MESSAGES.memberNotFound };
    await expect(updateDisplayName(t.db, admin, "not-a-uuid", "X")).rejects.toMatchObject(notFound);
    await expect(changeUsername(t.db, admin, "not-a-uuid", "moi.ten")).rejects.toMatchObject(
      notFound,
    );
    await expect(resetPassword(t.db, admin, "not-a-uuid", "matkhaumoi2")).rejects.toMatchObject(
      notFound,
    );
  });
});
