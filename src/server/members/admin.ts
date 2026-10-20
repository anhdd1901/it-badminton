import { and, eq } from "drizzle-orm";
import { canChangeAttendance } from "@/domain/match-day";
import { cryptoRng } from "@/domain/rng";
import { matchDayOfWeek } from "@/domain/time";
import type { Rng } from "@/domain/types";
import { type Actor, requireRole } from "../actor";
import { verifyPassword } from "../auth/password";
import { revokeSessions } from "../auth/sessions";
import type { Db } from "../db/client";
import { lockMatchDay } from "../db/lock";
import { attendances, eloAdjustments, matchDays, members } from "../db/schema";
import { AppError, MESSAGES } from "../errors";
import { finalizeDue, officialResultCount, refreshDraft } from "../match-days/schedule";
import { parseEloInput, parseMemberId } from "../validation";
import { isUniqueViolation } from "./profile";

const SINGLE_ADMIN_INDEX = "members_single_admin";

/** `memberId` must already be parsed with parseMemberId. Pass `lock` inside a transaction to row-lock it. */
async function loadMember(db: Db, memberId: string, lock = false) {
  const query = db
    .select({
      id: members.id,
      role: members.role,
      active: members.active,
      passwordHash: members.passwordHash,
    })
    .from(members)
    .where(eq(members.id, memberId));
  const [row] = await (lock ? query.for("update") : query);
  if (!row) throw new AppError("NOT_FOUND", MESSAGES.memberNotFound);
  return row;
}

export async function setActive(
  db: Db,
  actor: Actor,
  rawMemberId: string,
  active: boolean,
  now: Date,
  opts: { rng?: Rng } = {},
): Promise<void> {
  requireRole(actor, "admin");
  const memberId = parseMemberId(rawMemberId);
  if (active) {
    await db.transaction(async (tx) => {
      await loadMember(tx, memberId, true);
      await tx.update(members).set({ active: true }).where(eq(members.id, memberId));
    });
    return;
  }

  await finalizeDue(db, now);
  const day = matchDayOfWeek(now);
  await db.transaction(async (tx) => {
    await lockMatchDay(tx, day);
    const target = await loadMember(tx, memberId, true);
    if (target.role === "admin") {
      throw new AppError("VALIDATION", "Không thể ngưng hoạt động admin");
    }
    await tx
      .update(members)
      .set({ active: false, role: target.role === "subadmin" ? "member" : target.role })
      .where(eq(members.id, memberId));
    await revokeSessions(tx, memberId);

    const [matchDay] = await tx
      .select({ id: matchDays.id, finalizedAt: matchDays.finalizedAt })
      .from(matchDays)
      .where(eq(matchDays.day, day));
    if (!matchDay || matchDay.finalizedAt !== null) return;
    const [attendance] = await tx
      .select({ memberId: attendances.memberId })
      .from(attendances)
      .where(and(eq(attendances.matchDayId, matchDay.id), eq(attendances.memberId, memberId)));
    if (!attendance) return;
    if (!canChangeAttendance(day, now, await officialResultCount(tx, matchDay.id))) return;
    await tx
      .delete(attendances)
      .where(and(eq(attendances.matchDayId, matchDay.id), eq(attendances.memberId, memberId)));
    await refreshDraft(tx, matchDay.id, opts.rng ?? cryptoRng);
  });
}

export async function setSubadmin(
  db: Db,
  actor: Actor,
  memberId: string,
  isSubadmin: boolean,
): Promise<void> {
  requireRole(actor, "admin");
  const targetId = parseMemberId(memberId);
  await db.transaction(async (tx) => {
    const target = await loadMember(tx, targetId, true);
    if (!target.active || target.role === "admin") {
      throw new AppError("VALIDATION", "Chỉ đặt subadmin cho mem đang hoạt động, không phải admin");
    }
    await tx
      .update(members)
      .set({ role: isSubadmin ? "subadmin" : "member" })
      .where(eq(members.id, target.id));
  });
}

export async function transferAdmin(
  db: Db,
  actor: Actor,
  input: { memberId: string; password: string },
): Promise<void> {
  requireRole(actor, "admin");
  const targetId = parseMemberId(input.memberId);
  const self = await loadMember(db, actor.memberId);
  if (!(await verifyPassword(self.passwordHash, input.password))) {
    throw new AppError("VALIDATION", MESSAGES.wrongPassword);
  }
  try {
    await db.transaction(async (tx) => {
      // Serialises concurrent transfers by the same admin: the loser sees it is no longer admin.
      const [me] = await tx
        .select({ role: members.role })
        .from(members)
        .where(eq(members.id, actor.memberId))
        .for("update");
      if (me?.role !== "admin") throw new AppError("FORBIDDEN", MESSAGES.forbidden);
      const target = await loadMember(tx, targetId, true);
      if (!target.active || target.id === actor.memberId) {
        throw new AppError("VALIDATION", "Chỉ chuyển quyền cho mem khác đang hoạt động");
      }
      await tx.update(members).set({ role: "member" }).where(eq(members.id, actor.memberId));
      await tx.update(members).set({ role: "admin" }).where(eq(members.id, target.id));
    });
  } catch (e) {
    if (isUniqueViolation(e, SINGLE_ADMIN_INDEX))
      throw new AppError("CONFLICT", MESSAGES.adminChanged);
    throw e;
  }
}

export async function adjustElo(
  db: Db,
  actor: Actor,
  input: { memberId: string; elo: string | number },
  now: Date,
): Promise<void> {
  requireRole(actor, "admin");
  const memberId = parseMemberId(input.memberId);
  const eloTenths = parseEloInput(input.elo);
  await loadMember(db, memberId);
  await db
    .insert(eloAdjustments)
    .values({ memberId, eloTenths, adjustedBy: actor.memberId, at: now });
}
