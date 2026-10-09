import { and, eq, inArray } from "drizzle-orm";
import { canEditResults } from "@/domain/match-day";
import { attendeeKey } from "@/domain/schedule";
import { checkScore } from "@/domain/score";
import { checkInClosesAt } from "@/domain/time";
import type { LocalDate } from "@/domain/types";
import type { Actor } from "../actor";
import type { Db, Tx } from "../db/client";
import { lockMatchDay } from "../db/lock";
import { matchDays, matchResults, officialSchedules, scheduledMatches } from "../db/schema";
import { AppError, MESSAGES, resultConflict } from "../errors";
import { parseLocalDate } from "../validation";
import {
  currentAttendeeIds,
  finalizeDue,
  findDraft,
  officialResultCount,
  promoteDraft,
} from "./schedule";

export type ResultInput = { day: string; matchNumber: number; scoreA: number; scoreB: number };

async function prepare(db: Db, actor: Actor, rawDay: string, now: Date): Promise<LocalDate> {
  await finalizeDue(db, now);
  const day = parseLocalDate(rawDay);
  if (!canEditResults(day, now, actor.role)) throw new AppError("FORBIDDEN", MESSAGES.forbidden);
  return day;
}

/** Call after lockMatchDay. */
async function requireMatchDayId(tx: Tx, day: LocalDate): Promise<string> {
  const [row] = await tx.select({ id: matchDays.id }).from(matchDays).where(eq(matchDays.day, day));
  if (!row) throw new AppError("NOT_FOUND", MESSAGES.noSchedule);
  return row.id;
}

async function findOfficialId(tx: Tx, matchDayId: string): Promise<string | null> {
  const [row] = await tx
    .select({ id: officialSchedules.id })
    .from(officialSchedules)
    .where(eq(officialSchedules.matchDayId, matchDayId));
  return row?.id ?? null;
}

async function requireOfficialId(tx: Tx, matchDayId: string): Promise<string> {
  const id = await findOfficialId(tx, matchDayId);
  if (!id) throw new AppError("NOT_FOUND", MESSAGES.noSchedule);
  return id;
}

async function findMatch(tx: Tx, officialId: string, matchNumber: number) {
  const [row] = await tx
    .select({
      id: scheduledMatches.id,
      scoreA: matchResults.scoreA,
      scoreB: matchResults.scoreB,
      version: matchResults.version,
    })
    .from(scheduledMatches)
    .leftJoin(matchResults, eq(matchResults.scheduledMatchId, scheduledMatches.id))
    .where(and(eq(scheduledMatches.officialScheduleId, officialId), eq(scheduledMatches.number, matchNumber)));
  if (!row) throw new AppError("NOT_FOUND", MESSAGES.matchNotFound);
  return row;
}

function validateScore(scoreA: number, scoreB: number): void {
  const check = checkScore(scoreA, scoreB);
  if (!check.ok) throw new AppError("VALIDATION", check.reason);
}

export async function enterResult(db: Db, actor: Actor, input: ResultInput, now: Date): Promise<void> {
  const day = await prepare(db, actor, input.day, now);
  validateScore(input.scoreA, input.scoreB);
  await db.transaction(async (tx) => {
    await lockMatchDay(tx, day);
    const matchDayId = await requireMatchDayId(tx, day);
    let officialId = await findOfficialId(tx, matchDayId);
    if (!officialId) {
      if (now.getTime() >= checkInClosesAt(day).getTime()) {
        throw new AppError("NOT_FOUND", MESSAGES.noSchedule);
      }
      const draft = await findDraft(tx, matchDayId, attendeeKey(await currentAttendeeIds(tx, matchDayId)));
      if (!draft) throw new AppError("NOT_FOUND", MESSAGES.noSchedule);
      officialId = await promoteDraft(tx, matchDayId, draft, now);
    }
    const match = await findMatch(tx, officialId, input.matchNumber);
    if (match.version !== null) throw new AppError("CONFLICT", resultConflict(match.scoreA!, match.scoreB!));
    await tx.insert(matchResults).values({
      scheduledMatchId: match.id,
      scoreA: input.scoreA,
      scoreB: input.scoreB,
      enteredBy: actor.memberId,
      enteredAt: now,
      version: 1,
    });
  });
}

export async function updateResult(
  db: Db,
  actor: Actor,
  input: ResultInput & { expectedVersion: number },
  now: Date,
): Promise<void> {
  const day = await prepare(db, actor, input.day, now);
  validateScore(input.scoreA, input.scoreB);
  await db.transaction(async (tx) => {
    await lockMatchDay(tx, day);
    const officialId = await requireOfficialId(tx, await requireMatchDayId(tx, day));
    const match = await findMatch(tx, officialId, input.matchNumber);
    if (match.version === null) throw new AppError("NOT_FOUND", MESSAGES.matchNotFound);
    if (match.version !== input.expectedVersion) {
      throw new AppError("CONFLICT", resultConflict(match.scoreA!, match.scoreB!));
    }
    await tx
      .update(matchResults)
      .set({
        scoreA: input.scoreA,
        scoreB: input.scoreB,
        enteredBy: actor.memberId,
        enteredAt: now,
        version: match.version + 1,
      })
      .where(eq(matchResults.scheduledMatchId, match.id));
  });
}

/** Before check-in closes, an official schedule left without results is dropped so the day reopens. */
async function dropEmptyScheduleIfOpen(tx: Tx, matchDayId: string, day: LocalDate, now: Date): Promise<void> {
  if (now.getTime() >= checkInClosesAt(day).getTime()) return;
  if ((await officialResultCount(tx, matchDayId)) > 0) return;
  await tx.delete(officialSchedules).where(eq(officialSchedules.matchDayId, matchDayId));
}

export async function deleteResult(
  db: Db,
  actor: Actor,
  input: { day: string; matchNumber: number },
  now: Date,
): Promise<void> {
  const day = await prepare(db, actor, input.day, now);
  await db.transaction(async (tx) => {
    await lockMatchDay(tx, day);
    const matchDayId = await requireMatchDayId(tx, day);
    const match = await findMatch(tx, await requireOfficialId(tx, matchDayId), input.matchNumber);
    if (match.version === null) throw new AppError("NOT_FOUND", MESSAGES.matchNotFound);
    await tx.delete(matchResults).where(eq(matchResults.scheduledMatchId, match.id));
    await dropEmptyScheduleIfOpen(tx, matchDayId, day, now);
  });
}

export async function deleteAllResults(
  db: Db,
  actor: Actor,
  input: { day: string },
  now: Date,
): Promise<void> {
  const day = await prepare(db, actor, input.day, now);
  await db.transaction(async (tx) => {
    await lockMatchDay(tx, day);
    const matchDayId = await requireMatchDayId(tx, day);
    const officialId = await requireOfficialId(tx, matchDayId);
    const matchIds = tx
      .select({ id: scheduledMatches.id })
      .from(scheduledMatches)
      .where(eq(scheduledMatches.officialScheduleId, officialId));
    await tx.delete(matchResults).where(inArray(matchResults.scheduledMatchId, matchIds));
    await dropEmptyScheduleIfOpen(tx, matchDayId, day, now);
  });
}
