import { notFound, redirect } from "next/navigation";
import { now } from "@/app/_lib/clock";
import { getDb } from "@/app/_lib/db";
import { requireActor } from "@/app/_lib/session";
import { seasonOf } from "@/domain/time";
import { AppError } from "@/server/errors";
import { getMatchDayDetail } from "@/server/views/history";

// Old per-day link: opens the history month with that day expanded.
export default async function MatchDayDetailPage({ params }: PageProps<"/lich-su/[ngay]">) {
  await requireActor();
  const { ngay } = await params;
  let detail;
  try {
    detail = await getMatchDayDetail(getDb(), ngay, now());
  } catch (e) {
    if (e instanceof AppError && e.code === "VALIDATION") notFound();
    throw e;
  }
  if (!detail) notFound();
  redirect(`/lich-su?mua=${seasonOf(detail.day)}&ngay=${detail.day}`);
}
