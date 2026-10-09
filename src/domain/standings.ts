import type { LocalDate, MemberId, Pair } from "./types";

export type ResultMatch = {
  matchDay: LocalDate; number: number;
  teamA: Pair; teamB: Pair; scoreA: number; scoreB: number;   // tỷ số đã hợp lệ
};
export type Totals = { wins: number; pointsFor: number; pointsAgainst: number; played: number };
export type Ranked<K> = { key: K; rank: number; totals: Totals; diff: number };

const emptyTotals = (): Totals => ({ wins: 0, pointsFor: 0, pointsAgainst: 0, played: 0 });

/** Adds one side's result of a match into the totals stored under `key`. */
function accumulate<K>(map: Map<K, Totals>, key: K, pointsFor: number, pointsAgainst: number): void {
  const t = map.get(key) ?? emptyTotals();
  map.set(key, {
    wins: t.wins + (pointsFor > pointsAgainst ? 1 : 0),
    pointsFor: t.pointsFor + pointsFor,
    pointsAgainst: t.pointsAgainst + pointsAgainst,
    played: t.played + 1,
  });
}

/** Per-member totals across all matches; each member of both teams gets that match's result. */
export function memberTotals(matches: readonly ResultMatch[]): Map<MemberId, Totals> {
  const map = new Map<MemberId, Totals>();
  for (const match of matches) {
    for (const member of match.teamA) accumulate(map, member, match.scoreA, match.scoreB);
    for (const member of match.teamB) accumulate(map, member, match.scoreB, match.scoreA);
  }
  return map;
}

const PAIR_SEPARATOR = "|";

/** Order-independent key for a pair: sorted member ids joined by "|". */
export function pairKey(pair: Pair): string {
  return [...pair].sort().join(PAIR_SEPARATOR);
}

/** Inverse of `pairKey`: the two member ids (sorted) behind a key. */
export function pairMembers(key: string): Pair {
  const [first, second] = key.split(PAIR_SEPARATOR);
  return [first, second];
}

/** Per-pair totals across all matches, keyed by `pairKey`. */
export function pairTotals(matches: readonly ResultMatch[]): Map<string, Totals> {
  const map = new Map<string, Totals>();
  for (const match of matches) {
    accumulate(map, pairKey(match.teamA), match.scoreA, match.scoreB);
    accumulate(map, pairKey(match.teamB), match.scoreB, match.scoreA);
  }
  return map;
}

/**
 * Sorts rows by wins, diff, pointsFor (all desc), then pointsAgainst and played (asc).
 * Rows equal on all five criteria share a rank and the next distinct row takes its
 * 1-based position (competition ranking: 1, 1, 3). Ties are listed by `String(key)`.
 */
export function rankTotals<K>(rows: ReadonlyMap<K, Totals>): Ranked<K>[] {
  const sorted = [...rows].map(([key, totals]) => ({
    key,
    totals,
    diff: totals.pointsFor - totals.pointsAgainst,
  })).sort((a, b) =>
    b.totals.wins - a.totals.wins ||
    b.diff - a.diff ||
    b.totals.pointsFor - a.totals.pointsFor ||
    a.totals.pointsAgainst - b.totals.pointsAgainst ||
    a.totals.played - b.totals.played ||
    compareText(String(a.key), String(b.key))
  );

  const ranked: Ranked<K>[] = [];
  sorted.forEach((row, index) => {
    const prev = ranked[index - 1];
    const tiedWithPrev = prev !== undefined && sameStanding(prev, row);
    ranked.push({ ...row, rank: tiedWithPrev ? prev.rank : index + 1 });
  });
  return ranked;
}

function compareText(a: string, b: string): number {
  return a < b ? -1 : a > b ? 1 : 0;
}

function sameStanding(a: { totals: Totals; diff: number }, b: { totals: Totals; diff: number }): boolean {
  return a.totals.wins === b.totals.wins &&
    a.diff === b.diff &&
    a.totals.pointsFor === b.totals.pointsFor &&
    a.totals.pointsAgainst === b.totals.pointsAgainst &&
    a.totals.played === b.totals.played;
}
