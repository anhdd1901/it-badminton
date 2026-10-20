import { eq } from "drizzle-orm";
import { describe, expect, it } from "vitest";
import type { Role } from "@/domain/types";
import type { Actor } from "../actor";
import { createSession, resolveSession } from "../auth/sessions";
import { loadEloState } from "../data/loaders";
import { attendances, eloAdjustments, members } from "../db/schema";
import { MESSAGES } from "../errors";
import { setAttendance } from "../match-days/attendance";
import { finalizeDue } from "../match-days/schedule";
import { makeMember, TEST_PASSWORD, useTestDb, vn } from "../test/db";
import { adjustElo, setActive, setSubadmin, transferAdmin } from "./admin";

describe("member administration", () => {
  const t = useTestDb();
  const actorOf = (m: { id: string; role: Role }): Actor => ({
    memberId: m.id,
    role: m.role,
    sessionId: "s",
  });

  it("ngưng mem: thu hồi phiên, mất subadmin, rời điểm danh tuần này", async () => {
    const admin = await makeMember(t.db, { role: "admin" });
    const sub = await makeMember(t.db, { role: "subadmin" });
    const s = await createSession(t.db, sub.id, vn("2026-10-12T08:00"));
    await setAttendance(
      t.db,
      actorOf(sub),
      { memberId: sub.id, attending: true },
      vn("2026-10-12T08:00"),
    );
    await setActive(t.db, actorOf(admin), sub.id, false, vn("2026-10-13T08:00"));
    expect(await resolveSession(t.db, s.token, vn("2026-10-13T08:01"))).toBeNull();
    expect((await t.db.select().from(members).where(eq(members.id, sub.id)))[0]).toMatchObject({
      active: false,
      role: "member",
    });
    expect(await t.db.select().from(attendances)).toHaveLength(0);
  });

  it("kích hoạt lại giữ vai trò member", async () => {
    const admin = await makeMember(t.db, { role: "admin" });
    const m = await makeMember(t.db);
    await setActive(t.db, actorOf(admin), m.id, false, vn("2026-10-13T08:00"));
    await setActive(t.db, actorOf(admin), m.id, true, vn("2026-10-13T09:00"));
    expect((await t.db.select().from(members).where(eq(members.id, m.id)))[0]).toMatchObject({
      active: true,
      role: "member",
    });
  });

  it("không ngưng được admin", async () => {
    const admin = await makeMember(t.db, { role: "admin" });
    await expect(
      setActive(t.db, actorOf(admin), admin.id, false, vn("2026-10-13T08:00")),
    ).rejects.toMatchObject({
      code: "VALIDATION",
      message: "Không thể ngưng hoạt động admin",
    });
  });

  it("mem không tồn tại: NOT_FOUND", async () => {
    const admin = await makeMember(t.db, { role: "admin" });
    await expect(
      setActive(
        t.db,
        actorOf(admin),
        "00000000-0000-0000-0000-000000000000",
        false,
        vn("2026-10-13T08:00"),
      ),
    ).rejects.toMatchObject({ code: "NOT_FOUND", message: MESSAGES.memberNotFound });
  });

  it("đặt subadmin chỉ cho mem đang hoạt động, không phải admin", async () => {
    const admin = await makeMember(t.db, { role: "admin" });
    const m = await makeMember(t.db);
    const off = await makeMember(t.db, { active: false });
    await setSubadmin(t.db, actorOf(admin), m.id, true);
    expect((await t.db.select().from(members).where(eq(members.id, m.id)))[0].role).toBe(
      "subadmin",
    );
    await setSubadmin(t.db, actorOf(admin), m.id, false);
    expect((await t.db.select().from(members).where(eq(members.id, m.id)))[0].role).toBe("member");
    const message = "Chỉ đặt subadmin cho mem đang hoạt động, không phải admin";
    await expect(setSubadmin(t.db, actorOf(admin), off.id, true)).rejects.toMatchObject({
      code: "VALIDATION",
      message,
    });
    await expect(setSubadmin(t.db, actorOf(admin), admin.id, true)).rejects.toMatchObject({
      code: "VALIDATION",
      message,
    });
  });

  it("chuyển quyền admin", async () => {
    const admin = await makeMember(t.db, { role: "admin" });
    const m = await makeMember(t.db);
    await expect(
      transferAdmin(t.db, actorOf(admin), { memberId: m.id, password: "sai" }),
    ).rejects.toMatchObject({
      message: MESSAGES.wrongPassword,
    });
    await expect(
      transferAdmin(t.db, actorOf(admin), { memberId: admin.id, password: TEST_PASSWORD }),
    ).rejects.toMatchObject({
      code: "VALIDATION",
      message: "Chỉ chuyển quyền cho mem khác đang hoạt động",
    });
    await transferAdmin(t.db, actorOf(admin), { memberId: m.id, password: TEST_PASSWORD });
    const rows = await t.db.select().from(members);
    expect(rows.find((r) => r.id === admin.id)?.role).toBe("member");
    expect(rows.find((r) => r.id === m.id)?.role).toBe("admin");
  });

  it("subadmin không làm được việc quản trị", async () => {
    const sub = await makeMember(t.db, { role: "subadmin" });
    const m = await makeMember(t.db);
    for (const p of [
      setActive(t.db, actorOf(sub), m.id, false, vn("2026-10-13T08:00")),
      setSubadmin(t.db, actorOf(sub), m.id, true),
      adjustElo(t.db, actorOf(sub), { memberId: m.id, elo: 1100 }, vn("2026-10-13T08:00")),
    ])
      await expect(p).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("mốc điều chỉnh ELO", async () => {
    const admin = await makeMember(t.db, { role: "admin" });
    const m = await makeMember(t.db);
    await adjustElo(
      t.db,
      actorOf(admin),
      { memberId: m.id, elo: "1050,5" },
      vn("2026-10-13T08:00"),
    );
    expect((await loadEloState(t.db)).current.get(m.id)).toBe(10505);
  });

  it("điều chỉnh ELO bằng giá trị hiện tại thì không tạo mốc", async () => {
    const admin = await makeMember(t.db, { role: "admin" });
    const m = await makeMember(t.db);
    const cur = (await loadEloState(t.db)).current.get(m.id) ?? 0;
    const at = vn("2026-10-13T08:00");
    await adjustElo(t.db, actorOf(admin), { memberId: m.id, elo: cur / 10 }, at);
    expect(await t.db.select().from(eloAdjustments)).toHaveLength(0);
    await adjustElo(t.db, actorOf(admin), { memberId: m.id, elo: (cur + 10) / 10 }, at);
    expect(await t.db.select().from(eloAdjustments)).toHaveLength(1);
  });

  it("đã chốt lúc 12:00 thì ngưng mem với giờ 11:59 vẫn giữ điểm danh", async () => {
    const admin = await makeMember(t.db, { role: "admin" });
    const m = await makeMember(t.db);
    await setAttendance(
      t.db,
      actorOf(m),
      { memberId: m.id, attending: true },
      vn("2026-10-12T08:00"),
    );
    await finalizeDue(t.db, vn("2026-10-17T12:00"));
    await setActive(t.db, actorOf(admin), m.id, false, vn("2026-10-17T11:59"));
    expect((await t.db.select().from(members).where(eq(members.id, m.id)))[0].active).toBe(false);
    expect(await t.db.select().from(attendances)).toHaveLength(1);
  });

  it("mã mem sai định dạng: NOT_FOUND", async () => {
    const admin = await makeMember(t.db, { role: "admin" });
    const notFound = { code: "NOT_FOUND", message: MESSAGES.memberNotFound };
    const now = vn("2026-10-13T08:00");
    await expect(setActive(t.db, actorOf(admin), "not-a-uuid", false, now)).rejects.toMatchObject(
      notFound,
    );
    await expect(setSubadmin(t.db, actorOf(admin), "not-a-uuid", true)).rejects.toMatchObject(
      notFound,
    );
    await expect(
      transferAdmin(t.db, actorOf(admin), { memberId: "not-a-uuid", password: TEST_PASSWORD }),
    ).rejects.toMatchObject(notFound);
    await expect(
      adjustElo(t.db, actorOf(admin), { memberId: "not-a-uuid", elo: 1000 }, now),
    ).rejects.toMatchObject(notFound);
  });

  it("hai lần chuyển quyền song song: chỉ một thành công, luôn đúng một admin", async () => {
    const admin = await makeMember(t.db, { role: "admin" });
    const a = await makeMember(t.db);
    const b = await makeMember(t.db);
    const results = await Promise.allSettled(
      [a, b].map((m) =>
        transferAdmin(t.db, actorOf(admin), { memberId: m.id, password: TEST_PASSWORD }),
      ),
    );
    expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(1);
    const rejected = results.find((r) => r.status === "rejected") as PromiseRejectedResult;
    expect(["FORBIDDEN", "CONFLICT"]).toContain(rejected.reason.code);
    const admins = (await t.db.select().from(members)).filter((r) => r.role === "admin");
    expect(admins).toHaveLength(1);
    expect([a.id, b.id]).toContain(admins[0].id);
  });

  it("setActive đọc mem đích trong transaction", async () => {
    const admin = await makeMember(t.db, { role: "admin" });
    const target = await makeMember(t.db, { role: "subadmin" });
    let pending!: Promise<void>;
    await t.db.transaction(async (tx) => {
      await tx.select().from(members).where(eq(members.id, target.id)).for("update");
      pending = setActive(t.db, actorOf(admin), target.id, false, vn("2026-10-13T08:00"));
      pending.catch(() => {});
      await new Promise((r) => setTimeout(r, 400));
      // Admin role moves to the target while setActive waits for the lock.
      await tx.update(members).set({ role: "member" }).where(eq(members.id, admin.id));
      await tx.update(members).set({ role: "admin" }).where(eq(members.id, target.id));
    });
    await expect(pending).rejects.toMatchObject({ code: "VALIDATION" });
    expect((await t.db.select().from(members).where(eq(members.id, target.id)))[0]).toMatchObject({
      active: true,
      role: "admin",
    });
  });

  it("setSubadmin đọc mem đích trong transaction", async () => {
    const admin = await makeMember(t.db, { role: "admin" });
    const target = await makeMember(t.db, { role: "member" });
    let pending!: Promise<void>;
    await t.db.transaction(async (tx) => {
      await tx.select().from(members).where(eq(members.id, target.id)).for("update");
      pending = setSubadmin(t.db, actorOf(admin), target.id, true);
      pending.catch(() => {});
      await new Promise((r) => setTimeout(r, 400));
      await tx.update(members).set({ active: false }).where(eq(members.id, target.id));
    });
    await expect(pending).rejects.toMatchObject({ code: "VALIDATION" });
    expect((await t.db.select().from(members).where(eq(members.id, target.id)))[0]).toMatchObject({
      active: false,
      role: "member",
    });
  });

  it("transferAdmin đọc mem đích trong transaction", async () => {
    const admin = await makeMember(t.db, { role: "admin" });
    const target = await makeMember(t.db, { role: "member" });
    let pending!: Promise<void>;
    await t.db.transaction(async (tx) => {
      await tx.select().from(members).where(eq(members.id, target.id)).for("update");
      pending = transferAdmin(t.db, actorOf(admin), {
        memberId: target.id,
        password: TEST_PASSWORD,
      });
      pending.catch(() => {});
      await new Promise((r) => setTimeout(r, 800));
      await tx.update(members).set({ active: false }).where(eq(members.id, target.id));
    });
    await expect(pending).rejects.toMatchObject({
      code: "VALIDATION",
      message: "Chỉ chuyển quyền cho mem khác đang hoạt động",
    });
    const rows = await t.db.select().from(members);
    expect(rows.find((r) => r.id === admin.id)?.role).toBe("admin");
    expect(rows.find((r) => r.id === target.id)?.role).toBe("member");
  });
});
