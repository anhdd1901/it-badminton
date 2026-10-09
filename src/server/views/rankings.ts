import { eq, inArray } from "drizzle-orm";
import { isSeasonEnded, type LastDayResults } from "@/domain/season";
import { memberStats, type MemberStatRow, pairStats, seasonStandings, type StatsFilter } from "@/domain/stats";
import { pairMembers, type Ranked } from "@/domain/standings";
import { lastMatchDayOfSeason, seasonOf } from "@/domain/time";
import type { SeasonId } from "@/domain/types";
import { loadCurrentSeeds, loadEloState, loadResultMatches } from "../data/loaders";
import type { Db, Tx } from "../db/client";
import { matchDays, matchResults, members, officialSchedules, scheduledMatches } from "../db/schema";
import { finalizeDue } from "../match-days/schedule";
import { parseSeasonId } from "../validation";

export type MemberRef = { id: string; displayName: string; username: string; avatarUrl: string | null; active: boolean };

export async function loadMemberRefs(db: Db | Tx, ids: readonly string[]): Promise<Map<string, MemberRef>> {
  if (ids.length === 0) return new Map();
  const rows = await db
    .select({
      id: members.id,
      displayName: members.displayName,
      username: members.username,
      avatarUrl: members.avatarUrl,
      active: members.active,
    })
    .from(members)
    .where(inArray(members.id, [...new Set(ids)]));
  return new Map(rows.map((r) => [r.id, r]));
}

function ref(refs: Map<string, MemberRef>, id: string): MemberRef {
  const m = refs.get(id);
  if (!m) throw new Error(`Thiếu mem ${id}`);
  return m;
}

export async function endedSeasons(db: Db, now: Date): Promise<Set<SeasonId>> {
  await finalizeDue(db, now);
  const matches = await loadResultMatches(db);
  const seasons = [...new Set(matches.map((m) => seasonOf(m.matchDay)))];
  if (seasons.length === 0) return new Set();
  const lastDays = new Map(seasons.map((s) => [lastMatchDayOfSeason(s), s]));
  const rows = await db
    .select({ day: matchDays.day, matchId: scheduledMatches.id, enteredAt: matchResults.enteredAt })
    .from(scheduledMatches)
    .innerJoin(officialSchedules, eq(scheduledMatches.officialScheduleId, officialSchedules.id))
    .innerJoin(matchDays, eq(officialSchedules.matchDayId, matchDays.id))
    .leftJoin(matchResults, eq(matchResults.scheduledMatchId, scheduledMatches.id))
    .where(inArray(matchDays.day, [...lastDays.keys()]));
  const ended = new Set<SeasonId>();
  for (const [day, season] of lastDays) {
    const dayRows = rows.filter((r) => r.day === day);
    const lastDay: LastDayResults = {
      officialMatchCount: dayRows.length,
      resultEnteredAts: dayRows.flatMap((r) => (r.enteredAt ? [r.enteredAt] : [])),
    };
    if (isSeasonEnded(season, lastDay, now)) ended.add(season);
  }
  return ended;
}

export async function getSeasonView(
  db: Db,
  season: string,
  now: Date,
): Promise<{ season: SeasonId; ended: boolean; rows: (Ranked<string> & { member: MemberRef })[] }> {
  const id = parseSeasonId(season);
  await finalizeDue(db, now);
  const standings = seasonStandings(await loadResultMatches(db), id);
  const [refs, ended] = await Promise.all([
    loadMemberRefs(db, standings.map((r) => r.key)),
    endedSeasons(db, now),
  ]);
  return {
    season: id,
    ended: ended.has(id),
    rows: standings.map((r) => ({ ...r, member: ref(refs, r.key) })),
  };
}

export async function getEloView(
  db: Db,
  now: Date,
): Promise<{ rows: { member: MemberRef; eloTenths: number; seed: 1 | 2; lastMatchDayDelta: number | null }[] }> {
  await finalizeDue(db, now);
  const [state, seeds, active] = await Promise.all([
    loadEloState(db),
    loadCurrentSeeds(db),
    db
      .select({
        id: members.id,
        displayName: members.displayName,
        username: members.username,
        avatarUrl: members.avatarUrl,
        active: members.active,
        initial: members.initialEloTenths,
        createdAt: members.createdAt,
      })
      .from(members)
      .where(eq(members.active, true)),
  ]);
  const rows = active.map((m) => ({
    member: { id: m.id, displayName: m.displayName, username: m.username, avatarUrl: m.avatarUrl, active: m.active },
    eloTenths: state.current.get(m.id) ?? m.initial,
    seed: (seeds.get(m.id) ?? 2) as 1 | 2,
    lastMatchDayDelta: state.lastMatchDayDelta.get(m.id) ?? null,
    createdAt: m.createdAt.getTime(),
  }));
  rows.sort(
    (a, b) =>
      b.eloTenths - a.eloTenths ||
      a.createdAt - b.createdAt ||
      (a.member.id < b.member.id ? -1 : a.member.id > b.member.id ? 1 : 0),
  );
  return { rows: rows.map((r) => ({ member: r.member, eloTenths: r.eloTenths, seed: r.seed, lastMatchDayDelta: r.lastMatchDayDelta })) };
}

export async function getStatsView(
  db: Db,
  filter: StatsFilter,
  now: Date,
): Promise<{
  members: (MemberStatRow & { member: MemberRef })[];
  pairs: (Ranked<string> & { members: [MemberRef, MemberRef] })[];
}> {
  const f: StatsFilter = { memberId: filter.memberId };
  if (filter.fromSeason !== undefined) f.fromSeason = parseSeasonId(filter.fromSeason);
  if (filter.toSeason !== undefined) f.toSeason = parseSeasonId(filter.toSeason);
  await finalizeDue(db, now);
  const [matches, ended] = await Promise.all([loadResultMatches(db), endedSeasons(db, now)]);
  const memberRows = memberStats(matches, ended, f);
  const pairRows = pairStats(matches, f);
  const refs = await loadMemberRefs(db, [
    ...memberRows.map((r) => r.key),
    ...pairRows.flatMap((r) => pairMembers(r.key)),
  ]);
  return {
    members: memberRows.map((r) => ({ ...r, member: ref(refs, r.key) })),
    pairs: pairRows.map((r) => {
      const [x, y] = pairMembers(r.key);
      return { ...r, members: [ref(refs, x), ref(refs, y)] as [MemberRef, MemberRef] };
    }),
  };
}
