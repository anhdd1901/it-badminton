"use client";

import Link from "next/link";
import { useState } from "react";
import { CalendarDays } from "lucide-react";
import type { SeasonId } from "@/domain/types";
import { MonthPopover } from "@/components/month-picker";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { formatSeason } from "@/ui/format";
export type StatsFilterMember = {
  id: string;
  displayName: string;
  active: boolean;
  username?: never;
};

export type StatsFilterValue = {
  view: "mem" | "cap";
  from?: string;
  to?: string;
  memberId?: string;
};

const ALL = "all";

// Same height and border as `Input`.
const TRIGGER_CLASS =
  "flex h-11 w-full items-center justify-between gap-2 rounded-md border border-input bg-transparent px-2.5 text-left text-base shadow-xs md:text-sm";

export function StatsFilter({
  value,
  members,
  bounds,
}: {
  value: StatsFilterValue;
  // Serialized to the browser: no username (spec 8.2).
  members: StatsFilterMember[];
  bounds: { min: SeasonId; max: SeasonId };
}) {
  const [from, setFrom] = useState<SeasonId | null>((value.from as SeasonId | undefined) ?? null);
  const [to, setTo] = useState<SeasonId | null>((value.to as SeasonId | undefined) ?? null);
  const [member, setMember] = useState(value.memberId ?? ALL);

  return (
    <form
      method="get"
      action="/thong-ke"
      className="grid grid-cols-1 gap-3 rounded-lg border border-border p-3 sm:grid-cols-3"
    >
      <input type="hidden" name="xem" value={value.view} />
      <input type="hidden" name="tu" value={from ?? ""} />
      <input type="hidden" name="den" value={to ?? ""} />
      <input type="hidden" name="mem" value={member === ALL ? "" : member} />
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="stats-tu">Từ tháng</Label>
        <MonthPopover
          id="stats-tu"
          value={from}
          onChange={setFrom}
          min={bounds.min}
          max={bounds.max}
          clearable
          triggerClassName={TRIGGER_CLASS}
        >
          <span>{from ? formatSeason(from) : "Toàn bộ"}</span>
          <CalendarDays aria-hidden className="size-4 text-text-2" />
        </MonthPopover>
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="stats-den">Đến tháng</Label>
        <MonthPopover
          id="stats-den"
          value={to}
          onChange={setTo}
          min={bounds.min}
          max={bounds.max}
          clearable
          triggerClassName={TRIGGER_CLASS}
        >
          <span>{to ? formatSeason(to) : "Toàn bộ"}</span>
          <CalendarDays aria-hidden className="size-4 text-text-2" />
        </MonthPopover>
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="stats-mem">Mem</Label>
        <Select value={member} onValueChange={setMember}>
          <SelectTrigger id="stats-mem" className="h-11 w-full text-base md:text-sm">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>Tất cả mem</SelectItem>
            {members.map((m) => (
              <SelectItem key={m.id} value={m.id}>
                {m.active ? m.displayName : `${m.displayName} (đã ngưng)`}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="flex items-center gap-2 sm:col-span-3">
        <Button type="submit">Lọc</Button>
        <Link
          href={`/thong-ke?xem=${value.view}`}
          className="inline-flex min-h-11 items-center rounded-md px-3 text-sm text-text-2 underline"
        >
          Bỏ lọc
        </Link>
      </div>
    </form>
  );
}
