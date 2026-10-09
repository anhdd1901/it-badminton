import { describe, expect, it } from "vitest";
import { seededRng } from "@/domain/rng";
import { attendeeKey } from "@/domain/schedule";
import { seasonStandings } from "@/domain/stats";
import type { Actor } from "../actor";
import { loadResultMatches } from "../data/loaders";
import { setAttendance } from "../match-days/attendance";
import { enterResult } from "../match-days/results";
import { makeMember, useTestDb, vn } from "../test/db";
import { endedSeasons, getEloView, getSeasonView, getStatsView } from "./rankings";

describe("rankings views", () => {
  const t = useTestDb();
  const as = (m: { id: string; role: Actor["role"] }): Actor => ({ memberId: m.id, role: m.role, sessionId: "s" });

  async function setup() {
    const ms = await Promise.all(
      Array.from({ length: 6 }, (_, i) => makeMember(t.db, { role: i === 0 ? "admin" : "member" })),
    );
    const idle = await makeMember(t.db, { active: false });
    for (const [day, wed, sat] of [
      ["2026-09-26", "2026-09-23T10:00", "2026-09-26T09:00"],
      ["2026-10-03", "2026-09-30T10:00", "2026-10-03T09:00"],
    ]) {
      for (const m of ms) {
        await setAttendance(t.db, as(m), { memberId: m.id, attending: true }, vn(wed), { rng: seededRng(1) });
      }
      await enterResult(t.db, as(ms[0]), { day, scheduleKey: attendeeKey(ms.map((m) => m.id)), matchNumber: 1, scoreA: 21, scoreB: 15 }, vn(sat));
    }
    return { ms, idle };
  }

  it("getSeasonView: ended theo thời điểm, hạng 1 khớp domain", async () => {
    await setup();
    const sep = await getSeasonView(t.db, "2026-09", vn("2026-10-01T08:00"));
    expect(sep.ended).toBe(true);
    const direct = seasonStandings(await loadResultMatches(t.db), "2026-09");
    expect(sep.rows[0].key).toBe(direct[0].key);
    expect(sep.rows[0].member.id).toBe(direct[0].key);
    expect((await getSeasonView(t.db, "2026-10", vn("2026-10-04T08:00"))).ended).toBe(false);
    expect(await endedSeasons(t.db, vn("2026-10-01T08:00"))).toEqual(new Set(["2026-09"]));
    await expect(getSeasonView(t.db, "abc", vn("2026-10-01T08:00"))).rejects.toMatchObject({ code: "VALIDATION" });
  });

  it("getEloView: bỏ mem ngưng, người không đánh có delta null", async () => {
    const { ms, idle } = await setup();
    const bench = await makeMember(t.db);
    const v = await getEloView(t.db, vn("2026-10-04T08:00"));
    expect(v.rows).toHaveLength(7);
    expect(v.rows.some((r) => r.member.id === idle.id)).toBe(false);
    for (let i = 1; i < v.rows.length; i++) {
      expect(v.rows[i - 1].eloTenths).toBeGreaterThanOrEqual(v.rows[i].eloTenths);
    }
    expect(v.rows.filter((r) => r.lastMatchDayDelta === null).map((r) => r.member.id)).toEqual([bench.id]);
    expect(v.rows.map((r) => r.member.id).sort()).toEqual([...ms, bench].map((m) => m.id).sort());
  });

  it("getStatsView: lọc theo mem", async () => {
    await setup();
    const now = vn("2026-10-04T08:00");
    const all = await getStatsView(t.db, {}, now);
    const one = all.members[0].key;
    const f = await getStatsView(t.db, { memberId: one }, now);
    expect(f.members).toHaveLength(1);
    expect(f.members[0].podium).toEqual(all.members[0].podium);
    expect(f.pairs.every((p) => p.members.some((m) => m.id === one))).toBe(true);
    await expect(getStatsView(t.db, { fromSeason: "x" }, now)).rejects.toMatchObject({ code: "VALIDATION" });
  });
});
