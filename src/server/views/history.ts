import { asc, desc, eq, sql } from "drizzle-orm";
import { seasonOf } from "@/domain/time";
import type { LocalDate, SeasonId } from "@/domain/types";
import type { Db } from "../db/client";
import { matchDays, matchResults, officialSchedules, scheduledMatches } from "../db/schema";
import { finalizeDue } from "../match-days/schedule";
import { parseLocalDate } from "../validation";
import { loadMemberRefs, type MemberRef } from "./rankings";
import type { PlayerRef, WeekMatch } from "./week";

type HistoryDay = { day: LocalDate; playerCount: number; matchCount: number; resultCount: number };

export async function getHistory(
  db: Db,
  now: Date,
): Promise<{ season: SeasonId; days: HistoryDay[] }[]> {
  await finalizeDue(db, now);
  const [days, counts] = await Promise.all([
    db
      .select({
        id: officialSchedules.id,
        day: matchDays.day,
        assignments: officialSchedules.assignments,
      })
      .from(officialSchedules)
      .innerJoin(matchDays, eq(officialSchedules.matchDayId, matchDays.id))
      .orderBy(desc(matchDays.day)),
    db
      .select({
        scheduleId: scheduledMatches.officialScheduleId,
        matchCount: sql<number>`count(*)::int`,
        resultCount: sql<number>`count(${matchResults.scheduledMatchId})::int`,
      })
      .from(scheduledMatches)
      .leftJoin(matchResults, eq(matchResults.scheduledMatchId, scheduledMatches.id))
      .groupBy(scheduledMatches.officialScheduleId),
  ]);
  const countOf = new Map(counts.map((c) => [c.scheduleId, c]));
  const groups: { season: SeasonId; days: HistoryDay[] }[] = [];
  for (const d of days) {
    const season = seasonOf(d.day);
    let group = groups.find((g) => g.season === season);
    if (!group) {
      group = { season, days: [] };
      groups.push(group);
    }
    const c = countOf.get(d.id);
    group.days.push({
      day: d.day,
      playerCount: d.assignments.length,
      matchCount: c?.matchCount ?? 0,
      resultCount: c?.resultCount ?? 0,
    });
  }
  return groups;
}

export async function getMatchDayDetail(
  db: Db,
  day: string,
  now: Date,
): Promise<{
  day: LocalDate;
  key: string;
  participants: MemberRef[];
  matches: WeekMatch[];
} | null> {
  const localDay = parseLocalDate(day);
  await finalizeDue(db, now);
  const [official] = await db
    .select({
      id: officialSchedules.id,
      key: officialSchedules.attendeeKey,
      assignments: officialSchedules.assignments,
    })
    .from(officialSchedules)
    .innerJoin(matchDays, eq(officialSchedules.matchDayId, matchDays.id))
    .where(eq(matchDays.day, localDay));
  if (!official) return null;
  const rows = await db
    .select({
      number: scheduledMatches.number,
      a1: scheduledMatches.a1,
      a2: scheduledMatches.a2,
      b1: scheduledMatches.b1,
      b2: scheduledMatches.b2,
      scoreA: matchResults.scoreA,
      scoreB: matchResults.scoreB,
      version: matchResults.version,
    })
    .from(scheduledMatches)
    .leftJoin(matchResults, eq(matchResults.scheduledMatchId, scheduledMatches.id))
    .where(eq(scheduledMatches.officialScheduleId, official.id))
    .orderBy(asc(scheduledMatches.number));
  const ids = [
    ...official.assignments.map((a) => a.memberId),
    ...rows.flatMap((r) => [r.a1, r.a2, r.b1, r.b2]),
  ];
  const refs = await loadMemberRefs(db, ids);
  const seedOf = new Map(official.assignments.map((a) => [a.memberId, a.seed]));
  const player = (id: string): PlayerRef => {
    const m = refs.get(id);
    return {
      id,
      displayName: m?.displayName ?? "",
      avatarUrl: m?.avatarUrl ?? null,
      seed: seedOf.get(id) ?? null,
    };
  };
  return {
    day: localDay,
    key: official.key,
    participants: official.assignments.flatMap((a) => {
      const m = refs.get(a.memberId);
      return m ? [m] : [];
    }),
    matches: rows.map((r) => ({
      number: r.number,
      teamA: [player(r.a1), player(r.a2)],
      teamB: [player(r.b1), player(r.b2)],
      result:
        r.scoreA === null || r.scoreB === null || r.version === null
          ? null
          : { scoreA: r.scoreA, scoreB: r.scoreB, version: r.version },
    })),
  };
}
