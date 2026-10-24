import type { getEloView } from "@/server/views/rankings";
import { MemberAvatar } from "@/components/member-avatar";
import { PlayerName } from "@/components/player-name";
import type { SeasonId } from "@/domain/types";
import { cn } from "@/lib/utils";
import { formatElo, formatEloDelta } from "@/ui/format";

type Row = Awaited<ReturnType<typeof getEloView>>["rows"][number];

export function EloTable({ rows, season }: { rows: Row[]; season: SeasonId }) {
  return (
    <div className="flex flex-col gap-2">
      <div className="overflow-x-auto rounded-lg border border-border bg-surface">
        <table className="w-full min-w-[22rem] border-collapse text-sm">
          <thead className="bg-surface-2 text-left text-text-2">
            <tr>
              <th scope="col" className="sticky left-0 bg-surface-2 p-2 font-medium">
                Mem
              </th>
              <th scope="col" className="p-2 text-right font-medium">
                ELO
              </th>
              <th scope="col" className="p-2 text-right font-medium">
                Thay đổi
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => {
              const d = r.lastMatchDayDelta;
              // Dark theme: --border equals --surface-2, so the divider there uses --bg.
              const top = r.seed === 1;
              return (
                <tr
                  key={r.member.id}
                  data-seed={r.seed}
                  className={cn(
                    "border-t border-[light-dark(var(--border),var(--bg))]",
                    top && "bg-surface-2",
                  )}
                >
                  <th
                    scope="row"
                    className={cn(
                      "sticky left-0 p-2 text-left font-normal",
                      top ? "bg-surface-2" : "bg-surface",
                    )}
                  >
                    <span className="flex items-center gap-2">
                      <MemberAvatar member={r.member} size={24} />
                      <span className="min-w-0" title={r.member.displayName}>
                        <PlayerName
                          player={{ id: r.member.id, displayName: r.member.displayName }}
                          season={season}
                          className="block max-w-[9rem] truncate text-left"
                        />
                      </span>
                      {top ? <span className="sr-only">Hạt giống 1</span> : null}
                    </span>
                  </th>
                  <td className="p-2 text-right font-display text-base font-semibold italic tabular-nums">
                    {formatElo(r.eloTenths)}
                  </td>
                  <td className="p-2 text-right tabular-nums">
                    <span
                      className={cn(
                        d !== null && d > 0 && "text-accent-text",
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
      <p className="text-xs text-text-2">Dòng nền đậm: Hạt giống 1 (top 4 ELO)</p>
    </div>
  );
}
