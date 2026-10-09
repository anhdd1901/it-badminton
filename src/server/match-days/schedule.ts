import { and, eq, sql } from "drizzle-orm";
import { attendeeKey, generateSchedule } from "@/domain/schedule";
import type { LocalDate, Rng } from "@/domain/types";
import { loadCurrentSeeds } from "../data/loaders";
import type { Db, Tx } from "../db/client";
import {
  attendances,
  draftSchedules,
  matchDays,
  matchResults,
  officialSchedules,
  scheduledMatches,
} from "../db/schema";

export type DraftRow = typeof draftSchedules.$inferSelect;

/** Placeholder: Task 6 finalizes match days whose check-in has closed. */
export async function finalizeDue(db: Db, now: Date): Promise<void> {
  void db;
  void now;
}

/** Call after lockMatchDay, inside the caller's transaction. */
export async function getOrCreateMatchDay(
  tx: Tx,
  day: LocalDate,
): Promise<{ id: string; finalizedAt: Date | null }> {
  await tx.insert(matchDays).values({ day }).onConflictDoNothing({ target: matchDays.day });
  const [row] = await tx
    .select({ id: matchDays.id, finalizedAt: matchDays.finalizedAt })
    .from(matchDays)
    .where(eq(matchDays.day, day));
  return row;
}

export async function currentAttendeeIds(tx: Db | Tx, matchDayId: string): Promise<string[]> {
  const rows = await tx
    .select({ memberId: attendances.memberId })
    .from(attendances)
    .where(eq(attendances.matchDayId, matchDayId));
  return rows.map((r) => r.memberId);
}

export async function officialResultCount(tx: Db | Tx, matchDayId: string): Promise<number> {
  const [row] = await tx
    .select({ n: sql<number>`count(*)::int` })
    .from(matchResults)
    .innerJoin(scheduledMatches, eq(matchResults.scheduledMatchId, scheduledMatches.id))
    .innerJoin(officialSchedules, eq(scheduledMatches.officialScheduleId, officialSchedules.id))
    .where(eq(officialSchedules.matchDayId, matchDayId));
  return row.n;
}

export async function findDraft(
  tx: Db | Tx,
  matchDayId: string,
  key: string,
): Promise<DraftRow | null> {
  const [row] = await tx
    .select()
    .from(draftSchedules)
    .where(and(eq(draftSchedules.matchDayId, matchDayId), eq(draftSchedules.attendeeKey, key)));
  return row ?? null;
}

/** With ≥ 5 attendees and no draft for this exact list yet, generates and stores one. */
export async function refreshDraft(tx: Tx, matchDayId: string, rng: Rng): Promise<void> {
  const ids = await currentAttendeeIds(tx, matchDayId);
  if (ids.length < 5) return;
  const key = attendeeKey(ids);
  if (await findDraft(tx, matchDayId, key)) return;
  const seeds = await loadCurrentSeeds(tx);
  const attendees = ids.flatMap((id) => {
    const seed = seeds.get(id);
    return seed === undefined ? [] : [{ id, seed }]; // inactive attendee: skipped defensively
  });
  const result = generateSchedule(attendees, rng);
  if (!result.ok) return;
  const { diagramId, assignments, matches } = result.schedule;
  await tx
    .insert(draftSchedules)
    .values({ matchDayId, attendeeKey: key, diagramId, assignments, matches, createdAt: sql`now()` })
    .onConflictDoNothing({ target: [draftSchedules.matchDayId, draftSchedules.attendeeKey] });
}
