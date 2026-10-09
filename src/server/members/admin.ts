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
import { parseEloInput } from "../validation";

async function loadMember(db: Db, memberId: string) {
  const [row] = await db
    .select({ id: members.id, role: members.role, active: members.active, passwordHash: members.passwordHash })
    .from(members)
    .where(eq(members.id, memberId));
  if (!row) throw new AppError("NOT_FOUND", MESSAGES.memberNotFound);
  return row;
}

export async function setActive(
  db: Db,
  actor: Actor,
  memberId: string,
  active: boolean,
  now: Date,
  opts: { rng?: Rng } = {},
): Promise<void> {
  requireRole(actor, "admin");
  const target = await loadMember(db, memberId);
  if (active) {
    await db.update(members).set({ active: true }).where(eq(members.id, memberId));
    return;
  }
  if (target.role === "admin") throw new AppError("VALIDATION", "Không thể ngưng hoạt động admin");

  await finalizeDue(db, now);
  const day = matchDayOfWeek(now);
  await db.transaction(async (tx) => {
    await lockMatchDay(tx, day);
    await tx
      .update(members)
      .set({ active: false, role: target.role === "subadmin" ? "member" : target.role })
      .where(eq(members.id, memberId));
    await revokeSessions(tx, memberId);

    const [matchDay] = await tx.select({ id: matchDays.id }).from(matchDays).where(eq(matchDays.day, day));
    if (!matchDay) return;
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

export async function setSubadmin(db: Db, actor: Actor, memberId: string, isSubadmin: boolean): Promise<void> {
  requireRole(actor, "admin");
  const target = await loadMember(db, memberId);
  if (!target.active || target.role === "admin") {
    throw new AppError("VALIDATION", "Chỉ đặt subadmin cho mem đang hoạt động, không phải admin");
  }
  await db
    .update(members)
    .set({ role: isSubadmin ? "subadmin" : "member" })
    .where(eq(members.id, memberId));
}

export async function transferAdmin(
  db: Db,
  actor: Actor,
  input: { memberId: string; password: string },
): Promise<void> {
  requireRole(actor, "admin");
  const self = await loadMember(db, actor.memberId);
  if (!(await verifyPassword(self.passwordHash, input.password))) {
    throw new AppError("VALIDATION", MESSAGES.wrongPassword);
  }
  const target = await loadMember(db, input.memberId);
  if (!target.active || target.id === actor.memberId) {
    throw new AppError("VALIDATION", "Chỉ chuyển quyền cho mem khác đang hoạt động");
  }
  await db.transaction(async (tx) => {
    await tx.update(members).set({ role: "member" }).where(eq(members.id, actor.memberId));
    await tx.update(members).set({ role: "admin" }).where(eq(members.id, target.id));
  });
}

export async function adjustElo(
  db: Db,
  actor: Actor,
  input: { memberId: string; elo: string | number },
  now: Date,
): Promise<void> {
  requireRole(actor, "admin");
  const eloTenths = parseEloInput(input.elo);
  await loadMember(db, input.memberId);
  await db.insert(eloAdjustments).values({ memberId: input.memberId, eloTenths, adjustedBy: actor.memberId, at: now });
}
