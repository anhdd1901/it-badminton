import type { ResultMatch } from "./standings";
import { checkInClosesAt } from "./time";
import type { LocalDate, MemberId, Winner } from "./types";

/** Ratings or deltas for the four players, in integer tenths of an ELO point. */
export type FourRatings = { a1: number; a2: number; b1: number; b2: number };

const K = 32;

function expected(x: number, y: number): number {
  return 1 / (1 + 10 ** ((y - x) / 400));
}

/** Magnitudes (tenths) for one team's two players; they sum to totalT. */
function teamShares(
  r1: number,
  r2: number,
  opponentAvg: number,
  won: boolean,
  total: number,
  totalT: number,
): [number, number] {
  const m = Math.min(Math.abs(r1 - r2) / 2000, 1);
  const weight = (r: number) => (won ? 1 - expected(r, opponentAvg) : expected(r, opponentAvg));
  const w1 = weight(r1);
  const w2 = weight(r2);
  const share = (w: number) => total * ((1 - m) * 0.5 + m * (w / (w1 + w2)));
  if (share(w1) >= share(w2)) {
    const first = Math.round(share(w1) * 10);
    return [first, totalT - first];
  }
  const second = Math.round(share(w2) * 10);
  return [totalT - second, second];
}

/** ELO deltas in tenths for one doubles match; the four deltas sum to 0. */
export function eloMatchDeltas(r: FourRatings, winner: Winner): FourRatings {
  const a1 = r.a1 / 10;
  const a2 = r.a2 / 10;
  const b1 = r.b1 / 10;
  const b2 = r.b2 / 10;
  const aWins = winner === "A";
  const avgA = (a1 + a2) / 2;
  const avgB = (b1 + b2) / 2;
  const [tWin, tLoss] = aWins ? [avgA, avgB] : [avgB, avgA];
  const total = 2 * K * (1 - expected(tWin, tLoss));
  const totalT = Math.round(total * 10);
  const [x1, x2] = teamShares(a1, a2, avgB, aWins, total, totalT);
  const [y1, y2] = teamShares(b1, b2, avgA, !aWins, total, totalT);
  const s = aWins ? 1 : -1;
  return { a1: s * x1, a2: s * x2, b1: -s * y1, b2: -s * y2 };
}

export type EloAdjustment = { memberId: MemberId; eloTenths: number; at: Date };
export type EloInput = {
  initial: ReadonlyMap<MemberId, number>;
  matches: readonly ResultMatch[];
  adjustments: readonly EloAdjustment[];
};
export type EloState = {
  current: Map<MemberId, number>;
  /** Sum of match deltas on the latest match day each member played. */
  lastMatchDayDelta: Map<MemberId, number>;
};

type Event =
  | { kind: "adjustment"; time: number; adjustment: EloAdjustment }
  | { kind: "match"; time: number; match: ResultMatch };

/** Replays matches and admin adjustments in time order to get current ELO. */
export function replayElo(input: EloInput): EloState {
  const events: Event[] = [
    ...input.adjustments.map((adjustment): Event => ({ kind: "adjustment", time: adjustment.at.getTime(), adjustment })),
    ...input.matches.map((match): Event => ({ kind: "match", time: checkInClosesAt(match.matchDay).getTime(), match })),
  ];
  events.sort((x, y) => {
    if (x.time !== y.time) return x.time - y.time;
    if (x.kind !== y.kind) return x.kind === "adjustment" ? -1 : 1;
    if (x.kind === "match" && y.kind === "match") return x.match.number - y.match.number;
    return 0; // Array.prototype.sort is stable: adjustments keep input order
  });

  const current = new Map(input.initial);
  const latestDay = new Map<MemberId, LocalDate>();
  const lastMatchDayDelta = new Map<MemberId, number>();
  const ratingOf = (id: MemberId): number => {
    const r = current.get(id);
    if (r === undefined) throw new Error(`Thiếu ELO ban đầu của mem ${id}`);
    return r;
  };

  for (const e of events) {
    if (e.kind === "adjustment") {
      current.set(e.adjustment.memberId, e.adjustment.eloTenths);
      continue;
    }
    const { match } = e;
    const [a1, a2] = match.teamA;
    const [b1, b2] = match.teamB;
    const deltas = eloMatchDeltas(
      { a1: ratingOf(a1), a2: ratingOf(a2), b1: ratingOf(b1), b2: ratingOf(b2) },
      match.scoreA > match.scoreB ? "A" : "B",
    );
    const changes: [MemberId, number][] = [
      [a1, deltas.a1],
      [a2, deltas.a2],
      [b1, deltas.b1],
      [b2, deltas.b2],
    ];
    for (const [id, delta] of changes) {
      current.set(id, ratingOf(id) + delta);
      const sameDay = latestDay.get(id) === match.matchDay;
      lastMatchDayDelta.set(id, (sameDay ? (lastMatchDayDelta.get(id) ?? 0) : 0) + delta);
      latestDay.set(id, match.matchDay);
    }
  }
  return { current, lastMatchDayDelta };
}
