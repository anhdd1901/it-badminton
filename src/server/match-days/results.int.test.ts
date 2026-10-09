import { describe, expect, it } from "vitest";
import { seededRng } from "@/domain/rng";
import { attendeeKey } from "@/domain/schedule";
import type { Actor } from "../actor";
import { draftSchedules, officialSchedules } from "../db/schema";
import { makeMember, useTestDb, vn } from "../test/db";
import { setAttendance } from "./attendance";
import { deleteAllResults, enterResult, updateResult } from "./results";
import { finalizeDue } from "./schedule";

describe("match results", () => {
  const t = useTestDb();
  const SAT = (h: string) => vn(`2026-10-17T${h}`);
  const as = (m: { id: string; role: Actor["role"] }): Actor => ({ memberId: m.id, role: m.role, sessionId: "s" });

  async function setup() {
    const ms = await Promise.all(
      Array.from({ length: 6 }, (_, i) =>
        makeMember(t.db, { role: i === 0 ? "admin" : i === 1 ? "subadmin" : "member" }),
      ),
    );
    for (const m of ms) {
      await setAttendance(t.db, as(m), { memberId: m.id, attending: true }, vn("2026-10-12T08:00"), { rng: seededRng(1) });
    }
    return { ms, admin: as(ms[0]), sub: as(ms[1]), mem: as(ms[2]) };
  }

  it("không nhập được trước 00:00 thứ 7", async () => {
    const { admin } = await setup();
    await expect(enterResult(t.db, admin, { day: "2026-10-17", matchNumber: 1, scoreA: 21, scoreB: 15 }, vn("2026-10-16T23:59")))
      .rejects.toMatchObject({ code: "FORBIDDEN" });
  });
  it("kết quả đầu tiên chốt lịch và khóa điểm danh; xóa hết thì mở lại", async () => {
    const { sub, ms } = await setup();
    await enterResult(t.db, sub, { day: "2026-10-17", matchNumber: 1, scoreA: 21, scoreB: 15 }, SAT("09:00"));
    expect(await t.db.select().from(officialSchedules)).toHaveLength(1);
    await expect(setAttendance(t.db, { memberId: ms[5].id, role: "member", sessionId: "s" }, { memberId: ms[5].id, attending: false }, SAT("09:05")))
      .rejects.toMatchObject({ code: "LOCKED" });
    await deleteAllResults(t.db, sub, { day: "2026-10-17" }, SAT("09:10"));
    expect(await t.db.select().from(officialSchedules)).toHaveLength(0);
    await setAttendance(t.db, { memberId: ms[5].id, role: "member", sessionId: "s" }, { memberId: ms[5].id, attending: false }, SAT("09:15"));
  });
  it("tỷ số sai bị từ chối với lý do", async () => {
    const { admin } = await setup();
    await expect(enterResult(t.db, admin, { day: "2026-10-17", matchNumber: 1, scoreA: 23, scoreB: 20 }, SAT("09:00")))
      .rejects.toMatchObject({ code: "VALIDATION", message: "Tỷ số 23–20 không hợp lệ: từ 22 điểm trở lên phải thắng cách đúng 2" });
  });
  it("hai người nhập cùng trận: người sau bị xung đột", async () => {
    const { admin, sub } = await setup();
    const results = await Promise.allSettled([
      enterResult(t.db, admin, { day: "2026-10-17", matchNumber: 2, scoreA: 21, scoreB: 17 }, SAT("09:00")),
      enterResult(t.db, sub, { day: "2026-10-17", matchNumber: 2, scoreA: 21, scoreB: 18 }, SAT("09:00")),
    ]);
    expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(1);
    const rejected = results.find((r) => r.status === "rejected") as PromiseRejectedResult;
    expect(rejected.reason).toMatchObject({ code: "CONFLICT" });
    expect(rejected.reason.message).toMatch(/^Trận này vừa được nhập 21–1[78], hãy tải lại$/);
  });
  it("sửa với phiên bản cũ bị xung đột", async () => {
    const { admin } = await setup();
    await enterResult(t.db, admin, { day: "2026-10-17", matchNumber: 1, scoreA: 21, scoreB: 15 }, SAT("09:00"));
    await updateResult(t.db, admin, { day: "2026-10-17", matchNumber: 1, scoreA: 21, scoreB: 16, expectedVersion: 1 }, SAT("09:05"));
    await expect(updateResult(t.db, admin, { day: "2026-10-17", matchNumber: 1, scoreA: 21, scoreB: 19, expectedVersion: 1 }, SAT("09:06")))
      .rejects.toMatchObject({ code: "CONFLICT", message: "Trận này vừa được nhập 21–16, hãy tải lại" });
  });
  it("không ai mở app lúc 12:00: chủ nhật vẫn chốt đúng danh sách lúc 12:00", async () => {
    const { admin, ms } = await setup();
    await finalizeDue(t.db, vn("2026-10-18T09:00"));
    const off = await t.db.select().from(officialSchedules);
    expect(off).toHaveLength(1);
    expect(off[0].attendeeKey).toBe(attendeeKey(ms.map((m) => m.id)));
    expect(await t.db.select().from(draftSchedules)).toHaveLength(0);
    await enterResult(t.db, admin, { day: "2026-10-17", matchNumber: 1, scoreA: 21, scoreB: 15 }, vn("2026-10-18T09:00"));
  });
  it("buổi đã qua: chỉ admin sửa", async () => {
    const { admin, sub } = await setup();
    await enterResult(t.db, sub, { day: "2026-10-17", matchNumber: 1, scoreA: 21, scoreB: 15 }, SAT("09:00"));
    const MON2 = vn("2026-10-19T08:00");
    await expect(updateResult(t.db, sub, { day: "2026-10-17", matchNumber: 1, scoreA: 21, scoreB: 10, expectedVersion: 1 }, MON2))
      .rejects.toMatchObject({ code: "FORBIDDEN" });
    await updateResult(t.db, admin, { day: "2026-10-17", matchNumber: 1, scoreA: 21, scoreB: 10, expectedVersion: 1 }, MON2);
  });
  it("xóa hết sau 12:00 không xóa lịch chính thức", async () => {
    const { admin } = await setup();
    await enterResult(t.db, admin, { day: "2026-10-17", matchNumber: 1, scoreA: 21, scoreB: 15 }, SAT("09:00"));
    await deleteAllResults(t.db, admin, { day: "2026-10-17" }, SAT("13:00"));
    expect(await t.db.select().from(officialSchedules)).toHaveLength(1);
  });
});
