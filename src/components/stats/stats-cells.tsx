import type { Ranked } from "@/domain/standings";
import { formatDiff } from "@/ui/format";

export const th = "p-2 text-right font-medium";
export const EMPTY_STATS = "Chưa có trận nào có kết quả trong khoảng này";

export function EmptyStats() {
  return (
    <p className="rounded-lg border border-border p-4 text-center text-text-2">{EMPTY_STATS}</p>
  );
}

export function TotalsHead() {
  return (
    <>
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
    </>
  );
}

export function TotalsCells({ row }: { row: Ranked<string> }) {
  return (
    <>
      <td className="p-2 text-right">{row.totals.wins}</td>
      <td className="p-2 text-right">{formatDiff(row.diff)}</td>
      <td className="p-2 text-right">{row.totals.pointsFor}</td>
      <td className="p-2 text-right">{row.totals.pointsAgainst}</td>
      <td className="p-2 text-right">{row.totals.played}</td>
    </>
  );
}
