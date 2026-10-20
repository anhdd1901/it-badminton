import { MemberAvatar } from "@/components/member-avatar";
import type { getStatsView } from "@/server/views/rankings";
import { EmptyStats, TotalsCells, TotalsHead } from "./stats-cells";

type Row = Awaited<ReturnType<typeof getStatsView>>["pairs"][number];

export function PairStatsTable({ rows }: { rows: Row[] }) {
  if (rows.length === 0) return <EmptyStats />;
  return (
    <div className="overflow-x-auto rounded-lg border border-border">
      <table className="w-full min-w-[34rem] border-collapse text-sm">
        <thead className="bg-surface-2 text-text-2">
          <tr>
            <th scope="col" className="sticky left-0 bg-surface-2 p-2 text-left font-medium">
              Cặp
            </th>
            <TotalsHead />
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.key} className="border-t border-border tabular-nums">
              <th scope="row" className="sticky left-0 bg-surface p-2 text-left font-normal">
                <span className="flex items-center gap-2">
                  <span className="flex -space-x-1.5">
                    <MemberAvatar member={r.members[0]} size={24} />
                    <MemberAvatar member={r.members[1]} size={24} />
                  </span>
                  <span className="whitespace-nowrap">
                    {r.members[0].displayName} &amp; {r.members[1].displayName}
                  </span>
                </span>
              </th>
              <TotalsCells row={r} />
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
