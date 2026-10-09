import type { MemberId } from "./types";

export type Seed = 1 | 2;
export type SeedCandidate = { id: MemberId; eloTenths: number; joinedAt: Date };

export function computeSeeds(activeMembers: readonly SeedCandidate[]): Map<MemberId, Seed> {
  const sorted = [...activeMembers].sort(
    (a, b) =>
      b.eloTenths - a.eloTenths ||
      a.joinedAt.getTime() - b.joinedAt.getTime() ||
      (a.id < b.id ? -1 : a.id > b.id ? 1 : 0),
  );
  return new Map(sorted.map((m, i) => [m.id, i < 4 ? 1 : 2] as [MemberId, Seed]));
}
