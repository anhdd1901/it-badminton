import { eq, inArray, sql } from "drizzle-orm";
import type { Db } from "../src/server/db/client";
import { members } from "../src/server/db/schema";
import { setAttendance } from "../src/server/match-days/attendance";
import { enterResult } from "../src/server/match-days/results";
import { getWeekView } from "../src/server/views/week";
import { setSubadmin } from "../src/server/members/admin";
import { createFirstAdmin } from "../src/server/members/bootstrap";
import { assertConnectedToE2e } from "../src/server/test/e2e-guard";
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
  const [{ current_database: connected }] = (await db.execute(
    sql`SELECT current_database()`,
  )) as unknown as { current_database: string }[];
  assertConnectedToE2e(connected);
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

/**
 * Seeds a past match day through the real services: attendance during the week, then every
 * match scored from 00:00 on the day (which finalizes the draft into the official schedule).
 * `scores[i]` is the result of match i + 1; matches beyond `scores` are left without a result.
 */
export async function seedPastMatchDay(
  db: Db,
  day: string,
  attendeeUsernames: string[],
  scores: [number, number][],
): Promise<void> {
  const [admin] = await db
    .select({ id: members.id })
    .from(members)
    .where(eq(members.username, "admin"));
  const actor = { memberId: admin.id, role: "admin" as const, sessionId: "e2e-seed" };
  const rows = await db
    .select({ id: members.id })
    .from(members)
    .where(inArray(members.username, attendeeUsernames));
  const midweek = new Date(`${day}T10:00:00+07:00`);
  midweek.setUTCDate(midweek.getUTCDate() - 3);
  for (const r of rows)
    await setAttendance(db, actor, { memberId: r.id, attending: true }, midweek);
  const matchStart = new Date(`${day}T00:00:00+07:00`);
  const view = await getWeekView(db, actor, matchStart);
  if (!view.schedule) throw new Error(`No schedule for ${day}`);
  for (const [i, [scoreA, scoreB]] of scores.entries()) {
    const matchNumber = view.schedule.matches[i].number;
    await enterResult(
      db,
      actor,
      { day, scheduleKey: view.schedule.key, matchNumber, scoreA, scoreB },
      new Date(matchStart.getTime() + (i + 1) * 60_000),
    );
  }
}
