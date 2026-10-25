import { and, eq, inArray } from "drizzle-orm";
import { checkLineup } from "@/domain/lineup";
import { canEditResults } from "@/domain/match-day";
import { attendeeKey } from "@/domain/schedule";
import { checkScore } from "@/domain/score";
import type { LocalDate } from "@/domain/types";
import type { Actor } from "../actor";
import type { Db, Tx } from "../db/client";
import { lockMatchDay } from "../db/lock";
import { matchDays, matchResults, officialSchedules, scheduledMatches } from "../db/schema";
import { AppError, MESSAGES, resultConflict } from "../errors";
import { parseLocalDate, parseMemberId } from "../validation";
import {
  activeAttendeeIds,
  finalizeDue,
  findDraft,
  isClosed,
  officialResultCount,
  promoteDraft,
} from "./schedule";

/** `scheduleKey`: attendee key of the schedule (draft or official) the client saw. */
export type ResultInput = {
  day: string;
  scheduleKey: string;
  matchNumber: number;
  scoreA: number;
  scoreB: number;
};
type MatchDayRow = { id: string; finalizedAt: Date | null };

async function prepare(db: Db, actor: Actor, rawDay: string, now: Date): Promise<LocalDate> {
  await finalizeDue(db, now);
  const day = parseLocalDate(rawDay);
  if (!canEditResults(day, now, actor.role)) throw new AppError("FORBIDDEN", MESSAGES.forbidden);
  return day;
}

/** Call after lockMatchDay. */
async function requireMatchDay(tx: Tx, day: LocalDate): Promise<MatchDayRow> {
  const [row] = await tx
    .select({ id: matchDays.id, finalizedAt: matchDays.finalizedAt })
    .from(matchDays)
    .where(eq(matchDays.day, day));
  if (!row) throw new AppError("NOT_FOUND", MESSAGES.noSchedule);
  return row;
}

function requireKey(actual: string, seen: string): void {
  if (actual !== seen) throw new AppError("CONFLICT", MESSAGES.scheduleChanged);
}

/** Id of the official schedule, which must be the one the client saw. */
async function findOfficialId(
  tx: Tx,
  matchDayId: string,
  scheduleKey: string,
): Promise<string | null> {
  const [row] = await tx
    .select({ id: officialSchedules.id, attendeeKey: officialSchedules.attendeeKey })
    .from(officialSchedules)
    .where(eq(officialSchedules.matchDayId, matchDayId));
  if (!row) return null;
  requireKey(row.attendeeKey, scheduleKey);
  return row.id;
}

async function requireOfficialId(tx: Tx, matchDayId: string, scheduleKey: string): Promise<string> {
  const id = await findOfficialId(tx, matchDayId, scheduleKey);
  if (!id) throw new AppError("NOT_FOUND", MESSAGES.noSchedule);
  return id;
}

async function findMatch(tx: Tx, officialId: string, matchNumber: number) {
  const [row] = await tx
    .select({
      id: scheduledMatches.id,
      a1: scheduledMatches.a1,
      a2: scheduledMatches.a2,
      b1: scheduledMatches.b1,
      b2: scheduledMatches.b2,
      scoreA: matchResults.scoreA,
      scoreB: matchResults.scoreB,
      version: matchResults.version,
    })
    .from(scheduledMatches)
    .leftJoin(matchResults, eq(matchResults.scheduledMatchId, scheduledMatches.id))
    .where(
      and(
        eq(scheduledMatches.officialScheduleId, officialId),
        eq(scheduledMatches.number, matchNumber),
      ),
    );
  if (!row) throw new AppError("NOT_FOUND", MESSAGES.matchNotFound);
  return row;
}

function validateScore(scoreA: number, scoreB: number): void {
  const check = checkScore(scoreA, scoreB);
  if (!check.ok) throw new AppError("VALIDATION", check.reason);
}

