import { podiumCounts, type Podium } from "./season";
import { memberTotals, pairMembers, pairTotals, rankTotals, type Ranked, type ResultMatch } from "./standings";
import { seasonOf } from "./time";
import type { MemberId, SeasonId } from "./types";

export type StatsFilter = { fromSeason?: SeasonId; toSeason?: SeasonId; memberId?: MemberId };
export type MemberStatRow = Ranked<MemberId> & { podium: Podium };

function inRange(season: SeasonId, filter: StatsFilter): boolean {
  return (filter.fromSeason === undefined || season >= filter.fromSeason)
    && (filter.toSeason === undefined || season <= filter.toSeason);
}

function matchesInRange(matches: readonly ResultMatch[], filter: StatsFilter): ResultMatch[] {
  return matches.filter(m => inRange(seasonOf(m.matchDay), filter));
}

export function seasonStandings(matches: readonly ResultMatch[], season: SeasonId): Ranked<MemberId>[] {
  return rankTotals(memberTotals(matches.filter(m => seasonOf(m.matchDay) === season)));
}

export function memberStats(
  matches: readonly ResultMatch[],
  endedSeasons: ReadonlySet<SeasonId>,
  filter: StatsFilter,
): MemberStatRow[] {
  const inScope = matchesInRange(matches, filter);
  const seasons = new Set(inScope.map(m => seasonOf(m.matchDay)));
  const ended = [...seasons].filter(s => endedSeasons.has(s));
  const podiums = podiumCounts(ended.map(s => seasonStandings(inScope, s)));
  return rankTotals(memberTotals(inScope))
    .filter(r => filter.memberId === undefined || r.key === filter.memberId)
    .map(r => ({ ...r, podium: podiums.get(r.key) ?? { first: 0, second: 0, third: 0, fourth: 0 } }));
}

export function pairStats(matches: readonly ResultMatch[], filter: StatsFilter): Ranked<string>[] {
  return rankTotals(pairTotals(matchesInRange(matches, filter)))
    .filter(r => filter.memberId === undefined || pairMembers(r.key).includes(filter.memberId));
}
