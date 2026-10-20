import { sql } from "drizzle-orm";
import type { Db } from "../src/server/db/client";
import { setSubadmin } from "../src/server/members/admin";
import { createFirstAdmin } from "../src/server/members/bootstrap";
import { TABLES } from "../src/server/test/tables";
import { createMember } from "../src/server/members/profile";

export const PASSWORD = "matkhau123";
export const FAKE_NOW = "2026-10-17T09:00:00+07:00";

export const SEED = [
  { username: "admin", displayName: "Quản trị", role: "admin", elo: 1000 },
  { username: "phu", displayName: "Phú", role: "subadmin", elo: 1100 },
  { username: "anh", displayName: "An", role: "member", elo: 1200 },
  { username: "binh", displayName: "Bình", role: "member", elo: 1300 },
  { username: "chi", displayName: "Chi", role: "member", elo: 1400 },
  { username: "dung", displayName: "Dũng", role: "member", elo: 1500 },
  { username: "emm", displayName: "Em", role: "member", elo: 1600 },
] as const;

export async function resetAndSeed(db: Db): Promise<void> {
  await db.execute(sql.raw(`TRUNCATE ${TABLES.join(", ")} RESTART IDENTITY CASCADE`));
  const seedTime = new Date(new Date(FAKE_NOW).getTime() - 7 * 24 * 3_600_000);
  const [first, ...rest] = SEED;
  const { id } = await createFirstAdmin(
    db,
    {
      username: first.username,
      displayName: first.displayName,
      password: PASSWORD,
      initialElo: first.elo,
    },
    seedTime,
  );
  const adminActor = { memberId: id, role: "admin" as const, sessionId: "e2e-seed" };
  for (const [i, m] of rest.entries()) {
    const created = await createMember(
      db,
      adminActor,
      { username: m.username, displayName: m.displayName, password: PASSWORD, initialElo: m.elo },
      new Date(seedTime.getTime() + (i + 1) * 60_000),
    );
    if (m.role === "subadmin") await setSubadmin(db, adminActor, created.id, true);
  }
}
