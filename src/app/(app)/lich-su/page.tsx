import Link from "next/link";
import { now } from "@/app/_lib/clock";
import { getDb } from "@/app/_lib/db";
import { requireActor } from "@/app/_lib/session";
import { getHistory } from "@/server/views/history";
import { formatDay, formatSeason } from "@/ui/format";

export default async function HistoryPage() {
  await requireActor();
  const groups = await getHistory(getDb(), now());

  return (
    <main className="flex flex-col gap-4 p-4">
      <h1 className="text-xl font-semibold">Lịch sử</h1>
      {groups.length === 0 ? (
        <p className="text-text-2">Chưa có buổi đấu nào</p>
      ) : (
        groups.map((g) => (
          <section key={g.season} className="flex flex-col gap-2">
            <h2 className="text-sm font-medium text-text-2">{formatSeason(g.season)}</h2>
            <ul className="flex flex-col gap-2">
              {g.days.map((d) => (
                <li key={d.day}>
                  <Link
                    href={`/lich-su/${d.day}`}
                    className="flex min-h-11 flex-col justify-center rounded-lg border border-border bg-surface p-3 text-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
                  >
                    <span className="font-medium">{formatDay(d.day)}</span>
                    <span className="text-text-2 tabular-nums">
                      {d.playerCount} người · đã nhập {d.resultCount}/{d.matchCount} trận
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        ))
      )}
    </main>
  );
}
