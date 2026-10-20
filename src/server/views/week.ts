import { asc, eq, sql } from "drizzle-orm";
import {
  canChangeAttendance,
  canEditResults,
  type MatchDayStatus,
  matchDayStatus,
} from "@/domain/match-day";
import { attendeeKey } from "@/domain/schedule";
import { checkInClosesAt, matchDayOfWeek } from "@/domain/time";
import type { LocalDate } from "@/domain/types";
import type { Actor } from "../actor";
import { loadCurrentSeeds } from "../data/loaders";
import type { Db } from "../db/client";
import {
  attendances,
  matchDays,
  matchResults,
  members,
  officialSchedules,
  scheduledMatches,
} from "../db/schema";
import { finalizeDue, findDraft, officialResultCount } from "../match-days/schedule";
import { loadMemberRefs, ref as memberRef } from "./rankings";

export type PlayerRef = {
  id: string;
  displayName: string;
  avatarUrl: string | null;
  seed: 1 | 2 | null;
};
export type WeekMatch = {
  number: number;
  teamA: [PlayerRef, PlayerRef];
  teamB: [PlayerRef, PlayerRef];
  result: { scoreA: number; scoreB: number; version: number } | null;
};
export type WeekView = {
  day: LocalDate;
  status: MatchDayStatus;
  closesAt: Date;
  attendees: { member: PlayerRef; recordedBySelf: boolean }[];
  activeMemberCount: number;
  actorAttending: boolean;
  /** `key`: attendee key of the schedule; result writes send it back as `scheduleKey`. */
  schedule: { source: "draft" | "official"; key: string; matches: WeekMatch[] } | null;
  notice:
    | { kind: "NOT_ENOUGH"; count: number }
    | { kind: "NO_DIAGRAM"; seed1: number; seed2: number }
    | null;
  can: { changeOwnAttendance: boolean; manageAttendance: boolean; editResults: boolean };
};

type RawMatch = {
  number: number;
  teamA: readonly [string, string];
  teamB: readonly [string, string];
  result: WeekMatch["result"];
};

