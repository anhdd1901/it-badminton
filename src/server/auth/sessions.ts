import { createHash, randomBytes } from "node:crypto";
import { and, eq, ne } from "drizzle-orm";
import type { Actor } from "../actor";
import type { Db, Tx } from "../db/client";
import { authSessions, members } from "../db/schema";

function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export async function createSession(
  db: Db,
  memberId: string,
  now: Date,
): Promise<{ token: string; sessionId: string }> {
  const token = randomBytes(32).toString("base64url");
  const [row] = await db
    .insert(authSessions)
    .values({ memberId, tokenHash: hashToken(token), createdAt: now, lastUsedAt: now })
    .returning({ id: authSessions.id });
  return { token, sessionId: row.id };
}

export async function resolveSession(db: Db, token: string, now: Date): Promise<Actor | null> {
  const [row] = await db
    .select({
      sessionId: authSessions.id,
      memberId: members.id,
      role: members.role,
      active: members.active,
    })
    .from(authSessions)
    .innerJoin(members, eq(members.id, authSessions.memberId))
    .where(eq(authSessions.tokenHash, hashToken(token)));
  if (!row || !row.active) return null;
  await db.update(authSessions).set({ lastUsedAt: now }).where(eq(authSessions.id, row.sessionId));
  return { memberId: row.memberId, role: row.role, sessionId: row.sessionId };
}

export async function revokeSessions(
  db: Db | Tx,
  memberId: string,
  exceptSessionId?: string,
): Promise<void> {
  await db
    .delete(authSessions)
    .where(
      exceptSessionId
        ? and(eq(authSessions.memberId, memberId), ne(authSessions.id, exceptSessionId))
        : eq(authSessions.memberId, memberId),
    );
}

export async function logout(db: Db, token: string): Promise<void> {
  await db.delete(authSessions).where(eq(authSessions.tokenHash, hashToken(token)));
}
