import { eq } from "drizzle-orm";
import { describe, expect, it } from "vitest";
import { seededRng } from "@/domain/rng";
import { attendeeKey } from "@/domain/schedule";
import type { Actor } from "../actor";
import {
  draftSchedules,
  matchDays,
  matchResults,
  members,
  officialSchedules,
  scheduledMatches,
} from "../db/schema";
import { MESSAGES } from "../errors";
import { makeMember, useTestDb, vn } from "../test/db";
import { setAttendance } from "./attendance";
import { getSeasonView } from "../views/rankings";
import { getWeekView } from "../views/week";
import {
  changeMatchPlayers,
  deleteAllResults,
  deleteResult,
  enterResult,
  updateResult,
} from "./results";
import { finalizeDue } from "./schedule";

describe("match results", () => {
  const t = useTestDb();
  const SAT = (h: string) => vn(`2026-10-17T${h}`);
  const as = (m: { id: string; role: Actor["role"] }): Actor => ({
    memberId: m.id,
    role: m.role,
    sessionId: "s",
  });

  async function setup() {
    const ms = await Promise.all(
      Array.from({ length: 6 }, (_, i) =>
        makeMember(t.db, { role: i === 0 ? "admin" : i === 1 ? "subadmin" : "member" }),
      ),
    );
    for (const m of ms) {
      await setAttendance(
        t.db,
        as(m),
        { memberId: m.id, attending: true },
        vn("2026-10-12T08:00"),
        { rng: seededRng(1) },
      );
    }
    const key = attendeeKey(ms.map((m) => m.id));
    return { ms, key, admin: as(ms[0]), sub: as(ms[1]), mem: as(ms[2]) };
  }

  it("không nhập được trước 00:00 thứ 7", async () => {
    const { admin, key } = await setup();
    await expect(
      enterResult(
        t.db,
        admin,
        { day: "2026-10-17", scheduleKey: key, matchNumber: 1, scoreA: 21, scoreB: 15 },
        vn("2026-10-16T23:59"),
      ),
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
  });
  it("kết quả đầu tiên chốt lịch và khóa điểm danh; xóa hết thì mở lại", async () => {
    const { sub, ms, key } = await setup();
    await enterResult(
      t.db,
      sub,
      { day: "2026-10-17", scheduleKey: key, matchNumber: 1, scoreA: 21, scoreB: 15 },
      SAT("09:00"),
    );
    expect(await t.db.select().from(officialSchedules)).toHaveLength(1);
    await expect(
      setAttendance(
        t.db,
        { memberId: ms[5].id, role: "member", sessionId: "s" },
        { memberId: ms[5].id, attending: false },
        SAT("09:05"),
      ),
    ).rejects.toMatchObject({ code: "LOCKED" });
    await deleteAllResults(t.db, sub, { day: "2026-10-17", scheduleKey: key }, SAT("09:10"));
    expect(await t.db.select().from(officialSchedules)).toHaveLength(0);
    await setAttendance(
      t.db,
      { memberId: ms[5].id, role: "member", sessionId: "s" },
      { memberId: ms[5].id, attending: false },
      SAT("09:15"),
    );
  });
  it("tỷ số sai bị từ chối với lý do", async () => {
    const { admin, key } = await setup();
    await expect(
      enterResult(
        t.db,
        admin,
        { day: "2026-10-17", scheduleKey: key, matchNumber: 1, scoreA: 23, scoreB: 20 },
        SAT("09:00"),
      ),
    ).rejects.toMatchObject({
      code: "VALIDATION",
      message: "Tỷ số 23–20 không hợp lệ: từ 22 điểm trở lên phải thắng cách đúng 2",
    });
  });
  it("hai người nhập cùng trận: người sau bị xung đột", async () => {
    const { admin, sub, key } = await setup();
    const results = await Promise.allSettled([
      enterResult(
        t.db,
        admin,
        { day: "2026-10-17", scheduleKey: key, matchNumber: 2, scoreA: 21, scoreB: 17 },
        SAT("09:00"),
      ),
      enterResult(
        t.db,
        sub,
        { day: "2026-10-17", scheduleKey: key, matchNumber: 2, scoreA: 21, scoreB: 18 },
        SAT("09:00"),
      ),
    ]);
    expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(1);
    const rejected = results.find((r) => r.status === "rejected") as PromiseRejectedResult;
    expect(rejected.reason).toMatchObject({ code: "CONFLICT" });
    expect(rejected.reason.message).toMatch(/^Trận này vừa được nhập 21–1[78], hãy tải lại$/);
  });
  it("sửa với phiên bản cũ bị xung đột", async () => {
    const { admin, key } = await setup();
    await enterResult(
      t.db,
      admin,
      { day: "2026-10-17", scheduleKey: key, matchNumber: 1, scoreA: 21, scoreB: 15 },
      SAT("09:00"),
    );
    await updateResult(
      t.db,
      admin,
      {
        day: "2026-10-17",
        scheduleKey: key,
        matchNumber: 1,
        scoreA: 21,
        scoreB: 16,
        expectedVersion: 1,
      },
      SAT("09:05"),
    );
    await expect(
      updateResult(
        t.db,
        admin,
        {
          day: "2026-10-17",
          scheduleKey: key,
          matchNumber: 1,
          scoreA: 21,
          scoreB: 19,
          expectedVersion: 1,
        },
        SAT("09:06"),
      ),
    ).rejects.toMatchObject({
      code: "CONFLICT",
      message: "Trận này vừa được nhập 21–16, hãy tải lại",
    });
  });
  it("không ai mở app lúc 12:00: chủ nhật vẫn chốt đúng danh sách lúc 12:00", async () => {
    const { admin, ms, key } = await setup();
    await finalizeDue(t.db, vn("2026-10-18T09:00"));
    const off = await t.db.select().from(officialSchedules);
    expect(off).toHaveLength(1);
    expect(off[0].attendeeKey).toBe(attendeeKey(ms.map((m) => m.id)));
    expect(await t.db.select().from(draftSchedules)).toHaveLength(0);
    await enterResult(
      t.db,
      admin,
      { day: "2026-10-17", scheduleKey: key, matchNumber: 1, scoreA: 21, scoreB: 15 },
      vn("2026-10-18T09:00"),
    );
  });
  it("buổi đã qua: chỉ admin sửa", async () => {
    const { admin, sub, key } = await setup();
    await enterResult(
      t.db,
      sub,
      { day: "2026-10-17", scheduleKey: key, matchNumber: 1, scoreA: 21, scoreB: 15 },
      SAT("09:00"),
    );
    const MON2 = vn("2026-10-19T08:00");
    await expect(
      updateResult(
        t.db,
        sub,
        {
          day: "2026-10-17",
          scheduleKey: key,
          matchNumber: 1,
          scoreA: 21,
          scoreB: 10,
          expectedVersion: 1,
        },
        MON2,
      ),
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
    await updateResult(
      t.db,
      admin,
      {
        day: "2026-10-17",
        scheduleKey: key,
        matchNumber: 1,
        scoreA: 21,
        scoreB: 10,
        expectedVersion: 1,
      },
      MON2,
    );
  });
  it("xóa hết sau 12:00 không xóa lịch chính thức", async () => {
    const { admin, key } = await setup();
    await enterResult(
      t.db,
      admin,
      { day: "2026-10-17", scheduleKey: key, matchNumber: 1, scoreA: 21, scoreB: 15 },
      SAT("09:00"),
    );
    await deleteAllResults(t.db, admin, { day: "2026-10-17", scheduleKey: key }, SAT("13:00"));
    expect(await t.db.select().from(officialSchedules)).toHaveLength(1);
  });

  it("đã chốt lúc 12:00 thì yêu cầu mang giờ 11:59 không xóa lịch chính thức", async () => {
    const { admin, key } = await setup();
    await enterResult(
      t.db,
      admin,
      { day: "2026-10-17", scheduleKey: key, matchNumber: 1, scoreA: 21, scoreB: 15 },
      SAT("09:00"),
    );
    await finalizeDue(t.db, SAT("12:00"));
    await deleteAllResults(t.db, admin, { day: "2026-10-17", scheduleKey: key }, SAT("11:59"));
    expect(await t.db.select().from(officialSchedules)).toHaveLength(1);
  });
  it("lịch nháp đã đổi sau khi client xem: CONFLICT, không ghi gì", async () => {
    const { admin, ms, key } = await setup();
    await setAttendance(
      t.db,
      as(ms[5]),
      { memberId: ms[5].id, attending: false },
      vn("2026-10-16T08:00"),
      { rng: seededRng(2) },
    );
    expect((await t.db.select().from(draftSchedules)).map((d) => d.attendeeKey)).toContain(
      attendeeKey(ms.slice(0, 5).map((m) => m.id)),
    );
    await expect(
      enterResult(
        t.db,
        admin,
        { day: "2026-10-17", scheduleKey: key, matchNumber: 1, scoreA: 21, scoreB: 15 },
        SAT("09:00"),
      ),
    ).rejects.toMatchObject({ code: "CONFLICT", message: MESSAGES.scheduleChanged });
    expect(await t.db.select().from(officialSchedules)).toHaveLength(0);
    expect(await t.db.select().from(matchResults)).toHaveLength(0);
  });
  it("lịch chính thức khác lịch client đã xem: CONFLICT", async () => {
    const { admin, ms, key } = await setup();
    await enterResult(
      t.db,
      admin,
      { day: "2026-10-17", scheduleKey: key, matchNumber: 1, scoreA: 21, scoreB: 15 },
      SAT("09:00"),
    );
    const stale = attendeeKey(ms.slice(0, 5).map((m) => m.id));
    const conflict = { code: "CONFLICT", message: MESSAGES.scheduleChanged };
    await expect(
      enterResult(
        t.db,
        admin,
        { day: "2026-10-17", scheduleKey: stale, matchNumber: 2, scoreA: 21, scoreB: 15 },
        SAT("09:01"),
      ),
    ).rejects.toMatchObject(conflict);
    await expect(
      updateResult(
        t.db,
        admin,
        {
          day: "2026-10-17",
          scheduleKey: stale,
          matchNumber: 1,
          scoreA: 21,
          scoreB: 16,
          expectedVersion: 1,
        },
        SAT("09:01"),
      ),
    ).rejects.toMatchObject(conflict);
    await expect(
      deleteResult(
        t.db,
        admin,
        { day: "2026-10-17", scheduleKey: stale, matchNumber: 1 },
        SAT("09:01"),
      ),
    ).rejects.toMatchObject(conflict);
    await expect(
      deleteAllResults(t.db, admin, { day: "2026-10-17", scheduleKey: stale }, SAT("09:01")),
    ).rejects.toMatchObject(conflict);
    expect(await t.db.select().from(matchResults)).toHaveLength(1);
  });
  it("xóa kết quả cuối cùng trước 12:00: bỏ lịch chính thức, mở lại điểm danh", async () => {
    const { admin, ms, key } = await setup();
    await enterResult(
      t.db,
      admin,
      { day: "2026-10-17", scheduleKey: key, matchNumber: 1, scoreA: 21, scoreB: 15 },
      SAT("09:00"),
    );
    await enterResult(
      t.db,
      admin,
      { day: "2026-10-17", scheduleKey: key, matchNumber: 2, scoreA: 21, scoreB: 15 },
      SAT("09:01"),
    );
    await deleteResult(
      t.db,
      admin,
      { day: "2026-10-17", scheduleKey: key, matchNumber: 1 },
      SAT("09:02"),
    );
    expect(await t.db.select().from(officialSchedules)).toHaveLength(1);
    await deleteResult(
      t.db,
      admin,
      { day: "2026-10-17", scheduleKey: key, matchNumber: 2 },
      SAT("09:03"),
    );
    expect(await t.db.select().from(officialSchedules)).toHaveLength(0);
    await setAttendance(t.db, as(ms[5]), { memberId: ms[5].id, attending: false }, SAT("09:04"));
  });
  it("xóa kết quả cuối cùng sau 12:00: giữ lịch chính thức", async () => {
    const { admin, key } = await setup();
    await enterResult(
      t.db,
      admin,
      { day: "2026-10-17", scheduleKey: key, matchNumber: 1, scoreA: 21, scoreB: 15 },
      SAT("09:00"),
    );
    await deleteResult(
      t.db,
      admin,
      { day: "2026-10-17", scheduleKey: key, matchNumber: 1 },
      SAT("12:30"),
    );
    expect(await t.db.select().from(officialSchedules)).toHaveLength(1);
    expect(await t.db.select().from(matchResults)).toHaveLength(0);
  });
  it("dưới 5 người điểm danh: không nhập được, NOT_FOUND", async () => {
    const ms = await Promise.all(
      Array.from({ length: 4 }, (_, i) => makeMember(t.db, { role: i === 0 ? "admin" : "member" })),
    );
    for (const m of ms)
      await setAttendance(t.db, as(m), { memberId: m.id, attending: true }, vn("2026-10-12T08:00"));
    await expect(
      enterResult(
        t.db,
        as(ms[0]),
        {
          day: "2026-10-17",
          scheduleKey: attendeeKey(ms.map((m) => m.id)),
          matchNumber: 1,
          scoreA: 21,
          scoreB: 15,
        },
        SAT("09:00"),
      ),
    ).rejects.toMatchObject({ code: "NOT_FOUND", message: MESSAGES.noSchedule });
  });
  it("chốt buổi dưới 5 người: có finalized_at, không còn lịch nháp", async () => {
    const ms = await Promise.all(Array.from({ length: 5 }, () => makeMember(t.db)));
    for (const m of ms)
      await setAttendance(
        t.db,
        as(m),
        { memberId: m.id, attending: true },
        vn("2026-10-12T08:00"),
        { rng: seededRng(1) },
      );
    await setAttendance(
      t.db,
      as(ms[4]),
      { memberId: ms[4].id, attending: false },
      vn("2026-10-12T09:00"),
    );
    expect(await t.db.select().from(draftSchedules)).toHaveLength(1);
    await finalizeDue(t.db, SAT("12:00"));
    const [day] = await t.db.select().from(matchDays);
    expect(day.finalizedAt).toEqual(SAT("12:00"));
    expect(await t.db.select().from(draftSchedules)).toHaveLength(0);
    expect(await t.db.select().from(officialSchedules)).toHaveLength(0);
  });
  describe("đổi người trong trận", () => {
    type Teams = { teamA: [string, string]; teamB: [string, string] };
    const DAY = "2026-10-17";

    async function official() {
      const s = await setup();
      await enterResult(
        t.db,
        s.admin,
        { day: DAY, scheduleKey: s.key, matchNumber: 1, scoreA: 21, scoreB: 15 },
        SAT("09:00"),
      );
      const view = await getWeekView(t.db, s.admin, SAT("09:00"));
      const m = view.schedule!.matches.find((x) => x.number === 1)!;
      const cur: Teams = {
        teamA: [m.teamA[0].id, m.teamA[1].id],
        teamB: [m.teamB[0].id, m.teamB[1].id],
      };
      const all = view.schedule!.matches.flatMap((x) => [...x.teamA, ...x.teamB]).map((p) => p.id);
      const x = s.ms.map((u) => u.id).find((id) => ![...cur.teamA, ...cur.teamB].includes(id))!;
      expect(all).toContain(x);
      return { ...s, cur, x };
    }
    const change = (s: { admin: Actor; key: string }, cur: Teams, next: Teams, at = SAT("09:30")) =>
      changeMatchPlayers(
        t.db,
        s.admin,
        { day: DAY, scheduleKey: s.key, matchNumber: 1, expected: cur, next },
        at,
      );
    const wins = async (id: string) =>
      (await getSeasonView(t.db, "2026-10", SAT("10:00"))).rows.find((r) => r.member.id === id)
        ?.totals.wins ?? 0;

    it("subadmin: FORBIDDEN", async () => {
      const s = await official();
      await expect(
        changeMatchPlayers(
          t.db,
          s.sub,
          { day: DAY, scheduleKey: s.key, matchNumber: 1, expected: s.cur, next: s.cur },
          SAT("09:30"),
        ),
      ).rejects.toMatchObject({ code: "FORBIDDEN" });
    });
    it("lịch nháp: NOT_FOUND, không chốt lịch", async () => {
      const s = await setup();
      const cur = { teamA: [s.ms[0].id, s.ms[1].id], teamB: [s.ms[2].id, s.ms[3].id] } as Teams;
      await expect(change(s, cur, cur, SAT("09:00"))).rejects.toMatchObject({
        code: "NOT_FOUND",
        message: MESSAGES.noSchedule,
      });
      expect(await t.db.select().from(officialSchedules)).toHaveLength(0);
    });
    it("đổi người trận đã có tỷ số: xếp hạng tính lại", async () => {
      const s = await official();
      const out = s.cur.teamA[0];
      const [xBefore, outBefore] = [await wins(s.x), await wins(out)];
      await change(s, s.cur, { teamA: [s.x, s.cur.teamA[1]], teamB: s.cur.teamB });
      const view = await getWeekView(t.db, s.admin, SAT("10:00"));
      const m = view.schedule!.matches.find((q) => q.number === 1)!;
      expect(m.teamA[0].id).toBe(s.x);
      expect(m.result).toEqual({ scoreA: 21, scoreB: 15, version: 1 });
      expect(await wins(s.x)).toBe(xBefore + 1);
      expect(await wins(out)).toBe(outBefore - 1);
    });
    it("trùng người hoặc người ngoài lịch: VALIDATION", async () => {
      const s = await official();
      await expect(
        change(s, s.cur, { teamA: s.cur.teamA, teamB: [s.cur.teamB[0], s.cur.teamA[0]] }),
      ).rejects.toMatchObject({ code: "VALIDATION", message: MESSAGES.badLineup });
      const outsider = await makeMember(t.db);
      await expect(
        change(s, s.cur, { teamA: [outsider.id, s.cur.teamA[1]], teamB: s.cur.teamB }),
      ).rejects.toMatchObject({ code: "VALIDATION", message: MESSAGES.badLineup });
    });
    it("expected lệch: CONFLICT", async () => {
      const s = await official();
      await change(s, s.cur, { teamA: [s.x, s.cur.teamA[1]], teamB: s.cur.teamB });
      await expect(
        change(s, s.cur, { teamA: s.cur.teamA, teamB: s.cur.teamB }),
      ).rejects.toMatchObject({ code: "CONFLICT", message: MESSAGES.lineupChanged });
    });
    it("scheduleKey sai: CONFLICT scheduleChanged", async () => {
      const s = await official();
      await expect(change({ ...s, key: "sai" }, s.cur, s.cur)).rejects.toMatchObject({
        code: "CONFLICT",
        message: MESSAGES.scheduleChanged,
      });
    });
    it("mem đã ngưng vẫn chọn được", async () => {
      const ms = await Promise.all(
        Array.from({ length: 6 }, (_, i) =>
          makeMember(t.db, { role: i === 0 ? "admin" : "member" }),
        ),
      );
      for (const m of ms) {
        await setAttendance(
          t.db,
          as(m),
          { memberId: m.id, attending: true },
          vn("2026-10-07T08:00"),
          { rng: seededRng(1) },
        );
      }
      const admin = as(ms[0]);
      const past = "2026-10-10";
      const key = attendeeKey(ms.map((m) => m.id));
      await enterResult(
        t.db,
        admin,
        { day: past, scheduleKey: key, matchNumber: 1, scoreA: 21, scoreB: 15 },
        vn("2026-10-10T09:00"),
      );
      const [row] = await t.db
        .select({
          a1: scheduledMatches.a1,
          a2: scheduledMatches.a2,
          b1: scheduledMatches.b1,
          b2: scheduledMatches.b2,
        })
        .from(scheduledMatches)
        .innerJoin(officialSchedules, eq(officialSchedules.id, scheduledMatches.officialScheduleId))
        .where(eq(scheduledMatches.number, 1));
      const cur: Teams = { teamA: [row.a1, row.a2], teamB: [row.b1, row.b2] };
      const x = ms.map((m) => m.id).find((id) => ![row.a1, row.a2, row.b1, row.b2].includes(id))!;
      await t.db.update(members).set({ active: false }).where(eq(members.id, x));
      await changeMatchPlayers(
        t.db,
        admin,
        {
          day: past,
          scheduleKey: key,
          matchNumber: 1,
          expected: cur,
          next: { teamA: [x, cur.teamA[1]], teamB: cur.teamB },
        },
        SAT("09:00"),
      );
      const [after] = await t.db
        .select({ a1: scheduledMatches.a1 })
        .from(scheduledMatches)
        .where(eq(scheduledMatches.number, 1));
      expect(after.a1).toBe(x);
    });
  });
});