export async function enterResult(
  db: Db,
  actor: Actor,
  input: ResultInput,
  now: Date,
): Promise<void> {
  const day = await prepare(db, actor, input.day, now);
  validateScore(input.scoreA, input.scoreB);
  await db.transaction(async (tx) => {
    await lockMatchDay(tx, day);
    const matchDay = await requireMatchDay(tx, day);
    let officialId = await findOfficialId(tx, matchDay.id, input.scheduleKey);
    if (!officialId) {
      if (isClosed(day, matchDay.finalizedAt, now))
        throw new AppError("NOT_FOUND", MESSAGES.noSchedule);
      const draft = await findDraft(
        tx,
        matchDay.id,
        attendeeKey(await activeAttendeeIds(tx, matchDay.id)),
      );
      if (!draft) throw new AppError("NOT_FOUND", MESSAGES.noSchedule);
      requireKey(draft.attendeeKey, input.scheduleKey);
      officialId = await promoteDraft(tx, matchDay.id, draft, now);
    }
    const match = await findMatch(tx, officialId, input.matchNumber);
    if (match.version !== null)
      throw new AppError("CONFLICT", resultConflict(match.scoreA!, match.scoreB!));
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
    const officialId = await requireOfficialId(
      tx,
      (await requireMatchDay(tx, day)).id,
      input.scheduleKey,
    );
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
async function dropEmptyScheduleIfOpen(
  tx: Tx,
  matchDay: MatchDayRow,
  day: LocalDate,
  now: Date,
): Promise<void> {
  if (isClosed(day, matchDay.finalizedAt, now)) return;
  if ((await officialResultCount(tx, matchDay.id)) > 0) return;
  await tx.delete(officialSchedules).where(eq(officialSchedules.matchDayId, matchDay.id));
}

export async function deleteResult(
  db: Db,
  actor: Actor,
  input: { day: string; scheduleKey: string; matchNumber: number },
  now: Date,
): Promise<void> {
  const day = await prepare(db, actor, input.day, now);
  await db.transaction(async (tx) => {
    await lockMatchDay(tx, day);
    const matchDay = await requireMatchDay(tx, day);
    const match = await findMatch(
      tx,
      await requireOfficialId(tx, matchDay.id, input.scheduleKey),
      input.matchNumber,
    );
    if (match.version === null) throw new AppError("NOT_FOUND", MESSAGES.matchNotFound);
    await tx.delete(matchResults).where(eq(matchResults.scheduledMatchId, match.id));
    await dropEmptyScheduleIfOpen(tx, matchDay, day, now);
  });
}

export async function deleteAllResults(
  db: Db,
  actor: Actor,
  input: { day: string; scheduleKey: string },
  now: Date,
): Promise<void> {
  const day = await prepare(db, actor, input.day, now);
  await db.transaction(async (tx) => {
    await lockMatchDay(tx, day);
    const matchDay = await requireMatchDay(tx, day);
    const officialId = await requireOfficialId(tx, matchDay.id, input.scheduleKey);
    const matchIds = tx
      .select({ id: scheduledMatches.id })
      .from(scheduledMatches)
      .where(eq(scheduledMatches.officialScheduleId, officialId));
    await tx.delete(matchResults).where(inArray(matchResults.scheduledMatchId, matchIds));
    await dropEmptyScheduleIfOpen(tx, matchDay, day, now);
  });
}

type Teams = { teamA: [string, string]; teamB: [string, string] };
export type ChangePlayersInput = {
  day: string;
  scheduleKey: string;
  matchNumber: number;
  /** The four players the client saw, by position. */
  expected: Teams;
  next: Teams;
};

/** Admin only. Official schedule only (never promotes a draft). Leaves the result untouched. */
export async function changeMatchPlayers(
  db: Db,
  actor: Actor,
  input: ChangePlayersInput,
  now: Date,
): Promise<void> {
  const day = await prepare(db, actor, input.day, now);
  if (actor.role !== "admin") throw new AppError("FORBIDDEN", MESSAGES.forbidden);
  const parse = (t: Teams): Teams => ({
    teamA: [parseMemberId(t.teamA[0]), parseMemberId(t.teamA[1])],
    teamB: [parseMemberId(t.teamB[0]), parseMemberId(t.teamB[1])],
  });
  const expected = parse(input.expected);
  const next = parse(input.next);
  await db.transaction(async (tx) => {
    await lockMatchDay(tx, day);
    const officialId = await requireOfficialId(
      tx,
      (await requireMatchDay(tx, day)).id,
      input.scheduleKey,
    );
    const match = await findMatch(tx, officialId, input.matchNumber);
    if (
      match.a1 !== expected.teamA[0] ||
      match.a2 !== expected.teamA[1] ||
      match.b1 !== expected.teamB[0] ||
      match.b2 !== expected.teamB[1]
    ) {
      throw new AppError("CONFLICT", MESSAGES.lineupChanged);
    }
    const [schedule] = await tx
      .select({ assignments: officialSchedules.assignments })
      .from(officialSchedules)
      .where(eq(officialSchedules.id, officialId));
    const roster = new Set(schedule.assignments.map((a) => a.memberId));
    if (!checkLineup(next, roster)) throw new AppError("VALIDATION", MESSAGES.badLineup);
    await tx
      .update(scheduledMatches)
      .set({ a1: next.teamA[0], a2: next.teamA[1], b1: next.teamB[0], b2: next.teamB[1] })
      .where(eq(scheduledMatches.id, match.id));
  });
}
