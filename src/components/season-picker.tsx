"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { ReactNode } from "react";
import { MonthPopover } from "@/components/month-picker";
import type { SeasonId } from "@/domain/types";
import { formatSeason } from "@/ui/format";

function shift(season: SeasonId, by: number): SeasonId {
  const [y, m] = season.split("-").map(Number);
  const idx = y * 12 + (m - 1) + by;
  return `${Math.floor(idx / 12)}-${String((idx % 12) + 1).padStart(2, "0")}` as SeasonId;
}

const btn = "inline-flex size-11 items-center justify-center rounded-[6px] border border-border";

export function SeasonPicker({
  value,
  min,
  max,
  hrefBase,
}: {
  value: SeasonId;
  min: SeasonId;
  max: SeasonId;
  hrefBase: string;
}) {
  const router = useRouter();
  return (
    <div className="flex items-center justify-between gap-2">
      <Step
        enabled={value > min}
        href={`${hrefBase}${shift(value, -1)}`}
        label="Tháng trước"
        icon={<ChevronLeft aria-hidden="true" className="size-5" />}
      />
      <MonthPopover
        value={value}
        min={min}
        max={max}
        onChange={(s) => {
          if (s) router.push(`${hrefBase}${s}`);
        }}
        triggerClassName="inline-flex min-h-11 items-center gap-1 rounded-[6px] px-2 font-semibold"
      >
        {formatSeason(value)}
      </MonthPopover>
      <Step
        enabled={value < max}
        href={`${hrefBase}${shift(value, 1)}`}
        label="Tháng sau"
        icon={<ChevronRight aria-hidden="true" className="size-5" />}
      />
    </div>
  );
}

function Step({
  enabled,
  href,
  label,
  icon,
}: {
  enabled: boolean;
  href: string;
  label: string;
  icon: ReactNode;
}) {
  return enabled ? (
    <Link href={href} aria-label={label} className={btn}>
      {icon}
    </Link>
  ) : (
    <span aria-label={label} aria-disabled="true" className={`${btn} opacity-30`}>
      {icon}
    </span>
  );
}
