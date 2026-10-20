import { sql } from "drizzle-orm";
import {
  boolean,
  date,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  primaryKey,
  text,
  timestamp,
  unique,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import type { SlotAssignment } from "@/domain/schedule";
import type { Pair } from "@/domain/types";

type ScheduledMatchJson = { number: number; teamA: Pair; teamB: Pair };

const id = () =>
  uuid("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`);
const tstz = (name: string) => timestamp(name, { withTimezone: true });
const memberRef = (name: string) =>
  uuid(name)
    .notNull()
    .references(() => members.id);

export const memberRole = pgEnum("member_role", ["admin", "subadmin", "member"]);

export const members = pgTable(
  "members",
  {
    id: id(),
    username: text("username").notNull().unique(),
    displayName: text("display_name").notNull(),
    passwordHash: text("password_hash").notNull(),
    role: memberRole("role").notNull(),
    active: boolean("active").notNull().default(true),
    initialEloTenths: integer("initial_elo_tenths").notNull(),
    avatarUrl: text("avatar_url"),
    createdAt: tstz("created_at").notNull(),
  },
  (t) => [
    uniqueIndex("members_single_admin")
      .on(t.role)
      .where(sql`${t.role} = 'admin'`),
  ],
);

export const authSessions = pgTable("auth_sessions", {
  id: id(),
  memberId: uuid("member_id")
    .notNull()
    .references(() => members.id, { onDelete: "cascade" }),
  tokenHash: text("token_hash").notNull().unique(),
  createdAt: tstz("created_at").notNull(),
  lastUsedAt: tstz("last_used_at").notNull(),
});

export const loginAttempts = pgTable("login_attempts", {
  username: text("username").primaryKey(),
  failedCount: integer("failed_count").notNull().default(0),
  lockedUntil: tstz("locked_until"),
});

export const matchDays = pgTable("match_days", {
  id: id(),
  day: date("day", { mode: "string" }).notNull().unique(),
  finalizedAt: tstz("finalized_at"),
});

export const attendances = pgTable(
  "attendances",
  {
    matchDayId: uuid("match_day_id")
      .notNull()
      .references(() => matchDays.id, { onDelete: "cascade" }),
    memberId: memberRef("member_id"),
    recordedBy: memberRef("recorded_by"),
    recordedAt: tstz("recorded_at").notNull(),
  },
  (t) => [primaryKey({ columns: [t.matchDayId, t.memberId] })],
);

export const draftSchedules = pgTable(
  "draft_schedules",
  {
    id: id(),
    matchDayId: uuid("match_day_id")
      .notNull()
      .references(() => matchDays.id, { onDelete: "cascade" }),
    attendeeKey: text("attendee_key").notNull(),
    diagramId: text("diagram_id").notNull(),
    assignments: jsonb("assignments").$type<SlotAssignment[]>().notNull(),
    matches: jsonb("matches").$type<ScheduledMatchJson[]>().notNull(),
    createdAt: tstz("created_at").notNull(),
  },
  (t) => [unique("draft_schedules_day_key").on(t.matchDayId, t.attendeeKey)],
);

export const officialSchedules = pgTable("official_schedules", {
  id: id(),
  matchDayId: uuid("match_day_id")
    .notNull()
    .unique()
    .references(() => matchDays.id, { onDelete: "cascade" }),
  attendeeKey: text("attendee_key").notNull(),
  diagramId: text("diagram_id").notNull(),
  assignments: jsonb("assignments").$type<SlotAssignment[]>().notNull(),
  createdAt: tstz("created_at").notNull(),
});

export const scheduledMatches = pgTable(
  "scheduled_matches",
  {
    id: id(),
    officialScheduleId: uuid("official_schedule_id")
      .notNull()
      .references(() => officialSchedules.id, { onDelete: "cascade" }),
    number: integer("number").notNull(),
    a1: memberRef("a1"),
    a2: memberRef("a2"),
    b1: memberRef("b1"),
    b2: memberRef("b2"),
  },
  (t) => [unique("scheduled_matches_schedule_number").on(t.officialScheduleId, t.number)],
);

export const matchResults = pgTable("match_results", {
  scheduledMatchId: uuid("scheduled_match_id")
    .primaryKey()
    .references(() => scheduledMatches.id, { onDelete: "cascade" }),
  scoreA: integer("score_a").notNull(),
  scoreB: integer("score_b").notNull(),
  enteredBy: memberRef("entered_by"),
  enteredAt: tstz("entered_at").notNull(),
  version: integer("version").notNull().default(1),
});

export const eloAdjustments = pgTable("elo_adjustments", {
  id: id(),
  memberId: memberRef("member_id"),
  eloTenths: integer("elo_tenths").notNull(),
  adjustedBy: memberRef("adjusted_by"),
  at: tstz("at").notNull(),
});
