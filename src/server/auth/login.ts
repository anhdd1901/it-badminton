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

  // Reserve the attempt atomically (row lock) before the slow password check,
  // so parallel guesses cannot all read the same failed count.
  const reservation = await db.transaction(async (tx) => {
    await tx.insert(loginAttempts).values({ username }).onConflictDoNothing();
    const [row] = await tx.select().from(loginAttempts).where(eq(loginAttempts.username, username)).for("update");
    if (row.lockedUntil && row.lockedUntil > now) return "locked" as const;
    const failed = row.failedCount + 1;
    const locksNow = failed >= MAX_FAILURES;
    await tx
      .update(loginAttempts)
      .set({ failedCount: locksNow ? 0 : failed, lockedUntil: locksNow ? new Date(now.getTime() + LOCK_MS) : null })
      .where(eq(loginAttempts.username, username));
    return locksNow ? ("locksNow" as const) : ("counted" as const);
  });
  if (reservation === "locked") return { ok: false, message: MESSAGES.loginLocked };

  const [member] = await db.select().from(members).where(eq(members.username, username));
  if (member?.active && (await verifyPassword(member.passwordHash, input.password))) {
    await db.delete(loginAttempts).where(eq(loginAttempts.username, username));
    const { token, sessionId } = await createSession(db, member.id, now);
    return { ok: true, token, actor: { memberId: member.id, role: member.role, sessionId } };
  }
  return { ok: false, message: reservation === "locksNow" ? MESSAGES.loginLocked : MESSAGES.badLogin };
}
