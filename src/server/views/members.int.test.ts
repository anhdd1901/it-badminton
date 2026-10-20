import { describe, expect, it } from "vitest";
import { seededRng } from "@/domain/rng";
import type { Actor } from "../actor";
import { AppError } from "../errors";
import { adjustElo, setActive } from "../members/admin";
import { setAttendance } from "../match-days/attendance";
import { makeMember, useTestDb, vn } from "../test/db";
import { getMe, getRoster, listMembers } from "./members";

describe("member views", () => {
  const t = useTestDb();
  const WED = vn("2026-10-14T10:00");
  const as = (m: { id: string; role: Actor["role"] }): Actor => ({
    memberId: m.id,
    role: m.role,
    sessionId: "s",
  });

  it("getMe trả đúng role", async () => {
    const sub = await makeMember(t.db, { role: "subadmin", displayName: "Sub" });
    expect(await getMe(t.db, as(sub))).toMatchObject({
      id: sub.id,
      role: "subadmin",
      displayName: "Sub",
      active: true,
    });
  });

  it("getRoster: mem thường bị FORBIDDEN", async () => {
    const m = await makeMember(t.db);
    await expect(getRoster(t.db, as(m), WED)).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(getRoster(t.db, as(m), WED)).rejects.toBeInstanceOf(AppError);
  });

  it("getRoster: mem đang hoạt động, attending đúng, sắp theo tên", async () => {
    const admin = await makeMember(t.db, { role: "admin", displayName: "Zed" });
    const a = await makeMember(t.db, { displayName: "An" });
    const b = await makeMember(t.db, { displayName: "Bình" });
    await makeMember(t.db, { displayName: "Cũ", active: false });
    await setAttendance(t.db, as(b), { memberId: b.id, attending: true }, WED, {
      rng: seededRng(1),
    });
    const sub = await makeMember(t.db, { role: "subadmin", displayName: "Sub" });
    const r = await getRoster(t.db, as(sub), WED);
    expect(r.map((x) => [x.member.displayName, x.attending])).toEqual([
      ["An", false],
      ["Bình", true],
      ["Sub", false],
      ["Zed", false],
    ]);
    expect(r.map((x) => x.member.id)).toEqual(
      expect.arrayContaining([a.id, b.id, admin.id, sub.id]),
    );
  });

  it("listMembers: chỉ admin; lọc theo trạng thái; ELO phản ánh adjustElo", async () => {
    const admin = await makeMember(t.db, { role: "admin" });
    const sub = await makeMember(t.db, { role: "subadmin" });
    const m = await makeMember(t.db);
    const old = await makeMember(t.db, { initialEloTenths: 9000 });
    await setActive(t.db, as(admin), old.id, false, WED);
    await adjustElo(t.db, as(admin), { memberId: old.id, elo: "1050,5" }, WED);
    await expect(listMembers(t.db, as(sub), "active")).rejects.toMatchObject({
      code: "FORBIDDEN",
    });
    const inactive = await listMembers(t.db, as(admin), "inactive");
    expect(inactive).toHaveLength(1);
    expect(inactive[0]).toMatchObject({ id: old.id, eloTenths: 10505, active: false });
    expect(inactive[0].createdAt).toBeInstanceOf(Date);
    const active = await listMembers(t.db, as(admin), "active");
    expect(active.map((x) => x.id).sort()).toEqual([admin.id, sub.id, m.id].sort());
    expect(active.find((x) => x.id === m.id)?.eloTenths).toBe(10000);
  });
});