export async function getWeekView(db: Db, actor: Actor, now: Date): Promise<WeekView> {
  await finalizeDue(db, now);
  const day = matchDayOfWeek(now);
  const closesAt = checkInClosesAt(day);

  const [activeRow] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(members)
    .where(eq(members.active, true));
  const activeMemberCount = activeRow.n;

  const [dayRow] = await db
    .select({ id: matchDays.id })
    .from(matchDays)
    .where(eq(matchDays.day, day));
  if (!dayRow) {
    return {
      day,
      status: matchDayStatus(day, now, 0),
      closesAt,
      attendees: [],
      activeMemberCount,
      actorAttending: false,
      schedule: null,
      notice: { kind: "NOT_ENOUGH", count: 0 },
      can: permissions(day, now, 0, actor),
    };
  }

  const [attendeeRows, resultCount, currentSeeds] = await Promise.all([
    db
      .select({
        memberId: attendances.memberId,
        recordedBy: attendances.recordedBy,
        displayName: members.displayName,
        avatarUrl: members.avatarUrl,
      })
      .from(attendances)
      .innerJoin(members, eq(attendances.memberId, members.id))
      .where(eq(attendances.matchDayId, dayRow.id))
      .orderBy(asc(attendances.recordedAt), asc(attendances.memberId)),
    officialResultCount(db, dayRow.id),
    loadCurrentSeeds(db),
  ]);

  const ids = attendeeRows.map((r) => r.memberId);
  const attendees = attendeeRows.map((r) => ({
    member: {
      id: r.memberId,
      displayName: r.displayName,
      avatarUrl: r.avatarUrl,
      seed: currentSeeds.get(r.memberId) ?? null,
    },
    recordedBySelf: r.recordedBy === r.memberId,
  }));

  // Schedule: official if any, else the draft matching the current list.
  let source: "draft" | "official" | null = null;
  let key = "";
  let seedOf = new Map<string, 1 | 2>();
  let rawMatches: RawMatch[] = [];
  const [official] = await db
    .select()
    .from(officialSchedules)
    .where(eq(officialSchedules.matchDayId, dayRow.id));
  if (official) {
    source = "official";
    key = official.attendeeKey;
    seedOf = new Map(official.assignments.map((a) => [a.memberId, a.seed]));
    const rows = await db
      .select({
        number: scheduledMatches.number,
        a1: scheduledMatches.a1,
        a2: scheduledMatches.a2,
        b1: scheduledMatches.b1,
        b2: scheduledMatches.b2,
        scoreA: matchResults.scoreA,
        scoreB: matchResults.scoreB,
        version: matchResults.version,
      })
      .from(scheduledMatches)
      .leftJoin(matchResults, eq(matchResults.scheduledMatchId, scheduledMatches.id))
      .where(eq(scheduledMatches.officialScheduleId, official.id))
      .orderBy(asc(scheduledMatches.number));
    rawMatches = rows.map((r) => ({
      number: r.number,
      teamA: [r.a1, r.a2],
      teamB: [r.b1, r.b2],
      result:
        r.scoreA === null || r.scoreB === null || r.version === null
          ? null
          : { scoreA: r.scoreA, scoreB: r.scoreB, version: r.version },
    }));
  } else {
    // Drafts cover active attendees only (see refreshDraft).
    const activeIds = ids.filter((id) => currentSeeds.has(id));
    const draft =
      activeIds.length >= 5 ? await findDraft(db, dayRow.id, attendeeKey(activeIds)) : null;
    if (draft) {
      source = "draft";
      key = draft.attendeeKey;
      seedOf = new Map(draft.assignments.map((a) => [a.memberId, a.seed]));
      rawMatches = draft.matches.map((m) => ({
        number: m.number,
        teamA: m.teamA,
        teamB: m.teamB,
        result: null,
      }));
    }
  }

  let schedule: WeekView["schedule"] = null;
  if (source) {
    // Official schedules may include members who are no longer in the list.
    const refs = await loadMemberRefs(
      db,
      rawMatches.flatMap((m) => [...m.teamA, ...m.teamB]),
    );
    const ref = (id: string): PlayerRef => {
      const m = memberRef(refs, id);
      return {
        id,
        displayName: m.displayName,
        avatarUrl: m.avatarUrl,
        seed: seedOf.get(id) ?? null,
      };
    };
    schedule = {
      source,
      key,
      matches: rawMatches.map((m) => ({
        number: m.number,
        teamA: [ref(m.teamA[0]), ref(m.teamA[1])],
        teamB: [ref(m.teamB[0]), ref(m.teamB[1])],
        result: m.result,
      })),
    };
  }

  let notice: WeekView["notice"] = null;
  const activeCount = ids.filter((id) => currentSeeds.has(id)).length;
  if (activeCount < 5) notice = { kind: "NOT_ENOUGH", count: activeCount };
  else if (!schedule) {
    notice = {
      kind: "NO_DIAGRAM",
      seed1: attendees.filter((a) => a.member.seed === 1).length,
      seed2: attendees.filter((a) => a.member.seed === 2).length,
    };
  }

  return {
    day,
    status: matchDayStatus(day, now, resultCount),
    closesAt,
    attendees,
    activeMemberCount,
    actorAttending: ids.includes(actor.memberId),
    schedule,
    notice,
    can: permissions(day, now, resultCount, actor),
  };
}

function permissions(
  day: LocalDate,
  now: Date,
  resultCount: number,
  actor: Actor,
): WeekView["can"] {
  const changeable = canChangeAttendance(day, now, resultCount);
  return {
    changeOwnAttendance: changeable,
    manageAttendance: (actor.role === "admin" || actor.role === "subadmin") && changeable,
    editResults: canEditResults(day, now, actor.role),
  };
}
