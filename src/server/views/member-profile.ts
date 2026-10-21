import { eq } from "drizzle-orm";
import type { Podium } from "@/domain/season";
import type { Totals } from "@/domain/standings";
import { memberStats, seasonStandings } from "@/domain/stats";
import type { SeasonId } from "@/domain/types";
import { loadCurrentSeeds, loadEloState, loadResultMatches } from "../data/loaders";
import type { Db } from "../db/client";
import { members } from "../db/schema";
import { AppError, MESSAGES } from "../errors";
import { finalizeDue } from "../match-days/schedule";
import { parseMemberId, parseSeasonId } from "../validation";
import { endedSeasons, type MemberRef } from "./rankings";

export type MemberProfileView = {
  member: MemberRef;
  eloTenths: number;
  seed: 1 | 2 | null; // null when the member is inactive
  lastMatchDayDelta: number | null;
  season: { id: SeasonId; rank: number | null; totals: Totals; diff: number };
  allTime: { totals: Totals; diff: number; podium: Podium };
};

const zeroTotals = (): Totals => ({ wins: 0, pointsFor: 0, pointsAgainst: 0, played: 0 });

export async function getMemberProfileView(
  db: Db,
  memberId: string,
  season: string,
  now: Date,
): Promise<MemberProfileView> {
  const id = parseMemberId(memberId);
  const seasonId = parseSeasonId(season);
  const [row] = await db
    .select({
      id: members.id,
      displayName: members.displayName,
      username: members.username,
      avatarUrl: members.avatarUrl,
      active: members.active,
      initial: members.initialEloTenths,
    })
    .from(members)
    .where(eq(members.id, id));
  if (!row) throw new AppError("NOT_FOUND", MESSAGES.memberNotFound);
  await finalizeDue(db, now);
  const [matches, state, seeds, ended] = await Promise.all([
    loadResultMatches(db),
    loadEloState(db),
    loadCurrentSeeds(db),
    endedSeasons(db, now),
  ]);
  const inSeason = seasonStandings(matches, seasonId).find((r) => r.key === id);
  const all = memberStats(matches, ended, { memberId: id })[0];
  const { initial, ...member } = row;
  return {
    member,
    eloTenths: state.current.get(id) ?? initial,
    seed: row.active ? ((seeds.get(id) ?? 2) as 1 | 2) : null,
    lastMatchDayDelta: state.lastMatchDayDelta.get(id) ?? null,
    season: {
      id: seasonId,
      rank: inSeason?.rank ?? null,
      totals: inSeason?.totals ?? zeroTotals(),
      diff: inSeason?.diff ?? 0,
    },
    allTime: {
      totals: all?.totals ?? zeroTotals(),
      diff: all?.diff ?? 0,
      podium: all?.podium ?? { first: 0, second: 0, third: 0, fourth: 0 },
    },
  };
}
