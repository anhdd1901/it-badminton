import { asc, eq } from "drizzle-orm";
import type { Role } from "@/domain/types";
import { type Actor, requireRole } from "../actor";
import { loadEloState } from "../data/loaders";
import type { Db } from "../db/client";
import { attendances, matchDays, members } from "../db/schema";
import { matchDayOfWeek } from "@/domain/time";
import { finalizeDue } from "../match-days/schedule";
import { loadMemberRefs, type MemberRef, ref } from "./rankings";

export type Me = MemberRef & { role: Role };

export async function getMe(db: Db, actor: Actor): Promise<Me> {
  const refs = await loadMemberRefs(db, [actor.memberId]);
  return { ...ref(refs, actor.memberId), role: actor.role };
}

export async function getRoster(
  db: Db,
  actor: Actor,
  now: Date,
): Promise<{ member: MemberRef; attending: boolean }[]> {
  requireRole(actor, "admin", "subadmin");
  await finalizeDue(db, now);
  const day = matchDayOfWeek(now);
  const [rows, attendingRows] = await Promise.all([
    db
      .select({
        id: members.id,
        displayName: members.displayName,
        username: members.username,
        avatarUrl: members.avatarUrl,
        active: members.active,
      })
      .from(members)
      .where(eq(members.active, true)),
    db
      .select({ memberId: attendances.memberId })
      .from(attendances)
      .innerJoin(matchDays, eq(attendances.matchDayId, matchDays.id))
      .where(eq(matchDays.day, day)),
  ]);
  const attending = new Set(attendingRows.map((r) => r.memberId));
  return rows
    .sort(
      (a, b) =>
        a.displayName.localeCompare(b.displayName, "vi") ||
        a.username.localeCompare(b.username, "vi"),
    )
    .map((member) => ({ member, attending: attending.has(member.id) }));
}

export type AdminMemberRow = MemberRef & { role: Role; eloTenths: number; createdAt: Date };

export async function listMembers(
  db: Db,
  actor: Actor,
  status: "active" | "inactive",
): Promise<AdminMemberRow[]> {
  requireRole(actor, "admin");
  const [rows, elo] = await Promise.all([
    db
      .select({
        id: members.id,
        displayName: members.displayName,
        username: members.username,
        avatarUrl: members.avatarUrl,
        active: members.active,
        role: members.role,
        initial: members.initialEloTenths,
        createdAt: members.createdAt,
      })
      .from(members)
      .where(eq(members.active, status === "active"))
      .orderBy(asc(members.displayName), asc(members.username)),
    loadEloState(db),
  ]);
  return rows.map(({ initial, ...r }) => ({
    ...r,
    eloTenths: elo.current.get(r.id) ?? initial,
  }));
}
