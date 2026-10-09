import type { Winner } from "./types";

export type ScoreCheck = { ok: true; winner: Winner } | { ok: false; reason: string };

/** Validates one badminton game score (21 points, win by 2, capped at 30). */
export function checkScore(scoreA: number, scoreB: number): ScoreCheck {
  if (!Number.isInteger(scoreA) || !Number.isInteger(scoreB) || scoreA < 0 || scoreB < 0) {
    return reject("Tỷ số phải là số nguyên từ 0 trở lên");
  }

  const winner: Winner = scoreA > scoreB ? "A" : "B";
  const high = Math.max(scoreA, scoreB);
  const low = Math.min(scoreA, scoreB);
  const label = `Tỷ số ${high}–${low} không hợp lệ`;

  if (high === low) return reject("Không có tỷ số hòa");
  if (high < 21) return reject(`${label}: bên thắng phải đạt ít nhất 21 điểm`);
  if (high === 21 && low === 20) {
    return reject("Tỷ số 21–20 không hợp lệ: chưa cách 2 điểm, phải đánh tiếp");
  }
  if (high >= 22 && high <= 29 && high - low !== 2) {
    return reject(`${label}: từ 22 điểm trở lên phải thắng cách đúng 2`);
  }
  if (high === 30 && low < 28) {
    return reject(`${label}: 30 điểm chỉ khi thắng 30–28 hoặc 30–29`);
  }
  if (high > 30) return reject(`${label}: tối đa 30 điểm`);

  return { ok: true, winner };
}

function reject(reason: string): ScoreCheck {
  return { ok: false, reason };
}
