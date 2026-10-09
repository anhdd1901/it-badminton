import { describe, expect, it } from "vitest";
import { seededRng } from "@/domain/rng";
import { attendeeKey } from "@/domain/schedule";
import type { Role } from "@/domain/types";
import type { Actor } from "../actor";
import { attendances, draftSchedules } from "../db/schema";
import { MESSAGES } from "../errors";
import { makeMember, useTestDb, vn } from "../test/db";
import { setAttendance } from "./attendance";

describe("setAttendance", () => {
  const t = useTestDb();
  const MON = vn("2026-10-12T08:00");
  async function club(n: number) {
    return Promise.all(Array.from({ length: n }, () => makeMember(t.db)));
  }
  const self = (m: { id: string; role: Role }): Actor => ({ memberId: m.id, role: m.role, sessionId: "s" });

  it("dưới 5 người chưa có lịch; đủ 5 thì có lịch nháp", async () => {
    const ms = await club(6);
    for (const m of ms.slice(0, 4)) await setAttendance(t.db, self(m), { memberId: m.id, attending: true }, MON, { rng: seededRng(1) });
    expect(await t.db.select().from(draftSchedules)).toHaveLength(0);
    await setAttendance(t.db, self(ms[4]), { memberId: ms[4].id, attending: true }, MON, { rng: seededRng(1) });
    const drafts = await t.db.select().from(draftSchedules);
    expect(drafts).toHaveLength(1);
    expect(drafts[0].diagramId).toBe("5");
  });
  it("điểm danh lại về danh sách cũ thì dùng lại lịch cũ", async () => {
    const ms = await club(6);
    for (const m of ms) await setAttendance(t.db, self(m), { memberId: m.id, attending: true }, MON, { rng: seededRng(1) });
    const first = (await t.db.select().from(draftSchedules)).find((d) => d.attendeeKey === attendeeKey(ms.map((m) => m.id)))!;
    await setAttendance(t.db, self(ms[5]), { memberId: ms[5].id, attending: false }, MON, { rng: seededRng(2) });
    await setAttendance(t.db, self(ms[5]), { memberId: ms[5].id, attending: true }, MON, { rng: seededRng(3) });
    const again = (await t.db.select().from(draftSchedules)).filter((d) => d.attendeeKey === first.attendeeKey);
    expect(again).toHaveLength(1);
    expect(again[0].id).toBe(first.id);
  });
  it("mem không điểm danh hộ được; subadmin thì được", async () => {
    const [a, b] = await club(2);
    const sub = await makeMember(t.db, { role: "subadmin" });
    await expect(setAttendance(t.db, self(a), { memberId: b.id, attending: true }, MON)).rejects.toMatchObject({ code: "FORBIDDEN" });
    await setAttendance(t.db, self(sub), { memberId: b.id, attending: true }, MON);
    const rows = await t.db.select().from(attendances);
    expect(rows[0]).toMatchObject({ memberId: b.id, recordedBy: sub.id });
  });
  it("sau 12:00 thứ 7 bị khóa", async () => {
    const [a] = await club(1);
    await expect(setAttendance(t.db, self(a), { memberId: a.id, attending: true }, vn("2026-10-17T12:00")))
      .rejects.toMatchObject({ code: "LOCKED", message: MESSAGES.matchDayLocked });
  });
  it("mem đã ngưng không điểm danh được", async () => {
    const x = await makeMember(t.db, { active: false });
    const admin = await makeMember(t.db, { role: "admin" });
    await expect(setAttendance(t.db, self(admin), { memberId: x.id, attending: true }, MON)).rejects.toMatchObject({ code: "VALIDATION" });
  });
  it("hai người điểm danh cùng lúc lúc đủ 5 chỉ tạo một lịch nháp", async () => {
    const ms = await club(6);
    for (const m of ms.slice(0, 4)) await setAttendance(t.db, self(m), { memberId: m.id, attending: true }, MON, { rng: seededRng(1) });
    await Promise.all([ms[4], ms[5]].map((m) => setAttendance(t.db, self(m), { memberId: m.id, attending: true }, MON, { rng: seededRng(9) })));
    const drafts = await t.db.select().from(draftSchedules);
    expect(new Set(drafts.map((d) => d.attendeeKey)).size).toBe(drafts.length);
    expect(drafts.some((d) => d.attendeeKey === attendeeKey(ms.map((m) => m.id)))).toBe(true);
  });
});
