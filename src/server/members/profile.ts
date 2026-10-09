import { eq } from "drizzle-orm";
import { type Actor, requireRole } from "../actor";
import { hashPassword, verifyPassword } from "../auth/password";
import { revokeSessions } from "../auth/sessions";
import type { Db } from "../db/client";
import { loginAttempts, members } from "../db/schema";
import { AppError, MESSAGES } from "../errors";
import { parseDisplayName, parseEloInput, parseMemberId, parsePassword, parseUsername } from "../validation";

export type NewMember = { username: string; displayName: string; password: string; initialElo: string | number };

const UNIQUE_VIOLATION = "23505";

/** True for a unique violation anywhere in the cause chain; with `constraint`, only on that index. */
export function isUniqueViolation(e: unknown, constraint?: string): boolean {
  for (let cur = e; typeof cur === "object" && cur !== null; cur = (cur as { cause?: unknown }).cause) {
    const pg = cur as { code?: unknown; constraint_name?: unknown };
    if (pg.code === UNIQUE_VIOLATION) return constraint === undefined || pg.constraint_name === constraint;
  }
  return false;
}

export async function usernameExists(db: Db, username: string): Promise<boolean> {
  const rows = await db.select({ id: members.id }).from(members).where(eq(members.username, username)).limit(1);
  return rows.length > 0;
}

export async function createMember(db: Db, actor: Actor, input: NewMember, now: Date): Promise<{ id: string }> {
  requireRole(actor, "admin");
  const username = parseUsername(input.username);
  const displayName = parseDisplayName(input.displayName);
  const password = parsePassword(input.password);
  const initialEloTenths = parseEloInput(input.initialElo);
  if (await usernameExists(db, username)) throw new AppError("CONFLICT", MESSAGES.usernameTaken);
  const passwordHash = await hashPassword(password);
  try {
    const [row] = await db
      .insert(members)
      .values({ username, displayName, passwordHash, role: "member", active: true, initialEloTenths, createdAt: now })
      .returning({ id: members.id });
    return { id: row.id };
  } catch (e) {
    if (isUniqueViolation(e)) throw new AppError("CONFLICT", MESSAGES.usernameTaken);
    throw e;
  }
}

async function updateMember(db: Db, memberId: string, values: Partial<typeof members.$inferInsert>): Promise<void> {
  const rows = await db.update(members).set(values).where(eq(members.id, memberId)).returning({ id: members.id });
  if (rows.length === 0) throw new AppError("NOT_FOUND", MESSAGES.memberNotFound);
}

export async function updateDisplayName(db: Db, actor: Actor, rawMemberId: string, displayName: string): Promise<void> {
  const memberId = parseMemberId(rawMemberId);
  if (actor.memberId !== memberId) requireRole(actor, "admin");
  await updateMember(db, memberId, { displayName: parseDisplayName(displayName) });
}

export async function changeUsername(db: Db, actor: Actor, rawMemberId: string, username: string): Promise<void> {
  requireRole(actor, "admin");
  const memberId = parseMemberId(rawMemberId);
  const normalized = parseUsername(username);
  const existing = await db.select({ id: members.id }).from(members).where(eq(members.username, normalized)).limit(1);
  if (existing.length > 0 && existing[0].id !== memberId) throw new AppError("CONFLICT", MESSAGES.usernameTaken);
  try {
    await updateMember(db, memberId, { username: normalized });
  } catch (e) {
    if (isUniqueViolation(e)) throw new AppError("CONFLICT", MESSAGES.usernameTaken);
    throw e;
  }
}

export async function resetPassword(db: Db, actor: Actor, rawMemberId: string, newPassword: string): Promise<void> {
  requireRole(actor, "admin");
  const memberId = parseMemberId(rawMemberId);
  const passwordHash = await hashPassword(parsePassword(newPassword));
  await db.transaction(async (tx) => {
    const rows = await tx
      .update(members)
      .set({ passwordHash })
      .where(eq(members.id, memberId))
      .returning({ username: members.username });
    if (rows.length === 0) throw new AppError("NOT_FOUND", MESSAGES.memberNotFound);
    await revokeSessions(tx, memberId);
    await tx.delete(loginAttempts).where(eq(loginAttempts.username, rows[0].username));
  });
}

export async function changeOwnPassword(db: Db, actor: Actor, current: string, next: string): Promise<void> {
  const [row] = await db.select({ hash: members.passwordHash }).from(members).where(eq(members.id, actor.memberId));
  if (!row) throw new AppError("NOT_FOUND", MESSAGES.memberNotFound);
  if (!(await verifyPassword(row.hash, current))) throw new AppError("VALIDATION", MESSAGES.wrongPassword);
  const passwordHash = await hashPassword(parsePassword(next));
  await db.transaction(async (tx) => {
    await tx.update(members).set({ passwordHash }).where(eq(members.id, actor.memberId));
    await revokeSessions(tx, actor.memberId, actor.sessionId);
  });
}
