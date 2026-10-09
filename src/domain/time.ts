import { TZDate } from "@date-fns/tz";
import { addDays, format, startOfISOWeek } from "date-fns";
import type { LocalDate, SeasonId } from "./types";

export const TIME_ZONE = "Asia/Ho_Chi_Minh";

function parseYmd(date: string): number[] {
  return date.split("-").map(Number);
}

/** Midnight (Vietnam time) of a "YYYY-MM-DD" date. */
function vnMidnight(date: LocalDate): TZDate {
  const [y, m, d] = parseYmd(date);
  return new TZDate(y, m - 1, d, TIME_ZONE);
}

function toLocalDate(d: Date): LocalDate {
  return format(d, "yyyy-MM-dd");
}

export function matchDayOfWeek(now: Date): LocalDate {
  const vnNow = new TZDate(now.getTime(), TIME_ZONE);
  return toLocalDate(addDays(startOfISOWeek(vnNow), 5));
}

export function weekStart(matchDay: LocalDate): Date {
  return new Date(startOfISOWeek(vnMidnight(matchDay)).getTime());
}

export function weekEnd(matchDay: LocalDate): Date {
  return new Date(addDays(startOfISOWeek(vnMidnight(matchDay)), 7).getTime());
}

export function matchDayStart(matchDay: LocalDate): Date {
  return new Date(vnMidnight(matchDay).getTime());
}

export function checkInClosesAt(matchDay: LocalDate): Date {
  const [y, m, d] = parseYmd(matchDay);
  return new Date(new TZDate(y, m - 1, d, 12, 0, 0, TIME_ZONE).getTime());
}

export function seasonOf(matchDay: LocalDate): SeasonId {
  return matchDay.slice(0, 7);
}

export function lastMatchDayOfSeason(season: SeasonId): LocalDate {
  const [y, m] = parseYmd(season);
  const lastDay = new TZDate(y, m, 0, TIME_ZONE); // day 0 of next month = last day of month
  const daysBackToSaturday = (lastDay.getDay() + 1) % 7;
  return toLocalDate(addDays(lastDay, -daysBackToSaturday));
}

export function isPastMatchDay(matchDay: LocalDate, now: Date): boolean {
  return now.getTime() >= weekEnd(matchDay).getTime();
}
