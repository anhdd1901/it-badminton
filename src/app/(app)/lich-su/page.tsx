import { now } from "@/app/_lib/clock";
import { getDb } from "@/app/_lib/db";
import { requireActor } from "@/app/_lib/session";
import { HistoryDays } from "@/components/history/history-days";
import { SeasonPicker } from "@/components/season-picker";
import { canEditResults } from "@/domain/match-day";
import { matchDayOfWeek, seasonOf } from "@/domain/time";
import { getHistory, getMatchDayDetail } from "@/server/views/history";
import { parseHistoryParams, type SearchParams } from "@/ui/params";

export default async function HistoryPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const actor = await requireActor();
  const at = now();
  const db = getDb();
  const current = seasonOf(matchDayOfWeek(at));
  const { season, day: openDay } = parseHistoryParams(await searchParams, current);
  const groups = await getHistory(db, at);
  const days = groups.find((g) => g.season === season)?.days ?? [];
  // A month has at most five Saturdays, so every day's matches load up front.
  const details = await Promise.all(days.map((d) => getMatchDayDetail(db, d.day, at)));
  const items = days.flatMap((d, i) => {
    const detail = details[i];
    if (!detail) return [];
    const canChangePlayers = actor.role === "admin" && canEditResults(d.day, at, actor.role);
    return [
      {
        day: d.day,
        playerCount: d.playerCount,
        matchCount: d.matchCount,
        resultCount: d.resultCount,
        scheduleKey: detail.key,
        editable: canEditResults(d.day, at, actor.role),
        roster: canChangePlayers ? detail.roster : [],
        canChangePlayers,
        matches: detail.matches,
      },
    ];
  });

  return (
    <main className="flex flex-col gap-3 p-4">
      <h1 className="font-display text-xl font-bold italic">Lịch sử</h1>
      <div className="sticky top-0 z-20 -mx-4 bg-bg px-4 py-2">
        <SeasonPicker
          value={season}
          min={groups.at(-1)?.season ?? current}
          max={current}
          hrefBase="/lich-su?mua="
        />
      </div>
      {items.length === 0 ? (
        <p className="text-text-2">Chưa có buổi đấu nào trong tháng này</p>
      ) : (
        <HistoryDays key={season} days={items} season={season} initialOpen={openDay} />
      )}
    </main>
  );
}
