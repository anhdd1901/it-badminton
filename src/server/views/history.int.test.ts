import { describe, expect, it } from "vitest";
import { seededRng } from "@/domain/rng";
import { attendeeKey } from "@/domain/schedule";
import type { Actor } from "../actor";
import { setAttendance } from "../match-days/attendance";
import { enterResult } from "../match-days/results";
import { makeMember, useTestDb, vn } from "../test/db";
import { getHistory, getMatchDayDetail } from "./history";

describe("history views", () => {
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

  it("getHistory: tháng 10 trước tháng 9, có số liệu", async () => {
    await setup();
    const h = await getHistory(t.db, NOW);
    expect(h.map((g) => g.season)).toEqual(["2026-10", "2026-09"]);
    expect(h[0].days).toEqual([
      { day: "2026-10-03", playerCount: 6, matchCount: 6, resultCount: 1 },
    ]);
  });

  it("getMatchDayDetail: chi tiết, null, VALIDATION", async () => {
    const ms = await setup();
    const d = await getMatchDayDetail(t.db, "2026-10-03", NOW);
    expect(d?.participants).toHaveLength(6);
    expect(new Set(d?.roster.map((p) => p.id))).toEqual(new Set(d?.participants.map((p) => p.id)));
    for (const p of d?.roster ?? [])
      expect(Object.keys(p).sort()).toEqual(["avatarUrl", "displayName", "id"]);
    expect(d?.key).toBe(attendeeKey(ms.map((m) => m.id)));
    expect(d?.matches).toHaveLength(6);
    expect(d?.matches[0].result).toEqual({ scoreA: 21, scoreB: 15, version: 1 });
    expect(d?.matches[1].result).toBeNull();
    expect(await getMatchDayDetail(t.db, "2026-10-10", NOW)).toBeNull();
    await expect(getMatchDayDetail(t.db, "2026-10-16", NOW)).rejects.toMatchObject({
      code: "VALIDATION",
      message: "Ngày thi đấu không hợp lệ",
    });
  });
});
