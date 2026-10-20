import { noDiagramMessage } from "@/domain/schedule";
import type { WeekView } from "@/server/views/week";

export function WeekNotice({ notice }: { notice: NonNullable<WeekView["notice"]> }) {
  const text =
    notice.kind === "NOT_ENOUGH"
      ? `Chưa đủ người để xếp lịch (cần ít nhất 5, hiện có ${notice.count})`
      : noDiagramMessage(notice.seed1, notice.seed2);
  return (
    <p role="status" className="rounded-lg border border-border bg-surface p-4 text-sm text-text-2">
      {text}
    </p>
  );
}
