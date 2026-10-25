"use client";

import Link from "next/link";
import { useState } from "react";
import { CalendarDays } from "lucide-react";
import type { SeasonId } from "@/domain/types";
import { MemberPill, PILL_ITEM_CLASS, PILL_TRIGGER_CLASS } from "@/components/member-pill";
import { MonthPopover } from "@/components/month-picker";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { formatSeason } from "@/ui/format";
export type StatsFilterMember = {
  id: string;
  displayName: string;
  avatarUrl: string | null;
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
  "flex h-11 w-full min-w-0 items-center justify-between gap-2 rounded-md border border-input bg-transparent px-2.5 text-left text-base shadow-xs md:text-sm";

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

  const selected = members.find((m) => m.id === member);

  return (
    <form
      method="get"
      action="/thong-ke"
      className="flex flex-col gap-2 rounded-lg border border-border p-3"
    >
      <input type="hidden" name="xem" value={value.view} />
      <input type="hidden" name="tu" value={from ?? ""} />
      <input type="hidden" name="den" value={to ?? ""} />
      <input type="hidden" name="mem" value={member === ALL ? "" : member} />
      {/* Từ tháng – đến tháng chung một dòng, kể cả trên điện thoại. */}
      <div className="grid grid-cols-2 gap-2">
        <MonthPopover
          id="stats-tu"
          aria-label="Từ tháng"
          value={from}
          onChange={setFrom}
          min={bounds.min}
          max={bounds.max}
          clearable
          triggerClassName={TRIGGER_CLASS}
        >
          <span className={from ? undefined : "text-text-2"}>
            {from ? formatSeason(from) : "Từ tháng"}
          </span>
          <CalendarDays aria-hidden className="size-4 shrink-0 text-text-2" />
        </MonthPopover>
        <MonthPopover
          id="stats-den"
          aria-label="Đến tháng"
          value={to}
          onChange={setTo}
          min={bounds.min}
          max={bounds.max}
          clearable
          triggerClassName={TRIGGER_CLASS}
        >
          <span className={to ? undefined : "text-text-2"}>
            {to ? formatSeason(to) : "Đến tháng"}
          </span>
          <CalendarDays aria-hidden className="size-4 shrink-0 text-text-2" />
        </MonthPopover>
      </div>
      {/* Mem, Lọc và Bỏ lọc chung một dòng. */}
      <div className="flex items-center gap-2">
        <Select value={member} onValueChange={setMember}>
          <SelectTrigger
            id="stats-mem"
            aria-label="Mem"
            className={cn(
              "min-w-0 flex-1 text-base data-[size=default]:h-11 md:text-sm dark:bg-transparent dark:hover:bg-transparent",
              PILL_TRIGGER_CLASS,
            )}
          >
            <SelectValue>
              {selected ? (
                <MemberPill
                  plain
                  player={selected}
                  note={selected.active ? undefined : "đã ngưng"}
                />
              ) : (
                "Tất cả mem"
              )}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>Tất cả mem</SelectItem>
            {members.map((m) => (
              <SelectItem key={m.id} value={m.id} className={PILL_ITEM_CLASS}>
                <MemberPill
                  plain
                  className="pr-6"
                  player={m}
                  note={m.active ? undefined : "đã ngưng"}
                />
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button type="submit" className="shrink-0 px-4">
          Lọc
        </Button>
        <Link
          href={`/thong-ke?xem=${value.view}`}
          onClick={() => {
            // Chưa bấm Lọc thì URL không đổi, trang không tải lại: tự đưa ô về trống.
            setFrom(null);
            setTo(null);
            setMember(ALL);
          }}
          className={cn(buttonVariants({ variant: "outline" }), "shrink-0 px-3")}
        >
          Bỏ lọc
        </Link>
      </div>
    </form>
  );
}
