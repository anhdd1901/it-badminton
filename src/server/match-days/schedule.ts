import { and, eq, isNull, lte, sql } from "drizzle-orm";
import { attendeeKey, generateSchedule } from "@/domain/schedule";
import { checkInClosesAt, matchDayOfWeek } from "@/domain/time";
import type { LocalDate, Rng } from "@/domain/types";
import { loadCurrentSeeds } from "../data/loaders";
import type { Db, Tx } from "../db/client";
import { lockMatchDay } from "../db/lock";
import {
  attendances,
  draftSchedules,
  matchDays,
  matchResults,
  members,
  officialSchedules,
  scheduledMatches,
} from "../db/schema";

export type DraftRow = typeof draftSchedules.$inferSelect;

/** Copies a draft into the official schedule of the match day; returns the official schedule id. */
export async function promoteDraft(
  tx: Tx,
  matchDayId: string,
  draft: DraftRow,
  now: Date,
): Promise<string> {
  const [official] = await tx
    .insert(officialSchedules)
    .values({
      matchDayId,
      attendeeKey: draft.attendeeKey,
      diagramId: draft.diagramId,
      assignments: draft.assignments,
      createdAt: now,
    })
    .returning({ id: officialSchedules.id });
  if (draft.matches.length > 0) {
    await tx.insert(scheduledMatches).values(
      draft.matches.map((m) => ({
        officialScheduleId: official.id,
        number: m.number,
        a1: m.teamA[0],
        a2: m.teamA[1],
        b1: m.teamB[0],
        b2: m.teamB[1],
      })),
    );
  }
  return official.id;
}

/** Finalizes every match day whose check-in has closed (12:00 Saturday), lazily on first access. */
export async function finalizeDue(db: Db, now: Date): Promise<void> {
  const candidates = await db
    .select({ id: matchDays.id, day: matchDays.day })
    .from(matchDays)
    .where(and(isNull(matchDays.finalizedAt), lte(matchDays.day, matchDayOfWeek(now))));
  for (const c of candidates) {
    const closesAt = checkInClosesAt(c.day);
    if (closesAt.getTime() > now.getTime()) continue;
    await db.transaction(async (tx) => {
      await lockMatchDay(tx, c.day);
      const [row] = await tx
        .select({ finalizedAt: matchDays.finalizedAt })
        .from(matchDays)
        .where(eq(matchDays.id, c.id));
      if (!row || row.finalizedAt) return;
      const [official] = await tx
        .select({ id: officialSchedules.id })
        .from(officialSchedules)
        .where(eq(officialSchedules.matchDayId, c.id));
      if (!official) {
        const draft = await findDraft(tx, c.id, attendeeKey(await activeAttendeeIds(tx, c.id)));
        if (draft) await promoteDraft(tx, c.id, draft, closesAt);
      }
      await tx.delete(draftSchedules).where(eq(draftSchedules.matchDayId, c.id));
      await tx.update(matchDays).set({ finalizedAt: closesAt }).where(eq(matchDays.id, c.id));
    });
  }
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

/** Attendees who are still active: the players of the draft for the current list. */
export async function activeAttendeeIds(tx: Db | Tx, matchDayId: string): Promise<string[]> {
  const rows = await tx
    .select({ memberId: attendances.memberId })
    .from(attendances)
    .innerJoin(members, eq(attendances.memberId, members.id))
    .where(and(eq(attendances.matchDayId, matchDayId), eq(members.active, true)));
  return rows.map((r) => r.memberId);
}

/** A day counts as closed once finalized, even for a request whose `now` was taken before 12:00. */
export function isClosed(day: LocalDate, finalizedAt: Date | null, now: Date): boolean {
  return finalizedAt !== null || now.getTime() >= checkInClosesAt(day).getTime();
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

/**
 * With ≥ 5 active attendees and no draft for this exact list yet, generates and stores one.
 * Inactive attendees are left out before the key is computed, so a draft's key always matches its players.
 */
export async function refreshDraft(tx: Tx, matchDayId: string, rng: Rng): Promise<void> {
  const seeds = await loadCurrentSeeds(tx);
  const attendees = (await currentAttendeeIds(tx, matchDayId)).flatMap((id) => {
    const seed = seeds.get(id);
    return seed === undefined ? [] : [{ id, seed }];
  });
  if (attendees.length < 5) return;
  const key = attendeeKey(attendees.map((a) => a.id));
  if (await findDraft(tx, matchDayId, key)) return;
  const result = generateSchedule(attendees, rng);
  if (!result.ok) return;
  const { diagramId, assignments, matches } = result.schedule;
  await tx
    .insert(draftSchedules)
    .values({
      matchDayId,
      attendeeKey: key,
      diagramId,
      assignments,
      matches,
      createdAt: sql`now()`,
    })
    .onConflictDoNothing({ target: [draftSchedules.matchDayId, draftSchedules.attendeeKey] });
}
