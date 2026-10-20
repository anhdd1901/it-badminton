import { randomBytes } from "node:crypto";
import { and, eq, isNull, lt, or, sql } from "drizzle-orm";
import type { Actor } from "../actor";
import type { Db } from "../db/client";
import { loginAttempts, members } from "../db/schema";
import { MESSAGES } from "../errors";
import { hashPassword, verifyPassword } from "./password";
import { createSession } from "./sessions";

export type LoginResult =
  { ok: true; token: string; actor: Actor } | { ok: false; message: string };

const MAX_FAILURES = 5;
const LOCK_MS = 15 * 60_000;
/** Same format as parseUsername: anything else cannot be a member, so it is not counted. */
const USERNAME_FORMAT = /^[a-z0-9._]{3,30}$/;
const STALE_ATTEMPT_MS = 24 * 3_600_000;

function makeDummyHash(): Promise<string> {
  const p = hashPassword(randomBytes(16).toString("hex"));
  // Drop a failed attempt so the next call retries instead of failing forever.
  p.catch(() => {
    if (dummyHash === p) dummyHash = undefined;
  });
  return p;
}
/** Hash checked when no active member matches, so response time does not reveal usernames. Started at load. */
let dummyHash: Promise<string> | undefined = makeDummyHash();
function getDummyHash(): Promise<string> {
  dummyHash ??= makeDummyHash();
  return dummyHash;
}

export async function login(
  db: Db,
  input: { username: string; password: string },
  now: Date,
): Promise<LoginResult> {
  const username = input.username.trim().toLowerCase();
  if (!USERNAME_FORMAT.test(username)) return { ok: false, message: MESSAGES.badLogin };

  await db
    .delete(loginAttempts)
    .where(
      and(
        lt(loginAttempts.lastFailedAt, new Date(now.getTime() - STALE_ATTEMPT_MS)),
        or(isNull(loginAttempts.lockedUntil), lt(loginAttempts.lockedUntil, now)),
      ),
    );

  // Reserve the attempt atomically (row lock) before the slow password check,
  // so parallel guesses cannot all read the same failed count.
  const reservation = await db.transaction(async (tx) => {
    // Upsert-and-lock in one statement: a separate insert + select could find the row
    // deleted in between (successful login, password reset, cleanup).
    const [row] = await tx
      .insert(loginAttempts)
      .values({ username })
      .onConflictDoUpdate({
        target: loginAttempts.username,
        set: { username: sql`excluded.username` },
      })
      .returning();
    if (row.lockedUntil && row.lockedUntil > now) return "locked" as const;
    const failed = row.failedCount + 1;
    const locksNow = failed >= MAX_FAILURES;
    await tx
      .update(loginAttempts)
      .set({
        failedCount: locksNow ? 0 : failed,
        lockedUntil: locksNow ? new Date(now.getTime() + LOCK_MS) : null,
        lastFailedAt: now,
      })
      .where(eq(loginAttempts.username, username));
    return locksNow ? ("locksNow" as const) : ("counted" as const);
  });
  if (reservation === "locked") return { ok: false, message: MESSAGES.loginLocked };

  const [member] = await db.select().from(members).where(eq(members.username, username));
  const hashToCheck = member?.active ? member.passwordHash : await getDummyHash();
  const passwordOk = await verifyPassword(hashToCheck, input.password);
  if (member?.active && passwordOk) {
    await db.delete(loginAttempts).where(eq(loginAttempts.username, username));
    const { token, sessionId } = await createSession(db, member.id, now);
    return { ok: true, token, actor: { memberId: member.id, role: member.role, sessionId } };
  }
  return {
    ok: false,
    message: reservation === "locksNow" ? MESSAGES.loginLocked : MESSAGES.badLogin,
  };
}
