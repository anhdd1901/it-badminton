import { describe, expect, it } from "vitest";
import { seededRng } from "@/domain/rng";
import { attendeeKey } from "@/domain/schedule";
import type { Actor } from "../actor";
import { draftSchedules, matchDays, matchResults, officialSchedules } from "../db/schema";
import { MESSAGES } from "../errors";
import { makeMember, useTestDb, vn } from "../test/db";
import { setAttendance } from "./attendance";
import { deleteAllResults, deleteResult, enterResult, updateResult } from "./results";
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
    const key = attendeeKey(ms.map((m) => m.id));
    return { ms, key, admin: as(ms[0]), sub: as(ms[1]), mem: as(ms[2]) };
  }

  it("không nhập được trước 00:00 thứ 7", async () => {
    const { admin, key } = await setup();
    await expect(enterResult(t.db, admin, { day: "2026-10-17", scheduleKey: key, matchNumber: 1, scoreA: 21, scoreB: 15 }, vn("2026-10-16T23:59")))
      .rejects.toMatchObject({ code: "FORBIDDEN" });
  });
  it("kết quả đầu tiên chốt lịch và khóa điểm danh; xóa hết thì mở lại", async () => {
    const { sub, ms, key } = await setup();
    await enterResult(t.db, sub, { day: "2026-10-17", scheduleKey: key, matchNumber: 1, scoreA: 21, scoreB: 15 }, SAT("09:00"));
    expect(await t.db.select().from(officialSchedules)).toHaveLength(1);
    await expect(setAttendance(t.db, { memberId: ms[5].id, role: "member", sessionId: "s" }, { memberId: ms[5].id, attending: false }, SAT("09:05")))
      .rejects.toMatchObject({ code: "LOCKED" });
    await deleteAllResults(t.db, sub, { day: "2026-10-17", scheduleKey: key }, SAT("09:10"));
    expect(await t.db.select().from(officialSchedules)).toHaveLength(0);
    await setAttendance(t.db, { memberId: ms[5].id, role: "member", sessionId: "s" }, { memberId: ms[5].id, attending: false }, SAT("09:15"));
  });
  it("tỷ số sai bị từ chối với lý do", async () => {
    const { admin, key } = await setup();
    await expect(enterResult(t.db, admin, { day: "2026-10-17", scheduleKey: key, matchNumber: 1, scoreA: 23, scoreB: 20 }, SAT("09:00")))
      .rejects.toMatchObject({ code: "VALIDATION", message: "Tỷ số 23–20 không hợp lệ: từ 22 điểm trở lên phải thắng cách đúng 2" });
  });
  it("hai người nhập cùng trận: người sau bị xung đột", async () => {
    const { admin, sub, key } = await setup();
    const results = await Promise.allSettled([
      enterResult(t.db, admin, { day: "2026-10-17", scheduleKey: key, matchNumber: 2, scoreA: 21, scoreB: 17 }, SAT("09:00")),
      enterResult(t.db, sub, { day: "2026-10-17", scheduleKey: key, matchNumber: 2, scoreA: 21, scoreB: 18 }, SAT("09:00")),
    ]);
    expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(1);
    const rejected = results.find((r) => r.status === "rejected") as PromiseRejectedResult;
    expect(rejected.reason).toMatchObject({ code: "CONFLICT" });
    expect(rejected.reason.message).toMatch(/^Trận này vừa được nhập 21–1[78], hãy tải lại$/);
  });
  it("sửa với phiên bản cũ bị xung đột", async () => {
    const { admin, key } = await setup();
    await enterResult(t.db, admin, { day: "2026-10-17", scheduleKey: key, matchNumber: 1, scoreA: 21, scoreB: 15 }, SAT("09:00"));
    await updateResult(t.db, admin, { day: "2026-10-17", scheduleKey: key, matchNumber: 1, scoreA: 21, scoreB: 16, expectedVersion: 1 }, SAT("09:05"));
    await expect(updateResult(t.db, admin, { day: "2026-10-17", scheduleKey: key, matchNumber: 1, scoreA: 21, scoreB: 19, expectedVersion: 1 }, SAT("09:06")))
      .rejects.toMatchObject({ code: "CONFLICT", message: "Trận này vừa được nhập 21–16, hãy tải lại" });
  });
  it("không ai mở app lúc 12:00: chủ nhật vẫn chốt đúng danh sách lúc 12:00", async () => {
    const { admin, ms, key } = await setup();
    await finalizeDue(t.db, vn("2026-10-18T09:00"));
    const off = await t.db.select().from(officialSchedules);
    expect(off).toHaveLength(1);
    expect(off[0].attendeeKey).toBe(attendeeKey(ms.map((m) => m.id)));
    expect(await t.db.select().from(draftSchedules)).toHaveLength(0);
    await enterResult(t.db, admin, { day: "2026-10-17", scheduleKey: key, matchNumber: 1, scoreA: 21, scoreB: 15 }, vn("2026-10-18T09:00"));
  });
  it("buổi đã qua: chỉ admin sửa", async () => {
    const { admin, sub, key } = await setup();
    await enterResult(t.db, sub, { day: "2026-10-17", scheduleKey: key, matchNumber: 1, scoreA: 21, scoreB: 15 }, SAT("09:00"));
    const MON2 = vn("2026-10-19T08:00");
    await expect(updateResult(t.db, sub, { day: "2026-10-17", scheduleKey: key, matchNumber: 1, scoreA: 21, scoreB: 10, expectedVersion: 1 }, MON2))
      .rejects.toMatchObject({ code: "FORBIDDEN" });
    await updateResult(t.db, admin, { day: "2026-10-17", scheduleKey: key, matchNumber: 1, scoreA: 21, scoreB: 10, expectedVersion: 1 }, MON2);
  });
  it("xóa hết sau 12:00 không xóa lịch chính thức", async () => {
    const { admin, key } = await setup();
    await enterResult(t.db, admin, { day: "2026-10-17", scheduleKey: key, matchNumber: 1, scoreA: 21, scoreB: 15 }, SAT("09:00"));
    await deleteAllResults(t.db, admin, { day: "2026-10-17", scheduleKey: key }, SAT("13:00"));
    expect(await t.db.select().from(officialSchedules)).toHaveLength(1);
  });

  it("đã chốt lúc 12:00 thì yêu cầu mang giờ 11:59 không xóa lịch chính thức", async () => {
    const { admin, key } = await setup();
    await enterResult(t.db, admin, { day: "2026-10-17", scheduleKey: key, matchNumber: 1, scoreA: 21, scoreB: 15 }, SAT("09:00"));
    await finalizeDue(t.db, SAT("12:00"));
    await deleteAllResults(t.db, admin, { day: "2026-10-17", scheduleKey: key }, SAT("11:59"));
    expect(await t.db.select().from(officialSchedules)).toHaveLength(1);
  });
  it("lịch nháp đã đổi sau khi client xem: CONFLICT, không ghi gì", async () => {
    const { admin, ms, key } = await setup();
    await setAttendance(t.db, as(ms[5]), { memberId: ms[5].id, attending: false }, vn("2026-10-16T08:00"), { rng: seededRng(2) });
    expect((await t.db.select().from(draftSchedules)).map((d) => d.attendeeKey)).toContain(
      attendeeKey(ms.slice(0, 5).map((m) => m.id)),
    );
    await expect(
      enterResult(t.db, admin, { day: "2026-10-17", scheduleKey: key, matchNumber: 1, scoreA: 21, scoreB: 15 }, SAT("09:00")),
    ).rejects.toMatchObject({ code: "CONFLICT", message: MESSAGES.scheduleChanged });
    expect(await t.db.select().from(officialSchedules)).toHaveLength(0);
    expect(await t.db.select().from(matchResults)).toHaveLength(0);
  });
  it("lịch chính thức khác lịch client đã xem: CONFLICT", async () => {
    const { admin, ms, key } = await setup();
    await enterResult(t.db, admin, { day: "2026-10-17", scheduleKey: key, matchNumber: 1, scoreA: 21, scoreB: 15 }, SAT("09:00"));
    const stale = attendeeKey(ms.slice(0, 5).map((m) => m.id));
    const conflict = { code: "CONFLICT", message: MESSAGES.scheduleChanged };
    await expect(
      enterResult(t.db, admin, { day: "2026-10-17", scheduleKey: stale, matchNumber: 2, scoreA: 21, scoreB: 15 }, SAT("09:01")),
    ).rejects.toMatchObject(conflict);
    await expect(
      updateResult(t.db, admin, { day: "2026-10-17", scheduleKey: stale, matchNumber: 1, scoreA: 21, scoreB: 16, expectedVersion: 1 }, SAT("09:01")),
    ).rejects.toMatchObject(conflict);
    await expect(deleteResult(t.db, admin, { day: "2026-10-17", scheduleKey: stale, matchNumber: 1 }, SAT("09:01"))).rejects.toMatchObject(conflict);
    await expect(deleteAllResults(t.db, admin, { day: "2026-10-17", scheduleKey: stale }, SAT("09:01"))).rejects.toMatchObject(conflict);
    expect(await t.db.select().from(matchResults)).toHaveLength(1);
  });
  it("xóa kết quả cuối cùng trước 12:00: bỏ lịch chính thức, mở lại điểm danh", async () => {
    const { admin, ms, key } = await setup();
    await enterResult(t.db, admin, { day: "2026-10-17", scheduleKey: key, matchNumber: 1, scoreA: 21, scoreB: 15 }, SAT("09:00"));
    await enterResult(t.db, admin, { day: "2026-10-17", scheduleKey: key, matchNumber: 2, scoreA: 21, scoreB: 15 }, SAT("09:01"));
    await deleteResult(t.db, admin, { day: "2026-10-17", scheduleKey: key, matchNumber: 1 }, SAT("09:02"));
    expect(await t.db.select().from(officialSchedules)).toHaveLength(1);
    await deleteResult(t.db, admin, { day: "2026-10-17", scheduleKey: key, matchNumber: 2 }, SAT("09:03"));
    expect(await t.db.select().from(officialSchedules)).toHaveLength(0);
    await setAttendance(t.db, as(ms[5]), { memberId: ms[5].id, attending: false }, SAT("09:04"));
  });
  it("xóa kết quả cuối cùng sau 12:00: giữ lịch chính thức", async () => {
    const { admin, key } = await setup();
    await enterResult(t.db, admin, { day: "2026-10-17", scheduleKey: key, matchNumber: 1, scoreA: 21, scoreB: 15 }, SAT("09:00"));
    await deleteResult(t.db, admin, { day: "2026-10-17", scheduleKey: key, matchNumber: 1 }, SAT("12:30"));
    expect(await t.db.select().from(officialSchedules)).toHaveLength(1);
    expect(await t.db.select().from(matchResults)).toHaveLength(0);
  });
  it("dưới 5 người điểm danh: không nhập được, NOT_FOUND", async () => {
    const ms = await Promise.all(Array.from({ length: 4 }, (_, i) => makeMember(t.db, { role: i === 0 ? "admin" : "member" })));
    for (const m of ms) await setAttendance(t.db, as(m), { memberId: m.id, attending: true }, vn("2026-10-12T08:00"));
    await expect(
      enterResult(
        t.db,
        as(ms[0]),
        { day: "2026-10-17", scheduleKey: attendeeKey(ms.map((m) => m.id)), matchNumber: 1, scoreA: 21, scoreB: 15 },
        SAT("09:00"),
      ),
    ).rejects.toMatchObject({ code: "NOT_FOUND", message: MESSAGES.noSchedule });
  });
  it("chốt buổi dưới 5 người: có finalized_at, không còn lịch nháp", async () => {
    const ms = await Promise.all(Array.from({ length: 5 }, () => makeMember(t.db)));
    for (const m of ms) await setAttendance(t.db, as(m), { memberId: m.id, attending: true }, vn("2026-10-12T08:00"), { rng: seededRng(1) });
    await setAttendance(t.db, as(ms[4]), { memberId: ms[4].id, attending: false }, vn("2026-10-12T09:00"));
    expect(await t.db.select().from(draftSchedules)).toHaveLength(1);
    await finalizeDue(t.db, SAT("12:00"));
    const [day] = await t.db.select().from(matchDays);
    expect(day.finalizedAt).toEqual(SAT("12:00"));
    expect(await t.db.select().from(draftSchedules)).toHaveLength(0);
    expect(await t.db.select().from(officialSchedules)).toHaveLength(0);
  });
});
