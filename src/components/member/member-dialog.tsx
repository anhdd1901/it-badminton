"use client";
import { ChevronDown, ChevronUp } from "lucide-react";
import { useCallback, useRef, useState, type ReactNode } from "react";
import { getMemberProfileAction } from "@/app/_actions/member-profile";
import { MemberAvatar } from "@/components/member-avatar";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useAppAction } from "@/components/use-app-action";
import type { SeasonId } from "@/domain/types";
import type { MemberProfileView } from "@/server/views/member-profile";
import { cn } from "@/lib/utils";
import { formatDiff, formatElo, formatSeasonShort } from "@/ui/format";

const FOCUS_RING = "outline-none focus-visible:ring-2 focus-visible:ring-ring";

type State =
  | { kind: "loading" }
  | { kind: "error"; message: string }
  | { kind: "ready"; view: MemberProfileView };

export function MemberDialog({
  memberId,
  season,
  children,
  triggerClassName,
  triggerProps,
}: {
  memberId: string;
  season: SeasonId;
  children: ReactNode;
  triggerClassName?: string;
  triggerProps?: React.ComponentProps<"button">;
}) {
  const [state, setState] = useState<State>({ kind: "loading" });
  const openRef = useRef(false);
  const callRef = useRef(0);
  const { run } = useAppAction(getMemberProfileAction);

  const load = useCallback(async () => {
    const call = ++callRef.current;
    setState({ kind: "loading" });
    let next: State;
    try {
      const r = await run(memberId, season);
      next = r.ok ? { kind: "ready", view: r.data } : { kind: "error", message: r.message };
    } catch {
      next = { kind: "error", message: "" };
    }
    // Only the latest call counts, and only while the dialog is still open.
    if (call === callRef.current && openRef.current) setState(next);
  }, [run, memberId, season]);

  function onOpenChange(open: boolean) {
    openRef.current = open;
    if (open) void load();
    else {
      callRef.current++;
      setState({ kind: "loading" });
    }
  }

  const ready = state.kind === "ready" ? state.view : null;

  return (
    <Dialog onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        <button
          type="button"
          {...triggerProps}
          className={cn(FOCUS_RING, triggerClassName, triggerProps?.className)}
        >
          {children}
        </button>
      </DialogTrigger>
      <DialogContent className="max-sm:top-auto max-sm:bottom-0 max-sm:max-w-full max-sm:translate-y-0 max-sm:rounded-b-none max-sm:max-h-[90dvh] max-sm:overflow-y-auto sm:max-w-sm">
        <DialogDescription className="sr-only">Thông tin mem</DialogDescription>
        {ready ? (
          <Ready view={ready} />
        ) : (
          <>
            <DialogTitle className="sr-only">Thông tin mem</DialogTitle>
            {state.kind === "error" ? (
              <div role="alert" className="flex flex-col items-start gap-2">
                <p className="text-sm font-medium">Không tải được thông tin mem</p>
                {state.message ? <p className="text-sm text-text-2">{state.message}</p> : null}
                <Button
                  type="button"
                  variant="outline"
                  className="min-h-11"
                  onClick={() => void load()}
                >
                  Thử lại
                </Button>
              </div>
            ) : (
              <Skeleton />
            )}
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

const CELL_BOX = "flex flex-col gap-1 rounded-md bg-surface-2 p-3";

function Cell({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div data-slot="stat-cell" className={CELL_BOX}>
      <span className="text-xs text-text-2">{label}</span>
      <span className="text-lg font-semibold tabular-nums">{value}</span>
    </div>
  );
}

function Ready({ view }: { view: MemberProfileView }) {
  const { member, season, allTime } = view;
  const delta = view.lastMatchDayDelta;
  const label = delta
    ? `${delta > 0 ? "Tăng" : "Giảm"} ${formatElo(Math.abs(delta))} điểm ở buổi gần nhất`
    : undefined;
  return (
    <div className="flex flex-col gap-4 text-left">
      <DialogHeader className="flex-row items-center gap-3 pr-10">
        <MemberAvatar member={member} size={56} />
        <div className="flex min-w-0 flex-col gap-1">
          <DialogTitle className="truncate text-lg leading-tight">{member.displayName}</DialogTitle>
          <div className="flex items-center gap-2 text-sm text-text-2">
            {view.seed ? (
              <span
                role="img"
                aria-label={`Hạt giống ${view.seed}`}
                className={cn("size-3 rounded-full", view.seed === 1 ? "bg-seed-1" : "bg-seed-2")}
              />
            ) : (
              <span aria-label="Hạt giống: chưa có">–</span>
            )}
            {!member.active ? <span>Đã ngưng</span> : null}
          </div>
        </div>
      </DialogHeader>
      <div className="flex items-center gap-1">
        <span className="text-3xl font-semibold tabular-nums">{formatElo(view.eloTenths)}</span>
        {member.active && delta ? (
          delta > 0 ? (
            <ChevronUp aria-label={label} role="img" className="size-6 text-seed-2" />
          ) : (
            <ChevronDown aria-label={label} role="img" className="size-6 text-danger" />
          )
        ) : !member.active ? (
          <span aria-hidden="true" className="text-text-2">
            –
          </span>
        ) : null}
      </div>
      <section className="flex flex-col gap-2 border-t border-border pt-3">
        <h3 className="text-sm font-medium">Mùa {formatSeasonShort(season.id)}</h3>
        <div className="grid grid-cols-3 gap-2">
          <Cell label="Thắng" value={season.totals.wins} />
          <Cell label="Hiệu số" value={formatDiff(season.diff)} />
          <Cell label="Cầu thắng" value={season.totals.pointsFor} />
          <Cell label="Cầu thua" value={season.totals.pointsAgainst} />
          <Cell label="Số trận" value={season.totals.played} />
          <Cell label="Hạng" value={season.rank ?? "–"} />
        </div>
      </section>
      <section className="flex flex-col gap-2 border-t border-border pt-3">
        <h3 className="text-sm font-medium">Toàn thời gian</h3>
        <div className="grid grid-cols-3 gap-2">
          <Cell label="Thắng" value={allTime.totals.wins} />
          <Cell label="Hiệu số" value={formatDiff(allTime.diff)} />
          <Cell label="Cầu thắng" value={allTime.totals.pointsFor} />
          <Cell label="Cầu thua" value={allTime.totals.pointsAgainst} />
          <Cell label="Số trận" value={allTime.totals.played} />
        </div>
        <div className="grid grid-cols-4 gap-2">
          <Cell label="Hạng 1" value={allTime.podium.first} />
          <Cell label="Hạng 2" value={allTime.podium.second} />
          <Cell label="Hạng 3" value={allTime.podium.third} />
          <Cell label="Hạng 4" value={allTime.podium.fourth} />
        </div>
      </section>
    </div>
  );
}

function SkeletonCell() {
  return (
    <div data-slot="stat-cell" className={CELL_BOX}>
      <span className="h-4 w-12 animate-pulse rounded bg-border" />
      <span className="h-7 w-10 animate-pulse rounded bg-border" />
    </div>
  );
}

function Skeleton() {
  const bar = "animate-pulse rounded bg-surface-2";
  const group = (cells: number, podium: boolean, key: number) => (
    <section key={key} className="flex flex-col gap-2 border-t border-border pt-3">
      <div className={cn(bar, "h-5 w-24")} />
      <div className="grid grid-cols-3 gap-2">
        {Array.from({ length: cells }, (_, j) => (
          <SkeletonCell key={j} />
        ))}
      </div>
      {podium ? (
        <div className="grid grid-cols-4 gap-2">
          {Array.from({ length: 4 }, (_, j) => (
            <SkeletonCell key={j} />
          ))}
        </div>
      ) : null}
    </section>
  );
  return (
    <div role="status" aria-label="Đang tải" className="flex flex-col gap-4">
      <div className="flex items-center gap-3 pr-10">
        <div className="size-14 shrink-0 animate-pulse rounded-full bg-surface-2" />
        <div className="flex flex-col gap-1">
          <div className={cn(bar, "h-[22px] w-32")} />
          <div className={cn(bar, "h-5 w-20")} />
        </div>
      </div>
      <div className={cn(bar, "h-9 w-28")} />
      {group(6, false, 0)}
      {group(5, true, 1)}
    </div>
  );
}
