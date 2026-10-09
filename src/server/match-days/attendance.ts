import { and, eq } from "drizzle-orm";
import { canChangeAttendance } from "@/domain/match-day";
import { matchDayOfWeek } from "@/domain/time";
import type { Rng } from "@/domain/types";
import { cryptoRng } from "@/domain/rng";
import type { Actor } from "../actor";
import type { Db } from "../db/client";
import { lockMatchDay } from "../db/lock";
import { attendances, members } from "../db/schema";
import { AppError, MESSAGES } from "../errors";
import {
  finalizeDue,
  getOrCreateMatchDay,
  officialResultCount,
  refreshDraft,
} from "./schedule";

export async function setAttendance(
  db: Db,
  actor: Actor,
  input: { memberId: string; attending: boolean },
  now: Date,
  opts: { rng?: Rng } = {},
): Promise<void> {
  await finalizeDue(db, now);
  if (actor.memberId !== input.memberId && actor.role !== "admin" && actor.role !== "subadmin") {
    throw new AppError("FORBIDDEN", MESSAGES.forbidden);
  }
  const [target] = await db
    .select({ active: members.active })
    .from(members)
    .where(eq(members.id, input.memberId));
  if (!target) throw new AppError("NOT_FOUND", MESSAGES.memberNotFound);
  if (!target.active) throw new AppError("VALIDATION", MESSAGES.inactiveMember);

  const day = matchDayOfWeek(now);
  await db.transaction(async (tx) => {
    await lockMatchDay(tx, day);
    const matchDay = await getOrCreateMatchDay(tx, day);
    if (!canChangeAttendance(day, now, await officialResultCount(tx, matchDay.id))) {
      throw new AppError("LOCKED", MESSAGES.matchDayLocked);
    }
    if (input.attending) {
      await tx
        .insert(attendances)
        .values({
          matchDayId: matchDay.id,
          memberId: input.memberId,
          recordedBy: actor.memberId,
          recordedAt: now,
        })
        .onConflictDoNothing();
    } else {
      await tx
        .delete(attendances)
        .where(and(eq(attendances.matchDayId, matchDay.id), eq(attendances.memberId, input.memberId)));
    }
    await refreshDraft(tx, matchDay.id, opts.rng ?? cryptoRng);
  });
}
