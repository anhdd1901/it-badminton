import { eq } from "drizzle-orm";
import { hashPassword } from "../auth/password";
import { revokeSessions } from "../auth/sessions";
import type { Db } from "../db/client";
import { loginAttempts, members } from "../db/schema";
import { AppError, MESSAGES } from "../errors";
import { parseDisplayName, parseEloInput, parsePassword, parseUsername } from "../validation";
import { isUniqueViolation, type NewMember, usernameExists } from "./profile";

const ADMIN_EXISTS = "Đã có admin, dùng chức năng chuyển quyền trong app";

async function adminExists(db: Db): Promise<boolean> {
  const rows = await db
    .select({ id: members.id })
    .from(members)
    .where(eq(members.role, "admin"))
    .limit(1);
  return rows.length > 0;
}

export async function createFirstAdmin(
  db: Db,
  input: NewMember,
  now: Date,
): Promise<{ id: string }> {
  const username = parseUsername(input.username);
  const displayName = parseDisplayName(input.displayName);
  const password = parsePassword(input.password);
  const initialEloTenths = parseEloInput(input.initialElo);
  if (await adminExists(db)) throw new AppError("VALIDATION", ADMIN_EXISTS);
  if (await usernameExists(db, username)) throw new AppError("CONFLICT", MESSAGES.usernameTaken);
  const passwordHash = await hashPassword(password);
  try {
    const [row] = await db
      .insert(members)
      .values({
        username,
        displayName,
        passwordHash,
        role: "admin",
        active: true,
        initialEloTenths,
        createdAt: now,
      })
      .returning({ id: members.id });
    return { id: row.id };
  } catch (e) {
    if (isUniqueViolation(e)) {
      if (await adminExists(db)) throw new AppError("VALIDATION", ADMIN_EXISTS);
      throw new AppError("CONFLICT", MESSAGES.usernameTaken);
    }
    throw e;
  }
}

export async function resetPasswordByUsername(
  db: Db,
  username: string,
  newPassword: string,
): Promise<void> {
  const passwordHash = await hashPassword(parsePassword(newPassword));
  const normalized = username.trim().toLowerCase();
  await db.transaction(async (tx) => {
    const rows = await tx
      .update(members)
      .set({ passwordHash })
      .where(eq(members.username, normalized))
      .returning({ id: members.id });
    if (rows.length === 0) throw new AppError("NOT_FOUND", MESSAGES.memberNotFound);
    await revokeSessions(tx, rows[0].id);
    await tx.delete(loginAttempts).where(eq(loginAttempts.username, normalized));
  });
}
