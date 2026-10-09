import { asc, eq } from "drizzle-orm";
import { type EloInput, type EloState, replayElo } from "@/domain/elo";
import { computeSeeds, type Seed } from "@/domain/seeding";
import type { ResultMatch } from "@/domain/standings";
import type { Db, Tx } from "../db/client";
import {
  eloAdjustments,
  matchDays,
  matchResults,
  members,
  officialSchedules,
  scheduledMatches,
} from "../db/schema";

/** Official-schedule matches that have a result, every match day, ordered by day then number. */
export async function loadResultMatches(db: Db | Tx): Promise<ResultMatch[]> {
  const rows = await db
    .select({
      matchDay: matchDays.day,
      number: scheduledMatches.number,
      a1: scheduledMatches.a1,
      a2: scheduledMatches.a2,
      b1: scheduledMatches.b1,
      b2: scheduledMatches.b2,
      scoreA: matchResults.scoreA,
      scoreB: matchResults.scoreB,
    })
    .from(matchResults)
    .innerJoin(scheduledMatches, eq(matchResults.scheduledMatchId, scheduledMatches.id))
    .innerJoin(officialSchedules, eq(scheduledMatches.officialScheduleId, officialSchedules.id))
    .innerJoin(matchDays, eq(officialSchedules.matchDayId, matchDays.id))
    .orderBy(asc(matchDays.day), asc(scheduledMatches.number));
  return rows.map((r) => ({
    matchDay: r.matchDay,
    number: r.number,
    teamA: [r.a1, r.a2],
    teamB: [r.b1, r.b2],
    scoreA: r.scoreA,
    scoreB: r.scoreB,
  }));
}

/** Initial ELO of every member (inactive included), all matches and all admin adjustments. */
export async function loadEloInput(db: Db | Tx): Promise<EloInput> {
  const [memberRows, matches, adjustments] = await Promise.all([
    db.select({ id: members.id, initial: members.initialEloTenths }).from(members),
    loadResultMatches(db),
    db
      .select({
        memberId: eloAdjustments.memberId,
        eloTenths: eloAdjustments.eloTenths,
        at: eloAdjustments.at,
      })
      .from(eloAdjustments)
      .orderBy(asc(eloAdjustments.at), asc(eloAdjustments.id)),
  ]);
  return { initial: new Map(memberRows.map((m) => [m.id, m.initial])), matches, adjustments };
}

export async function loadEloState(db: Db | Tx): Promise<EloState> {
  return replayElo(await loadEloInput(db));
}

/** Seeds over active members only, using current ELO; joinedAt = created_at. */
export async function loadCurrentSeeds(db: Db | Tx): Promise<Map<string, Seed>> {
  const [state, active] = await Promise.all([
    loadEloState(db),
    db
      .select({ id: members.id, initial: members.initialEloTenths, joinedAt: members.createdAt })
      .from(members)
      .where(eq(members.active, true)),
  ]);
  return computeSeeds(
    active.map((m) => ({
      id: m.id,
      eloTenths: state.current.get(m.id) ?? m.initial,
      joinedAt: m.joinedAt,
    })),
  );
}
