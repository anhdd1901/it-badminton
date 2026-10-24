import type { ReactNode } from "react";
import type { MatchDayStatus } from "@/domain/match-day";
import type { LocalDate } from "@/domain/types";
import { formatDayShort } from "@/ui/format";

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
    <header className="-mx-4 -mt-4 flex flex-col gap-1 border-b-[3px] border-chrome-active bg-chrome px-4 pt-4 pb-3 text-on-chrome">
      <h1 className="text-sm font-medium">Tuần này</h1>
      <p className="font-display text-[40px] leading-none font-bold italic">
        {formatDayShort(day)}
        <span className="text-base font-semibold">/{day.slice(0, 4)}</span>
      </p>
      <p className="text-sm text-chrome-active">{STATUS_LABEL[status]}</p>
      {children}
    </header>
  );
}
