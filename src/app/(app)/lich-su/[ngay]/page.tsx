import { notFound } from "next/navigation";
import { now } from "@/app/_lib/clock";
import { getDb } from "@/app/_lib/db";
import { requireActor } from "@/app/_lib/session";
import { MatchCard } from "@/components/match/match-card";
import { MemberAvatar } from "@/components/member-avatar";
import { canEditResults } from "@/domain/match-day";
import { AppError } from "@/server/errors";
import { getMatchDayDetail } from "@/server/views/history";
import { formatDay } from "@/ui/format";

export default async function MatchDayDetailPage({ params }: PageProps<"/lich-su/[ngay]">) {
  const actor = await requireActor();
  const { ngay } = await params;
  const at = now();
  let detail;
  try {
    detail = await getMatchDayDetail(getDb(), ngay, at);
  } catch (e) {
    if (e instanceof AppError && e.code === "VALIDATION") notFound();
    throw e;
  }
  if (!detail) notFound();
  const editable = canEditResults(detail.day, at, actor.role);

  return (
    <main className="flex flex-col gap-4 p-4">
      <h1 className="text-xl font-semibold">{formatDay(detail.day)}</h1>
      <ul className="flex flex-wrap gap-2" aria-label="Người tham gia">
        {detail.participants.map((p) => (
          <li
            key={p.id}
            className="flex max-w-full min-w-0 items-center gap-1 rounded-full border border-border bg-surface py-1 pr-3 pl-1 text-sm"
          >
            <MemberAvatar member={p} size={24} />
            <span className="truncate">{p.displayName}</span>
          </li>
        ))}
      </ul>
      <section className="flex flex-col gap-2">
        {detail.matches.map((m) => (
          <MatchCard
            key={m.number}
            match={m}
            editable={editable}
            day={detail.day}
            scheduleKey={detail.key}
          />
        ))}
      </section>
    </main>
  );
}
