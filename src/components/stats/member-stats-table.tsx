import { MemberAvatar } from "@/components/member-avatar";
import { PlayerName } from "@/components/player-name";
import type { SeasonId } from "@/domain/types";
import type { getStatsView } from "@/server/views/rankings";
import { EmptyStats, th, TotalsCells, TotalsHead } from "./stats-cells";

type Row = Awaited<ReturnType<typeof getStatsView>>["members"][number];

export function MemberStatsTable({ rows, season }: { rows: Row[]; season: SeasonId }) {
  if (rows.length === 0) return <EmptyStats />;
  return (
    <div className="overflow-x-auto rounded-lg border border-border bg-surface">
      <table className="w-full min-w-[44rem] border-collapse text-sm">
        <thead className="bg-surface-2 text-text-2">
          <tr>
            <th scope="col" className="sticky left-0 bg-surface-2 p-2 text-left font-medium">
              Mem
            </th>
            <TotalsHead />
            <th scope="col" className={th}>
              #1
            </th>
            <th scope="col" className={th}>
              #2
            </th>
            <th scope="col" className={th}>
              #3
            </th>
            <th scope="col" className={th}>
              #4
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.member.id} className="border-t border-border tabular-nums">
              <th scope="row" className="sticky left-0 bg-surface p-2 text-left font-normal">
                <span className="flex items-center gap-2">
                  <MemberAvatar member={r.member} size={32} />
                  <span className="min-w-0" title={r.member.displayName}>
                    <PlayerName
                      player={{ id: r.member.id, displayName: r.member.displayName }}
                      season={season}
                      className="block max-w-[9rem] truncate text-left"
                    />
                  </span>
                </span>
              </th>
              <TotalsCells row={r} />
              <td className="p-2 text-right font-display text-base font-semibold italic tabular-nums">
                {r.podium.first}
              </td>
              <td className="p-2 text-right font-display text-base font-semibold italic tabular-nums">
                {r.podium.second}
              </td>
              <td className="p-2 text-right font-display text-base font-semibold italic tabular-nums">
                {r.podium.third}
              </td>
              <td className="p-2 text-right font-display text-base font-semibold italic tabular-nums">
                {r.podium.fourth}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
