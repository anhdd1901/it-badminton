import type { LocalDate, SeasonId } from "@/domain/types";

const oneDecimal = new Intl.NumberFormat("vi-VN", {
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
});

const WEEKDAYS = ["Chủ nhật", "Thứ 2", "Thứ 3", "Thứ 4", "Thứ 5", "Thứ 6", "Thứ 7"];

/** ELO lưu theo phần mười: 10168 → "1.016,8". */
export function formatElo(tenths: number): string {
  return oneDecimal.format(tenths / 10);
}

export function formatEloDelta(tenths: number | null): string {
  if (tenths === null) return "–";
  if (tenths === 0) return oneDecimal.format(0);
  const text = oneDecimal.format(Math.abs(tenths) / 10);
  return `${tenths > 0 ? "▲" : "▼"} ${text}`;
}

/** "2026-10-17" → "Thứ 7, 17/10/2026"; thứ tính từ chuỗi ngày, không qua múi giờ máy. */
export function formatDay(day: LocalDate): string {
  const [y, m, d] = day.split("-").map(Number);
  const weekday = WEEKDAYS[new Date(Date.UTC(y, m - 1, d)).getUTCDay()];
  return `${weekday}, ${String(d).padStart(2, "0")}/${String(m).padStart(2, "0")}/${y}`;
}

export function formatSeason(season: SeasonId): string {
  const [y, m] = season.split("-").map(Number);
  return `Tháng ${m}/${y}`;
}

export function formatDiff(n: number): string {
  return n > 0 ? `+${n}` : String(n);
}
