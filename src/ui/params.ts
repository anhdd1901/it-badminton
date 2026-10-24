import type { SeasonId } from "@/domain/types";

export type SearchParams = Record<string, string | string[] | undefined>;

const SEASON_RE = /^\d{4}-(0[1-9]|1[0-2])$/;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function single(v: string | string[] | undefined): string | undefined {
  return typeof v === "string" ? v : undefined;
}

function season(v: string | string[] | undefined): SeasonId | undefined {
  const s = single(v);
  return s !== undefined && SEASON_RE.test(s) ? s : undefined;
}

function clamp(s: SeasonId | undefined, max: SeasonId): SeasonId {
  return s === undefined || s > max ? max : s;
}

export function parseRankingParams(
  sp: SearchParams,
  currentSeason: SeasonId,
): { board: "mua" | "elo"; season: SeasonId } {
  return {
    board: single(sp.bang) === "elo" ? "elo" : "mua",
    season: clamp(season(sp.mua), currentSeason),
  };
}

const DAY_RE = /^\d{4}-\d{2}-\d{2}$/;

export function parseHistoryParams(
  sp: SearchParams,
  currentSeason: SeasonId,
): { season: SeasonId; day?: string } {
  const day = single(sp.ngay);
  return {
    season: clamp(season(sp.mua), currentSeason),
    ...(day !== undefined && DAY_RE.test(day) ? { day } : {}),
  };
}

export function parseStatsParams(sp: SearchParams): {
  view: "mem" | "cap";
  from?: SeasonId;
  to?: SeasonId;
  memberId?: string;
} {
  const out: { view: "mem" | "cap"; from?: SeasonId; to?: SeasonId; memberId?: string } = {
    view: single(sp.xem) === "cap" ? "cap" : "mem",
  };
  let from = season(sp.tu);
  let to = season(sp.den);
  if (from && to && from > to) [from, to] = [to, from];
  if (from) out.from = from;
  if (to) out.to = to;
  const mem = single(sp.mem);
  if (mem !== undefined && UUID_RE.test(mem)) out.memberId = mem;
  return out;
}
