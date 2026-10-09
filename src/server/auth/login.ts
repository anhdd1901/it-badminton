import { eq } from "drizzle-orm";
import type { Actor } from "../actor";
import type { Db } from "../db/client";
import { loginAttempts, members } from "../db/schema";
import { MESSAGES } from "../errors";
import { verifyPassword } from "./password";
import { createSession } from "./sessions";

export type LoginResult = { ok: true; token: string; actor: Actor } | { ok: false; message: string };

const MAX_FAILURES = 5;
const LOCK_MS = 15 * 60_000;

export async function login(
  db: Db,
  input: { username: string; password: string },
  now: Date,
): Promise<LoginResult> {
  const username = input.username.trim().toLowerCase();

  const [attempt] = await db.select().from(loginAttempts).where(eq(loginAttempts.username, username));
  if (attempt?.lockedUntil && attempt.lockedUntil > now) return { ok: false, message: MESSAGES.loginLocked };

  const [member] = await db.select().from(members).where(eq(members.username, username));
  if (member?.active && (await verifyPassword(member.passwordHash, input.password))) {
    await db.delete(loginAttempts).where(eq(loginAttempts.username, username));
    const { token, sessionId } = await createSession(db, member.id, now);
    return { ok: true, token, actor: { memberId: member.id, role: member.role, sessionId } };
  }

  const failed = (attempt?.failedCount ?? 0) + 1;
  const locked = failed >= MAX_FAILURES;
  const values = {
    username,
    failedCount: locked ? 0 : failed,
    lockedUntil: locked ? new Date(now.getTime() + LOCK_MS) : null,
  };
  await db
    .insert(loginAttempts)
    .values(values)
    .onConflictDoUpdate({ target: loginAttempts.username, set: values });
  return { ok: false, message: locked ? MESSAGES.loginLocked : MESSAGES.badLogin };
}
