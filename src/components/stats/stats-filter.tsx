import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { MemberRef } from "@/server/views/rankings";

export type StatsFilterValue = {
  view: "mem" | "cap";
  from?: string;
  to?: string;
  memberId?: string;
};

export function StatsFilter({ value, members }: { value: StatsFilterValue; members: MemberRef[] }) {
  return (
    <form
      method="get"
      action="/thong-ke"
      className="grid grid-cols-1 gap-3 rounded-lg border border-border p-3 sm:grid-cols-3"
    >
      <input type="hidden" name="xem" value={value.view} />
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="stats-tu">Từ tháng</Label>
        <Input id="stats-tu" type="month" name="tu" defaultValue={value.from ?? ""} />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="stats-den">Đến tháng</Label>
        <Input id="stats-den" type="month" name="den" defaultValue={value.to ?? ""} />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="stats-mem">Mem</Label>
        <select
          id="stats-mem"
          name="mem"
          defaultValue={value.memberId ?? ""}
          className="h-11 w-full rounded-md border border-input bg-transparent px-2.5 text-base outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 md:text-sm"
        >
          <option value="">Tất cả mem</option>
          {members.map((m) => (
            <option key={m.id} value={m.id}>
              {m.active ? m.displayName : `${m.displayName} (đã ngưng)`}
            </option>
          ))}
        </select>
      </div>
      <div className="flex items-center gap-2 sm:col-span-3">
        <Button type="submit">Lọc</Button>
        <Link
          href={`/thong-ke?xem=${value.view}`}
          className="inline-flex min-h-11 items-center rounded-md px-3 text-sm text-text-2 underline"
        >
          Bỏ lọc
        </Link>
      </div>
    </form>
  );
}
