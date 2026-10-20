import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { SeasonId } from "@/domain/types";
import { formatSeason } from "@/ui/format";

function shift(season: SeasonId, by: number): SeasonId {
  const [y, m] = season.split("-").map(Number);
  const idx = y * 12 + (m - 1) + by;
  return `${Math.floor(idx / 12)}-${String((idx % 12) + 1).padStart(2, "0")}`;
}

const btn = "inline-flex size-11 items-center justify-center rounded-full border border-border";

export function SeasonPicker({
  value,
  max,
  hrefFor,
}: {
  value: SeasonId;
  max: SeasonId;
  hrefFor: (season: SeasonId) => string;
}) {
  const canNext = value < max;
  return (
    <div className="flex items-center justify-between gap-2">
      <Link href={hrefFor(shift(value, -1))} aria-label="Tháng trước" className={btn}>
        <ChevronLeft aria-hidden="true" className="size-5" />
      </Link>
      <span className="font-semibold">{formatSeason(value)}</span>
      {canNext ? (
        <Link href={hrefFor(shift(value, 1))} aria-label="Tháng sau" className={btn}>
          <ChevronRight aria-hidden="true" className="size-5" />
        </Link>
      ) : (
        <span aria-hidden="true" className={`${btn} opacity-30`}>
          <ChevronRight className="size-5" />
        </span>
      )}
    </div>
  );
}
