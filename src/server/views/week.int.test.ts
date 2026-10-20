import { describe, expect, it } from "vitest";
import { seededRng } from "@/domain/rng";
import { attendeeKey } from "@/domain/schedule";
import type { Actor } from "../actor";
import { setActive } from "../members/admin";
import { setAttendance } from "../match-days/attendance";
import { deleteResult, enterResult } from "../match-days/results";
import { makeMember, useTestDb, vn } from "../test/db";
import { getWeekView } from "./week";

describe("getWeekView", () => {
  const t = useTestDb();
  const WED = vn("2026-10-14T10:00");
  const as = (m: { id: string; role: Actor["role"] }): Actor => ({
    memberId: m.id,
    role: m.role,
    sessionId: "s",
  });
  type M = Awaited<ReturnType<typeof makeMember>>;

  async function attend(ms: M[], now = WED) {
    for (const m of ms) {
      await setAttendance(t.db, as(m), { memberId: m.id, attending: true }, now, {
        rng: seededRng(1),
      });
    }
  }

  it("chưa có buổi: view rỗng", async () => {
    const a = await makeMember(t.db, { role: "admin" });
    const v = await getWeekView(t.db, as(a), WED);
    expect(v).toMatchObject({
      day: "2026-10-17",
      status: "open",
      attendees: [],
      schedule: null,
      notice: { kind: "NOT_ENOUGH", count: 0 },
    });
    expect(v.can).toEqual({
      changeOwnAttendance: true,
      manageAttendance: true,
      editResults: false,
    });
  });

  it("3 người: NOT_ENOUGH", async () => {
    const ms = await Promise.all([1, 2, 3, 4].map(() => makeMember(t.db)));
    await attend(ms.slice(0, 3));
    const v = await getWeekView(t.db, as(ms[0]), WED);
    expect(v.notice).toEqual({ kind: "NOT_ENOUGH", count: 3 });
    expect(v.schedule).toBeNull();
    expect(v.actorAttending).toBe(true);
    expect((await getWeekView(t.db, as(ms[3]), WED)).actorAttending).toBe(false);
    expect(v.attendees.every((a) => a.recordedBySelf)).toBe(true);
  });

  it("6 người: nháp 6 trận; sau khi nhập trận 1: khóa, chính thức, có kết quả", async () => {
    const ms = await Promise.all(
      Array.from({ length: 6 }, (_, i) =>
        makeMember(t.db, { role: i === 0 ? "admin" : "member", displayName: `Ten ${i}` }),
      ),
    );
    await attend(ms);
    const v = await getWeekView(t.db, as(ms[1]), WED);
    expect(v.schedule?.source).toBe("draft");
    const key = attendeeKey(ms.map((m) => m.id));
    expect(v.schedule?.key).toBe(key);
    expect(v.schedule?.matches).toHaveLength(6);
    for (const m of v.schedule?.matches ?? []) {
      for (const p of [...m.teamA, ...m.teamB]) expect(p.displayName).toMatch(/^Ten \d$/);
    }
    expect(v.notice).toBeNull();
    const sat = vn("2026-10-17T09:00");
    await enterResult(
      t.db,
      as(ms[0]),
      { day: "2026-10-17", scheduleKey: key, matchNumber: 1, scoreA: 21, scoreB: 15 },
      sat,
    );
    const w = await getWeekView(t.db, as(ms[0]), sat);
    expect(w.status).toBe("locked");
    expect(w.schedule?.source).toBe("official");
    expect(w.schedule?.key).toBe(key);
    expect(w.schedule?.matches[0].result).toEqual({ scoreA: 21, scoreB: 15, version: 1 });
    expect(w.schedule?.matches[1].result).toBeNull();
    expect(w.can).toEqual({
      changeOwnAttendance: false,
      manageAttendance: false,
      editResults: true,
    });
  });

  it("activeMemberCount không tính người đã ngưng", async () => {
    const a = await makeMember(t.db);
    await makeMember(t.db);
    await makeMember(t.db, { active: false });
    expect((await getWeekView(t.db, as(a), WED)).activeMemberCount).toBe(2);
  });

  it("7 người cùng Hạt giống 2 và không có sơ đồ: NO_DIAGRAM", async () => {
    await Promise.all(
      Array.from({ length: 4 }, () => makeMember(t.db, { initialEloTenths: 12000 })),
    );
    const ms = await Promise.all(
      Array.from({ length: 7 }, () => makeMember(t.db, { initialEloTenths: 10000 })),
    );
    await attend(ms);
    const v = await getWeekView(t.db, as(ms[0]), WED);
    expect(v.notice).toEqual({ kind: "NO_DIAGRAM", seed1: 0, seed2: 7 });
    expect(v.schedule).toBeNull();
  });

  it("thông báo chỉ đếm mem đang hoạt động", async () => {
    const ms = await Promise.all(
      Array.from({ length: 5 }, (_, i) => makeMember(t.db, { role: i === 0 ? "admin" : "member" })),
    );
    await attend(ms);
    const sat = vn("2026-10-17T09:00");
    const key = attendeeKey(ms.map((m) => m.id));
    await enterResult(
      t.db,
      as(ms[0]),
      { day: "2026-10-17", scheduleKey: key, matchNumber: 1, scoreA: 21, scoreB: 15 },
      sat,
    );
    await setActive(t.db, as(ms[0]), ms[4].id, false, sat);
    await deleteResult(
      t.db,
      as(ms[0]),
      { day: "2026-10-17", scheduleKey: key, matchNumber: 1 },
      sat,
    );
    const v = await getWeekView(t.db, as(ms[0]), sat);
    expect(v.notice).toEqual({ kind: "NOT_ENOUGH", count: 4 });
  });
});
