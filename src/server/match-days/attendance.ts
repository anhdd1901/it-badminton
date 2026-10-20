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
import { parseMemberId } from "../validation";
import { finalizeDue, getOrCreateMatchDay, officialResultCount, refreshDraft } from "./schedule";

export async function setAttendance(
  db: Db,
  actor: Actor,
  input: { memberId: string; attending: boolean },
  now: Date,
  opts: { rng?: Rng } = {},
): Promise<void> {
  const memberId = parseMemberId(input.memberId);
  await finalizeDue(db, now);
  const manager = actor.role === "admin" || actor.role === "subadmin";
  if (actor.memberId !== memberId && !manager) throw new AppError("FORBIDDEN", MESSAGES.forbidden);

  const day = matchDayOfWeek(now);
  await db.transaction(async (tx) => {
    await lockMatchDay(tx, day);
    // Read under the lock: setActive(false) deactivates inside the same lock.
    const [target] = await tx
      .select({ active: members.active })
      .from(members)
      .where(eq(members.id, memberId));
    if (!target) throw new AppError("NOT_FOUND", MESSAGES.memberNotFound);
    // An inactive member left in the list (deactivated while the day was locked) may only be taken out by a manager.
    if (!target.active && (input.attending || !manager)) {
      throw new AppError("VALIDATION", MESSAGES.inactiveMember);
    }
    const matchDay = await getOrCreateMatchDay(tx, day);
    if (
      matchDay.finalizedAt !== null ||
      !canChangeAttendance(day, now, await officialResultCount(tx, matchDay.id))
    ) {
      throw new AppError("LOCKED", MESSAGES.matchDayLocked);
    }
    if (input.attending) {
      await tx
        .insert(attendances)
        .values({ matchDayId: matchDay.id, memberId, recordedBy: actor.memberId, recordedAt: now })
        .onConflictDoNothing();
    } else {
      await tx
        .delete(attendances)
        .where(and(eq(attendances.matchDayId, matchDay.id), eq(attendances.memberId, memberId)));
    }
    await refreshDraft(tx, matchDay.id, opts.rng ?? cryptoRng);
  });
}
