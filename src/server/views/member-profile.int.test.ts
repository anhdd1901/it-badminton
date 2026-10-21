import { describe, expect, it } from "vitest";
import { seededRng } from "@/domain/rng";
import { attendeeKey } from "@/domain/schedule";
import type { Actor } from "../actor";
import { setAttendance } from "../match-days/attendance";
import { enterResult } from "../match-days/results";
import { MESSAGES } from "../errors";
import { makeMember, useTestDb, vn } from "../test/db";
import { getMemberProfileView } from "./member-profile";
import { getEloView, getSeasonView, getStatsView } from "./rankings";

describe("getMemberProfileView", () => {
  const t = useTestDb();
  const as = (m: { id: string; role: Actor["role"] }): Actor => ({
    memberId: m.id,
    role: m.role,
    sessionId: "s",
  });
  const NOW = vn("2026-10-04T08:00");

  async function setup() {
    const ms = await Promise.all(
      Array.from({ length: 6 }, (_, i) => makeMember(t.db, { role: i === 0 ? "admin" : "member" })),
    );
    for (const [day, wed, sat] of [
      ["2026-09-26", "2026-09-23T10:00", "2026-09-26T09:00"],
      ["2026-10-03", "2026-09-30T10:00", "2026-10-03T09:00"],
    ]) {
      for (const m of ms) {
        await setAttendance(t.db, as(m), { memberId: m.id, attending: true }, vn(wed), {
          rng: seededRng(1),
        });
      }
      await enterResult(
        t.db,
        as(ms[0]),
        {
          day,
          scheduleKey: attendeeKey(ms.map((m) => m.id)),
          matchNumber: 1,
          scoreA: 21,
          scoreB: 15,
        },
        vn(sat),
      );
    }
    return ms;
  }

  it("khớp getSeasonView và getStatsView", async () => {
    await setup();
    const season = await getSeasonView(t.db, "2026-10", NOW);
    const stats = await getStatsView(t.db, {}, NOW);
    const elo = await getEloView(t.db, NOW);
    expect(season.rows.length).toBeGreaterThan(0);
    for (const row of season.rows) {
      const v = await getMemberProfileView(t.db, row.member.id, "2026-10", NOW);
      const all = stats.members.find((r) => r.key === row.member.id)!;
      const e = elo.rows.find((r) => r.member.id === row.member.id)!;
      const publicRef: Record<string, unknown> = { ...row.member };
      delete publicRef.username;
      expect(v.member).toEqual(publicRef);
      expect(v.member).not.toHaveProperty("username");
      expect(v.season).toEqual({
        id: "2026-10",
        rank: row.rank,
        totals: row.totals,
        diff: row.diff,
      });
      expect(v.allTime).toEqual({ totals: all.totals, diff: all.diff, podium: all.podium });
      expect(v.eloTenths).toBe(e.eloTenths);
      expect(v.seed).toBe(e.seed);
      expect(v.lastMatchDayDelta).toBe(e.lastMatchDayDelta);
    }
  });

  it("podium toàn thời gian khớp getStatsView khi đã có mùa kết thúc", async () => {
    await setup();
    const later = vn("2026-11-02T08:00");
    const stats = await getStatsView(t.db, {}, later);
    const podiumSum = (p: { first: number; second: number; third: number; fourth: number }) =>
      p.first + p.second + p.third + p.fourth;
    expect(stats.members.some((r) => podiumSum(r.podium) > 0)).toBe(true);
    for (const row of stats.members) {
      const v = await getMemberProfileView(t.db, row.key, "2026-10", later);
      expect(v.allTime.podium).toEqual(row.podium);
    }
  });

  it("mem chưa có trận: tổng bằng 0, hạng null, podium toàn 0, ELO là ELO ban đầu", async () => {
    await setup();
    const bench = await makeMember(t.db);
    const v = await getMemberProfileView(t.db, bench.id, "2026-10", NOW);
    const zero = { wins: 0, pointsFor: 0, pointsAgainst: 0, played: 0 };
    expect(v.season).toEqual({ id: "2026-10", rank: null, totals: zero, diff: 0 });
    expect(v.allTime).toEqual({
      totals: zero,
      diff: 0,
      podium: { first: 0, second: 0, third: 0, fourth: 0 },
    });
    expect(v.lastMatchDayDelta).toBeNull();
    const elo = (await getEloView(t.db, NOW)).rows.find((r) => r.member.id === bench.id)!;
    expect(v.eloTenths).toBe(elo.eloTenths);
  });

  it("mem đã ngưng: seed null, ELO vẫn có", async () => {
    await setup();
    const idle = await makeMember(t.db, { active: false });
    const v = await getMemberProfileView(t.db, idle.id, "2026-10", NOW);
    expect(v.seed).toBeNull();
    expect(v.member.active).toBe(false);
    expect(typeof v.eloTenths).toBe("number");
  });

  it("id không phải uuid → AppError (parseMemberId: NOT_FOUND)", async () => {
    await expect(getMemberProfileView(t.db, "abc", "2026-10", NOW)).rejects.toMatchObject({
      name: "AppError",
      code: "NOT_FOUND",
    });
  });

  it("uuid không tồn tại → AppError NOT_FOUND với MESSAGES.memberNotFound", async () => {
    await expect(
      getMemberProfileView(t.db, "00000000-0000-4000-8000-000000000000", "2026-10", NOW),
    ).rejects.toMatchObject({ code: "NOT_FOUND", message: MESSAGES.memberNotFound });
  });

  it("mùa sai định dạng → VALIDATION", async () => {
    const m = await makeMember(t.db);
    await expect(getMemberProfileView(t.db, m.id, "abc", NOW)).rejects.toMatchObject({
      code: "VALIDATION",
    });
  });
});
