import { now } from "@/app/_lib/clock";
import { getDb } from "@/app/_lib/db";
import { requireActor } from "@/app/_lib/session";
import { PillTabs } from "@/components/pill-tabs";
import { EloTable } from "@/components/ranking/elo-table";
import { SeasonTable } from "@/components/ranking/season-table";
import { SeasonPicker } from "@/components/season-picker";
import { matchDayOfWeek, seasonOf } from "@/domain/time";
import { getEloView, getSeasonView } from "@/server/views/rankings";
import { parseRankingParams, type SearchParams } from "@/ui/params";

export default async function RankingPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  await requireActor();
  const at = now();
  const current = seasonOf(matchDayOfWeek(at));
  const { board, season } = parseRankingParams(await searchParams, current);
  const db = getDb();

  return (
    <main className="flex flex-col gap-4 p-4">
      <h1 className="text-xl font-semibold">Xếp hạng</h1>
      <PillTabs
        aria-label="Bảng xếp hạng"
        items={[
          { href: "/xep-hang", label: "Mùa", active: board === "mua" },
          { href: "/xep-hang?bang=elo", label: "ELO", active: board === "elo" },
        ]}
      />
      {board === "elo" ? (
        <EloTable rows={(await getEloView(db, at)).rows} />
      ) : (
        <SeasonSection season={season} current={current} at={at} />
      )}
    </main>
  );
}

async function SeasonSection({
  season,
  current,
  at,
}: {
  season: string;
  current: string;
  at: Date;
}) {
  const view = await getSeasonView(getDb(), season, at);
  return (
    <>
      <SeasonPicker value={view.season} max={current} hrefFor={(s) => `/xep-hang?mua=${s}`} />
      <p className="text-sm text-text-2">{view.ended ? "Đã kết thúc" : "Đang diễn ra"}</p>
      <SeasonTable rows={view.rows} />
    </>
  );
}
