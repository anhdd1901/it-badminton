import type { MemberId, Pair } from "./types";

export type Lineup = { teamA: Pair; teamB: Pair };

/** Shown to the admin when a match lineup breaks the rule. Single source for the Vietnamese text. */
export const LINEUP_INVALID = "Mỗi trận cần 4 người khác nhau có tên trong lịch của buổi";

/** True when the four players are distinct and all belong to the match day's roster. */
export function checkLineup(lineup: Lineup, roster: ReadonlySet<MemberId>): boolean {
  const ids = [...lineup.teamA, ...lineup.teamB];
  if (new Set(ids).size !== 4) return false;
  return ids.every((id) => roster.has(id));
}
