import { beforeEach, describe, expect, it } from "vitest";
import {
  eloAdjustments,
  matchDays,
  matchResults,
  officialSchedules,
  scheduledMatches,
} from "../db/schema";
import { makeMember, useTestDb, vn } from "../test/db";
import { loadCurrentSeeds, loadEloState, loadResultMatches } from "./loaders";

describe("loaders", () => {
  const t = useTestDb();
  let ids: Record<"a" | "b" | "c" | "d" | "e" | "inactive", string>;

  beforeEach(async () => {
    const a = await makeMember(t.db);
    const b = await makeMember(t.db);
    const c = await makeMember(t.db);
    const d = await makeMember(t.db);
    const e = await makeMember(t.db);
    const inactive = await makeMember(t.db, { active: false });
    ids = { a: a.id, b: b.id, c: c.id, d: d.id, e: e.id, inactive: inactive.id };
    const now = vn("2026-10-10T08:00");
    const [day] = await t.db
      .insert(matchDays)
      .values({ day: "2026-10-10" })
      .returning({ id: matchDays.id });
    const [sched] = await t.db
      .insert(officialSchedules)
      .values({
        matchDayId: day.id,
        attendeeKey: "key",
        diagramId: "5",
        assignments: [a, b, c, d].map((m, i) => ({
          memberId: m.id,
          slot: i + 1,
          seed: 1 as const,
        })),
        createdAt: now,
      })
      .returning({ id: officialSchedules.id });
    const rows = await t.db
      .insert(scheduledMatches)
      .values([
        { officialScheduleId: sched.id, number: 1, a1: a.id, a2: b.id, b1: c.id, b2: d.id },
        { officialScheduleId: sched.id, number: 2, a1: a.id, a2: c.id, b1: b.id, b2: d.id },
      ])
      .returning({ id: scheduledMatches.id, number: scheduledMatches.number });
    const one = rows.find((r) => r.number === 1);
    if (!one) throw new Error("fixture");
    await t.db.insert(matchResults).values({
      scheduledMatchId: one.id,
      scoreA: 21,
      scoreB: 15,
      enteredBy: a.id,
      enteredAt: now,
    });
    await t.db
      .insert(eloAdjustments)
      .values({ memberId: e.id, eloTenths: 12000, adjustedBy: a.id, at: vn("2026-10-12T09:00") });
  });

  it("chỉ lấy trận có kết quả, đúng định dạng", async () => {
    const ms = await loadResultMatches(t.db);
    expect(ms).toEqual([
      {
        matchDay: "2026-10-10",
        number: 1,
        teamA: [ids.a, ids.b],
        teamB: [ids.c, ids.d],
        scoreA: 21,
        scoreB: 15,
      },
    ]);
  });
  it("ELO hiện tại gồm trận và mốc điều chỉnh; mem đã ngưng vẫn có ELO", async () => {
    const s = await loadEloState(t.db);
    expect(s.current.get(ids.a)).toBe(10160);
    expect(s.current.get(ids.e)).toBe(12000);
    expect(s.current.get(ids.inactive)).toBe(10000);
  });
  it("hạt giống chỉ xét mem đang hoạt động", async () => {
    const seeds = await loadCurrentSeeds(t.db);
    expect(seeds.has(ids.inactive)).toBe(false);
    expect(seeds.has(ids.a)).toBe(true);
  });
});
