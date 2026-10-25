"use client";
import { ChevronDown } from "lucide-react";
import { useState } from "react";
import { MatchCard } from "@/components/match/match-card";
import { PlayerFocusProvider } from "@/components/player-focus";
import type { LocalDate, SeasonId } from "@/domain/types";
import { cn } from "@/lib/utils";
import type { WeekMatch } from "@/server/views/week";
import { formatDay } from "@/ui/format";

export type HistoryDayItem = {
  day: LocalDate;
  playerCount: number;
  matchCount: number;
  resultCount: number;
  scheduleKey: string;
  editable: boolean;
  matches: WeekMatch[];
};

// Below the sticky month picker (py-2 + h-11 = 60px).
const STICKY_TOP = "top-[60px]";

export function HistoryDays({
  days,
  season,
  initialOpen,
}: {
  days: HistoryDayItem[];
  season: SeasonId;
  initialOpen?: string;
}) {
  const [open, setOpen] = useState<ReadonlySet<string>>(
    () => new Set(initialOpen ? [initialOpen] : []),
  );
  const toggle = (day: string) =>
    setOpen((cur) => {
      const next = new Set(cur);
      if (next.has(day)) next.delete(day);
      else next.add(day);
      return next;
    });

  return (
    // Spec 8.2: name highlight applies to matches only.
    <PlayerFocusProvider>
      <div className="flex flex-col gap-3">
        {days.map((d) => {
          const expanded = open.has(d.day);
          const panelId = `ngay-${d.day}`;
          return (
            // Each header sticks only within its own section, so the next day pushes it away.
            <section key={d.day} className="flex flex-col gap-2">
              <h2 className={cn("sticky z-20 bg-bg", STICKY_TOP)}>
                <button
                  type="button"
                  aria-expanded={expanded}
                  aria-controls={panelId}
                  onClick={() => toggle(d.day)}
                  className="flex min-h-11 w-full items-center gap-3 rounded-lg border border-border bg-surface p-3 text-left text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <span className="flex min-w-0 flex-1 flex-col">
                    <span className="font-display text-lg font-bold italic">
                      {formatDay(d.day)}
                    </span>
                    <span className="sr-only">, </span>
                    <span className="font-normal text-text-2 tabular-nums">
                      {d.playerCount} người · đã nhập {d.resultCount}/{d.matchCount} trận
                    </span>
                  </span>
                  <ChevronDown
                    aria-hidden="true"
                    className={cn("size-5 shrink-0 transition-transform", expanded && "rotate-180")}
                  />
                </button>
              </h2>
              {expanded ? (
                <div id={panelId} className="flex flex-col gap-2">
                  {d.matches.map((m) => (
                    <MatchCard
                      key={m.number}
                      match={m}
                      editable={d.editable}
                      day={d.day}
                      scheduleKey={d.scheduleKey}
                      season={season}
                    />
                  ))}
                </div>
              ) : null}
            </section>
          );
        })}
      </div>
    </PlayerFocusProvider>
  );
}
