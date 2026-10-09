import type { Winner } from "./types";

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
