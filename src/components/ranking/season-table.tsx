import type { getSeasonView } from "@/server/views/rankings";
import { MemberAvatar } from "@/components/member-avatar";

type Row = Awaited<ReturnType<typeof getSeasonView>>["rows"][number];

const th = "p-2 text-right font-medium";

function diffText(n: number): string {
  return n > 0 ? `+${n}` : String(n);
}

export function SeasonTable({ rows }: { rows: Row[] }) {
  if (rows.length === 0) {
    return (
      <p className="rounded-lg border border-border p-4 text-center text-text-2">
        Chưa có trận nào có kết quả trong mùa này
      </p>
    );
  }
  return (
    <div className="overflow-x-auto rounded-lg border border-border">
      <table className="w-full min-w-[30rem] border-collapse text-sm">
        <thead className="bg-surface-2 text-text-2">
          <tr>
            <th scope="col" className="p-2 text-left font-medium">
              Hạng
            </th>
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
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.member.id} className="border-t border-border tabular-nums">
              <td className="p-2">{r.rank}</td>
              <th scope="row" className="sticky left-0 bg-surface p-2 text-left font-normal">
                <span className="flex items-center gap-2">
                  <MemberAvatar member={r.member} size={24} />
                  <span className="whitespace-nowrap">{r.member.displayName}</span>
                </span>
              </th>
              <td className="p-2 text-right">{r.totals.wins}</td>
              <td className="p-2 text-right">{diffText(r.diff)}</td>
              <td className="p-2 text-right">{r.totals.pointsFor}</td>
              <td className="p-2 text-right">{r.totals.pointsAgainst}</td>
              <td className="p-2 text-right">{r.totals.played}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
