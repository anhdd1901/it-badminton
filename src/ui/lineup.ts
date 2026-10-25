type Side = readonly { id: string }[];

/** How many matches each player has in a schedule. */
export function matchCounts(matches: { teamA: Side; teamB: Side }[]): Map<string, number> {
  const counts = new Map<string, number>();
  for (const m of matches) {
    for (const p of [...m.teamA, ...m.teamB]) counts.set(p.id, (counts.get(p.id) ?? 0) + 1);
  }
  return counts;
}
