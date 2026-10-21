import type { getEloView } from "@/server/views/rankings";
import { MemberAvatar } from "@/components/member-avatar";
import { PlayerName } from "@/components/player-name";
import type { SeasonId } from "@/domain/types";
import { cn } from "@/lib/utils";
import { formatElo, formatEloDelta } from "@/ui/format";

type Row = Awaited<ReturnType<typeof getEloView>>["rows"][number];

export function EloTable({ rows, season }: { rows: Row[]; season: SeasonId }) {
  return (
    <div className="overflow-x-auto rounded-lg border border-border">
      <table className="w-full min-w-[22rem] border-collapse text-sm">
        <thead className="bg-surface-2 text-left text-text-2">
          <tr>
            <th scope="col" className="sticky left-0 bg-surface-2 p-2 font-medium">
              Mem
            </th>
            <th scope="col" className="p-2 text-right font-medium">
              ELO
            </th>
            <th scope="col" className="p-2 font-medium">
              Hạt giống
            </th>
            <th scope="col" className="p-2 text-right font-medium">
              Thay đổi
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => {
            const d = r.lastMatchDayDelta;
            return (
              <tr key={r.member.id} className="border-t border-border">
                <th scope="row" className="sticky left-0 bg-surface p-2 text-left font-normal">
                  <span className="flex items-center gap-2">
                    <MemberAvatar member={r.member} size={24} />
                    <span className="min-w-0" title={r.member.displayName}>
                      <PlayerName
                        player={r.member}
                        season={season}
                        className="block max-w-[9rem] truncate text-left"
                      />
                    </span>
                  </span>
                </th>
                <td className="p-2 text-right tabular-nums">{formatElo(r.eloTenths)}</td>
                <td className="p-2">
                  <span
                    role="img"
                    aria-label={`Hạt giống ${r.seed}`}
                    className="inline-flex items-center gap-1"
                  >
                    <span
                      aria-hidden="true"
                      className={cn(
                        "size-2 rounded-full",
                        r.seed === 1 ? "bg-seed-1" : "bg-seed-2",
                      )}
                    />
                    {r.seed}
                  </span>
                </td>
                <td className="p-2 text-right tabular-nums">
                  <span
                    className={cn(
                      d !== null && d > 0 && "text-seed-2",
                      d !== null && d < 0 && "text-danger",
                    )}
                  >
                    {formatEloDelta(d)}
                  </span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
