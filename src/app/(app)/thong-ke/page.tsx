import { now } from "@/app/_lib/clock";
import { getDb } from "@/app/_lib/db";
import { requireActor } from "@/app/_lib/session";
import { PillTabs } from "@/components/pill-tabs";
import { MemberStatsTable } from "@/components/stats/member-stats-table";
import { PairStatsTable } from "@/components/stats/pair-stats-table";
import { StatsFilter } from "@/components/stats/stats-filter";
import { getStatsView } from "@/server/views/rankings";
import { parseStatsParams, type SearchParams } from "@/ui/params";

export default async function StatsPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  await requireActor();
  const at = now();
  const params = parseStatsParams(await searchParams);
  const db = getDb();
  const filter = { fromSeason: params.from, toSeason: params.to, memberId: params.memberId };
  const hasFilter = filter.fromSeason || filter.toSeason || filter.memberId;
  // The member list must not depend on the filter, so the select keeps every option.
  const all = await getStatsView(db, {}, at);
  const view = hasFilter ? await getStatsView(db, filter, at) : all;
  const options = all.members.map((r) => r.member);

  return (
    <main className="flex flex-col gap-4 p-4">
      <h1 className="text-xl font-semibold">Thống kê</h1>
      <PillTabs
        aria-label="Kiểu thống kê"
        items={[
          { href: "/thong-ke", label: "Theo mem", active: params.view === "mem" },
          { href: "/thong-ke?xem=cap", label: "Theo cặp", active: params.view === "cap" },
        ]}
      />
      <StatsFilter value={params} members={options} />
      {params.view === "cap" ? (
        <PairStatsTable rows={view.pairs} />
      ) : (
        <MemberStatsTable rows={view.members} />
      )}
    </main>
  );
}
