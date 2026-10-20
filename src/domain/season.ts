import { checkInClosesAt, lastMatchDayOfSeason } from "./time";
import type { Ranked } from "./standings";
import type { MemberId, SeasonId } from "./types";

export type LastDayResults = { officialMatchCount: number; resultEnteredAts: readonly Date[] };

/**
 * When a season ends: noon of its last Saturday, or earlier when every official
 * match of that day has its result entered (then the latest entry time).
 *
 * Contract: `lastDay.resultEnteredAts` must hold exactly one timestamp per official
 * match of the season's last Saturday that has a result, and no timestamps from other days.
 */
export function seasonEndsAt(season: SeasonId, lastDay: LastDayResults): Date {
  const noon = checkInClosesAt(lastMatchDayOfSeason(season));
  const { officialMatchCount, resultEnteredAts } = lastDay;
  if (officialMatchCount > 0 && resultEnteredAts.length === officialMatchCount) {
    const latest = Math.max(...resultEnteredAts.map((d) => d.getTime()));
    return new Date(Math.min(noon.getTime(), latest));
  }
  return new Date(noon.getTime());
}

export function isSeasonEnded(season: SeasonId, lastDay: LastDayResults, now: Date): boolean {
  return now.getTime() >= seasonEndsAt(season, lastDay).getTime();
}

export type Podium = { first: number; second: number; third: number; fourth: number };

/** Counts how often each member finished 1st–4th across ended seasons (ties count for everyone tied). */
export function podiumCounts(
  endedSeasonStandings: readonly Ranked<MemberId>[][],
): Map<MemberId, Podium> {
  const counts = new Map<MemberId, Podium>();
  for (const standings of endedSeasonStandings) {
    for (const row of standings) {
      const field = PODIUM_FIELDS[row.rank];
      if (!field) continue;
      const podium = counts.get(row.key) ?? { first: 0, second: 0, third: 0, fourth: 0 };
      podium[field] += 1;
      counts.set(row.key, podium);
    }
  }
  return counts;
}

const PODIUM_FIELDS: Record<number, keyof Podium> = {
  1: "first",
  2: "second",
  3: "third",
  4: "fourth",
};
