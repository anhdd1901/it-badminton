import { existsSync } from "node:fs";
import { hash } from "@node-rs/argon2";
import { sql } from "drizzle-orm";
import { afterAll, beforeEach } from "vitest";
import type { Role } from "@/domain/types";
import { createDb, type Db } from "../db/client";
import { members } from "../db/schema";

export const TEST_PASSWORD = "matkhau123";

/** "2026-10-14T10:00" (Vietnam local time) to an instant. */
export function vn(local: string): Date {
  return new Date(`${local}:00+07:00`);
}

const TABLES = [
  "members",
  "auth_sessions",
  "login_attempts",
  "match_days",
  "attendances",
  "draft_schedules",
  "official_schedules",
  "scheduled_matches",
  "match_results",
  "elo_adjustments",
];

let memberCounter = 0;
let passwordHash: Promise<string> | undefined;

export function useTestDb(): { get db(): Db } {
  if (!process.env.DATABASE_URL_TEST && existsSync(".env")) process.loadEnvFile(".env");
  const url = process.env.DATABASE_URL_TEST;
  if (!url) throw new Error("DATABASE_URL_TEST is not set");
  const { db, close } = createDb(url);
  beforeEach(async () => {
    memberCounter = 0;
    await db.execute(sql.raw(`TRUNCATE ${TABLES.join(", ")} RESTART IDENTITY CASCADE`));
  });
  afterAll(close);
  return {
    get db() {
      return db;
    },
  };
}

export async function makeMember(
  db: Db,
  o: Partial<{
    username: string;
    displayName: string;
    role: Role;
    active: boolean;
    initialEloTenths: number;
    createdAt: Date;
  }> = {},
): Promise<{ id: string; username: string; role: Role }> {
  memberCounter += 1;
  const username = o.username ?? `mem${memberCounter}`;
  const role = o.role ?? "member";
  passwordHash ??= hash(TEST_PASSWORD);
  const [row] = await db
    .insert(members)
    .values({
      username,
      displayName: o.displayName ?? username,
      passwordHash: await passwordHash,
      role,
      active: o.active ?? true,
      initialEloTenths: o.initialEloTenths ?? 10000,
      createdAt: o.createdAt ?? new Date(vn("2026-01-01T00:00").getTime() + memberCounter * 60_000),
    })
    .returning({ id: members.id });
  return { id: row.id, username, role };
}
