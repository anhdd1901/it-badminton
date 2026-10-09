import {
  checkInClosesAt,
  isPastMatchDay,
  matchDayOfWeek,
  matchDayStart,
  weekStart,
} from "./time";
import type { LocalDate } from "./types";

export type Role = "admin" | "subadmin" | "member";
export type MatchDayStatus = "open" | "locked" | "closed";

// closed: now ≥ 12:00 thứ 7. locked: trước đó và lịch chính thức có ≥ 1 kết quả. open: còn lại.
export function matchDayStatus(
  matchDay: LocalDate,
  now: Date,
  officialResultCount: number,
): MatchDayStatus {
  if (now.getTime() >= checkInClosesAt(matchDay).getTime()) return "closed";
  if (officialResultCount > 0) return "locked";
  return "open";
}

// được đổi điểm danh: buổi của tuần hiện tại, now ≥ 00:00 thứ 2, trạng thái "open"
export function canChangeAttendance(
  matchDay: LocalDate,
  now: Date,
  officialResultCount: number,
): boolean {
  return (
    matchDayOfWeek(now) === matchDay &&
    now.getTime() >= weekStart(matchDay).getTime() &&
    matchDayStatus(matchDay, now, officialResultCount) === "open"
  );
}

// nhập/sửa/xóa kết quả: buổi tuần hiện tại và now ≥ 00:00 thứ 7 → admin, subadmin; buổi đã qua → admin; còn lại → không
export function canEditResults(matchDay: LocalDate, now: Date, role: Role): boolean {
  if (isPastMatchDay(matchDay, now)) return role === "admin";
  if (matchDayOfWeek(now) === matchDay && now.getTime() >= matchDayStart(matchDay).getTime()) {
    return role === "admin" || role === "subadmin";
  }
  return false;
}
