import { diagramSlots, findDiagram } from "./diagrams";
import { shuffle } from "./rng";
import type { Seed } from "./seeding";
import type { MemberId, Pair, Rng } from "./types";

export type Attendee = { id: MemberId; seed: Seed };
export type SlotAssignment = { memberId: MemberId; slot: number; seed: Seed };
export type GeneratedSchedule = {
  diagramId: string;
  assignments: SlotAssignment[];
  matches: { number: number; teamA: Pair; teamB: Pair }[];
};
export type ScheduleResult =
  | { ok: true; schedule: GeneratedSchedule }
  | { ok: false; error: "NOT_ENOUGH"; count: number }
  | { ok: false; error: "NO_DIAGRAM"; seed1: number; seed2: number };

export function attendeeKey(ids: readonly MemberId[]): string {
  return [...new Set(ids)].sort().join(",");
}

export function noDiagramMessage(seed1: number, seed2: number): string {
  return `Chưa có sơ đồ cho ${seed1} Hạt giống 1 + ${seed2} Hạt giống 2, liên hệ admin`;
}

export function generateSchedule(attendees: readonly Attendee[], rng: Rng): ScheduleResult {
  const unique = [...new Map(attendees.map((a) => [a.id, a])).values()];
  if (unique.length < 5) return { ok: false, error: "NOT_ENOUGH", count: unique.length };

  const seed1 = unique.filter((a) => a.seed === 1);
  const seed2 = unique.filter((a) => a.seed === 2);
  const diagram = findDiagram(unique.length, seed1.length, seed2.length);
  if (!diagram) return { ok: false, error: "NO_DIAGRAM", seed1: seed1.length, seed2: seed2.length };

  let assignments: SlotAssignment[];
  if (unique.length === 5) {
    assignments = shuffle(unique, rng).map((a, i) => ({ memberId: a.id, slot: i + 1, seed: a.seed }));
  } else {
    assignments = [
      ...shuffle(seed1, rng).map((a, i) => ({ memberId: a.id, slot: 1 + i, seed: a.seed })),
      ...shuffle(seed2, rng).map((a, i) => ({ memberId: a.id, slot: 5 + i, seed: a.seed })),
    ];
  }

  const bySlot = new Map(assignments.map((a) => [a.slot, a.memberId]));
  const slotId = (s: number): MemberId => {
    const id = bySlot.get(s);
    if (id === undefined) throw new Error(`Diagram ${diagram.id} references unassigned slot ${s}`);
    return id;
  };
  const known = new Set(diagramSlots(diagram));
  if (assignments.some((a) => !known.has(a.slot))) {
    throw new Error(`Diagram ${diagram.id} does not contain all assigned slots`);
  }

  const matches = diagram.matches.map(([a, b], i) => ({
    number: i + 1,
    teamA: [slotId(a[0]), slotId(a[1])] as Pair,
    teamB: [slotId(b[0]), slotId(b[1])] as Pair,
  }));
  return { ok: true, schedule: { diagramId: diagram.id, assignments, matches } };
}
