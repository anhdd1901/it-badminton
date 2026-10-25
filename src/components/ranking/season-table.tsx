import { Check, X } from "lucide-react";
import type { getSeasonView } from "@/server/views/rankings";
import { MemberAvatar } from "@/components/member-avatar";
import { PlayerName } from "@/components/player-name";
import type { SeasonId } from "@/domain/types";
import { cn } from "@/lib/utils";
import { formatDiff } from "@/ui/format";

type Row = Awaited<ReturnType<typeof getSeasonView>>["rows"][number];

const th = "p-2 text-right font-medium";

const MEDAL: Record<number, string> = {
  1: "bg-gold",
  2: "bg-silver",
  3: "bg-bronze",
  4: "bg-fourth",
};

// Top 4 (đồng hạng cùng huy chương): huy chương có số sau tên; hạng khác không hiện gì.
export function RankBadge({ rank }: { rank: number }) {
  const medal = MEDAL[rank];
  if (!medal) return null;
  return (
    <span
      role="img"
      aria-label={`Hạng ${rank}`}
      data-medal={rank}
      className={cn(
        "inline-flex size-5 shrink-0 items-center justify-center rounded-full font-display text-xs font-bold text-on-medal italic",
        medal,
      )}
    >
      {rank}
    </span>
  );
}

// Trận gần nhất bên trái; mem chưa đủ 4 trận thì chỉ hiện số trận đã đấu.
function FormIcons({ form }: { form: Row["form"] }) {
  return (
    <span className="flex items-center justify-end gap-1">
      {form.map((f, i) => {
        const Icon = f === "win" ? Check : X;
        return (
          <span
            key={i}
            role="img"
            aria-label={f === "win" ? "Thắng" : "Thua"}
            className={cn(
              "inline-flex size-5 items-center justify-center rounded-full text-white",
              f === "win" ? "bg-green-600" : "bg-red-600",
            )}
          >
            <Icon aria-hidden="true" className="size-3" strokeWidth={3.5} />
          </span>
        );
      })}
    </span>
  );
}

export function SeasonTable({
  rows,
  season,
  showForm = false,
}: {
  rows: Row[];
  season: SeasonId;
  /** Cột Phong độ chỉ có ý nghĩa với tháng hiện tại. */
  showForm?: boolean;
}) {
  if (rows.length === 0) {
    return (
      <p className="rounded-lg border border-border p-4 text-center text-text-2">
        Chưa có trận nào có kết quả trong mùa này
      </p>
    );
  }
  return (
    <div className="overflow-x-auto rounded-lg border border-border bg-surface">
      <table className="w-full min-w-[30rem] border-collapse text-sm">
        <thead className="bg-surface-2 text-text-2 [&_th]:whitespace-nowrap">
          <tr>
            <th scope="col" className="sticky left-0 bg-surface-2 p-2 text-left font-medium">
              Mem
            </th>
            <th scope="col" className={th}>
              Thắng
            </th>
            <th scope="col" className={th}>
              Hiệu số
            </th>
            <th scope="col" className={th}>
              Cầu thắng
            </th>
            <th scope="col" className={th}>
              Cầu thua
            </th>
            <th scope="col" className={th}>
              Số trận
            </th>
            {showForm ? (
              <th scope="col" className={th}>
                Phong độ
              </th>
            ) : null}
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr
              key={r.member.id}
              data-leader={r.rank === 1 ? "" : undefined}
              className="border-t border-border tabular-nums"
            >
              <th scope="row" className="sticky left-0 bg-surface p-2 text-left font-normal">
                <span className="flex items-center gap-2">
                  <MemberAvatar member={r.member} size={24} />
                  <span className="min-w-0" title={r.member.displayName}>
                    <PlayerName
                      player={{ id: r.member.id, displayName: r.member.displayName }}
                      season={season}
                      className="block max-w-[9rem] truncate text-left"
                    />
                  </span>
                  <RankBadge rank={r.rank} />
                </span>
              </th>
              <td className="p-2 text-right font-display text-base font-semibold italic tabular-nums">
                {r.totals.wins}
              </td>
              <td className="p-2 text-right font-display text-base font-semibold italic tabular-nums">
                {formatDiff(r.diff)}
              </td>
              <td className="p-2 text-right font-display text-base font-semibold italic tabular-nums">
                {r.totals.pointsFor}
              </td>
              <td className="p-2 text-right font-display text-base font-semibold italic tabular-nums">
                {r.totals.pointsAgainst}
              </td>
              <td className="p-2 text-right font-display text-base font-semibold italic tabular-nums">
                {r.totals.played}
              </td>
              {showForm ? (
                <td className="p-2">
                  <FormIcons form={r.form} />
                </td>
              ) : null}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
