import type { ReactNode } from "react";
import type { MatchDayStatus } from "@/domain/match-day";
import type { LocalDate } from "@/domain/types";
import { formatDay } from "@/ui/format";

export const STATUS_LABEL: Record<MatchDayStatus, string> = {
  open: "Đang mở điểm danh",
  locked: "Đã khóa",
  closed: "Đã đóng lúc 12:00",
};

export function WeekHeader({
  day,
  status,
  children,
}: {
  day: LocalDate;
  status: MatchDayStatus;
  /** The attendance-count control (opens the roster dialog). */
  children: ReactNode;
}) {
  return (
    <header className="flex flex-col gap-1">
      <h1 className="text-xl font-bold">Tuần này</h1>
      <p className="text-lg font-semibold">{formatDay(day)}</p>
      <p className="text-sm text-accent-text">{STATUS_LABEL[status]}</p>
      {children}
    </header>
  );
}
