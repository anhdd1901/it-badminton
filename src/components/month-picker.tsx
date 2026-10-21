"use client";

import { useRef, useState, type KeyboardEvent, type ReactNode } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { SeasonId } from "@/domain/types";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { formatSeason } from "@/ui/format";

export type MonthPickerProps = {
  value: SeasonId | null;
  onChange: (s: SeasonId | null) => void;
  max: SeasonId;
  min?: SeasonId;
  clearable?: boolean;
};

const STEPS: Record<string, number> = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -4, ArrowDown: 4 };

function yearOf(s: SeasonId): number {
  return Number(s.slice(0, 4));
}

function toSeason(year: number, month: number): SeasonId {
  return `${year}-${String(month).padStart(2, "0")}` as SeasonId;
}

export function MonthPicker({ value, onChange, max, min, clearable }: MonthPickerProps) {
  const [year, setYear] = useState(() => yearOf(value ?? max));
  const grid = useRef<HTMLDivElement>(null);
  const minYear = min ? yearOf(min) : null;
  const maxYear = yearOf(max);

  const isDisabled = (month: number) => {
    const s = toSeason(year, month);
    return s > max || (min !== undefined && s < min);
  };

  function onKeyDown(e: KeyboardEvent<HTMLDivElement>) {
    const step = STEPS[e.key];
    if (step === undefined) return;
    const cells = Array.from(grid.current?.querySelectorAll<HTMLButtonElement>("button") ?? []);
    const from = cells.indexOf(document.activeElement as HTMLButtonElement);
    if (from < 0) return;
    e.preventDefault();
    for (let j = from + step; j >= 0 && j < cells.length; j += step) {
      if (!cells[j].disabled) {
        cells[j].focus();
        return;
      }
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <button
          type="button"
          aria-label="Năm trước"
          disabled={minYear !== null && year <= minYear}
          onClick={() => setYear((y) => y - 1)}
          className="flex size-11 items-center justify-center rounded-md hover:bg-surface-2 disabled:opacity-40"
        >
          <ChevronLeft className="size-5" aria-hidden />
        </button>
        <span className="font-semibold tabular-nums">{year}</span>
        <button
          type="button"
          aria-label="Năm sau"
          disabled={year >= maxYear}
          onClick={() => setYear((y) => y + 1)}
          className="flex size-11 items-center justify-center rounded-md hover:bg-surface-2 disabled:opacity-40"
        >
          <ChevronRight className="size-5" aria-hidden />
        </button>
      </div>
      <div ref={grid} onKeyDown={onKeyDown} className="grid grid-cols-4 gap-2">
        {Array.from({ length: 12 }, (_, i) => i + 1).map((month) => {
          const season = toSeason(year, month);
          const selected = value === season;
          return (
            <button
              key={month}
              type="button"
              aria-label={formatSeason(season)}
              aria-pressed={selected}
              disabled={isDisabled(month)}
              onClick={() => onChange(season)}
              className={cn(
                "h-11 rounded-full text-sm font-medium tabular-nums disabled:opacity-40",
                selected ? "bg-accent text-on-accent" : "bg-surface-2",
              )}
            >
              T{month}
            </button>
          );
        })}
      </div>
      {clearable ? (
        <button
          type="button"
          onClick={() => onChange(null)}
          className="min-h-11 rounded-md bg-surface-2 text-sm font-medium"
        >
          Xóa
        </button>
      ) : null}
    </div>
  );
}

export function MonthPopover({
  children,
  id,
  triggerClassName,
  "aria-label": ariaLabel,
  onChange,
  ...pickerProps
}: MonthPickerProps & {
  children: ReactNode;
  id?: string;
  triggerClassName?: string;
  "aria-label"?: string;
}) {
  const [open, setOpen] = useState(false);
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button type="button" id={id} aria-label={ariaLabel} className={triggerClassName}>
          {children}
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-64" align="start">
        <MonthPicker
          {...pickerProps}
          onChange={(s) => {
            onChange(s);
            setOpen(false);
          }}
        />
      </PopoverContent>
    </Popover>
  );
}
