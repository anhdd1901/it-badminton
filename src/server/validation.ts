import { z } from "zod";
import type { LocalDate, SeasonId } from "@/domain/types";
import { AppError, MESSAGES } from "./errors";

function parse<T>(schema: z.ZodType<T>, raw: unknown, message: string): T {
  const r = schema.safeParse(raw);
  if (!r.success) throw new AppError("VALIDATION", message);
  return r.data;
}

const USERNAME_MESSAGE =
  "Tên đăng nhập gồm 3–30 ký tự: chữ thường không dấu, số, dấu chấm hoặc gạch dưới";
const DISPLAY_NAME_MESSAGE = "Tên hiển thị dài 1–50 ký tự";
const PASSWORD_MESSAGE = "Mật khẩu tối thiểu 8 ký tự";
const ELO_MESSAGE = "ELO phải là số lớn hơn 0 và không quá 5000, tối đa 1 chữ số thập phân";
const DATE_MESSAGE = "Ngày thi đấu không hợp lệ";
const SEASON_MESSAGE = "Tháng không hợp lệ";

const usernameSchema = z
  .string()
  .transform((s) => s.trim().toLowerCase())
  .pipe(z.string().regex(/^[a-z0-9._]{3,30}$/));
const displayNameSchema = z
  .string()
  .transform((s) => s.trim())
  .pipe(z.string().min(1).max(50));
const passwordSchema = z.string().min(8);
const eloSchema = z
  .union([z.string(), z.number()])
  .transform((v) => String(v).trim().replace(",", "."))
  .pipe(z.string().regex(/^\d{1,4}(\.\d)?$/))
  .transform((s) => Math.round(Number(s) * 10))
  .pipe(z.number().int().gt(0).max(50000));
const dateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
const memberIdSchema = z.uuid();
const seasonSchema = z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/);

export const parseUsername = (raw: string): string => parse(usernameSchema, raw, USERNAME_MESSAGE);
export const parseDisplayName = (raw: string): string =>
  parse(displayNameSchema, raw, DISPLAY_NAME_MESSAGE);
export const parsePassword = (raw: string): string => parse(passwordSchema, raw, PASSWORD_MESSAGE);

/** "1012,5" / "1012.5" / number to integer tenths. */
export const parseEloInput = (raw: string | number): number => parse(eloSchema, raw, ELO_MESSAGE);

export function parseLocalDate(raw: string): LocalDate {
  const s = parse(dateSchema, raw, DATE_MESSAGE);
  const [y, m, d] = s.split("-").map(Number);
  const date = new Date(Date.UTC(y, m - 1, d));
  const real =
    date.getUTCFullYear() === y && date.getUTCMonth() === m - 1 && date.getUTCDate() === d;
  if (!real || date.getUTCDay() !== 6) throw new AppError("VALIDATION", DATE_MESSAGE);
  return s;
}

export const parseSeasonId = (raw: string): SeasonId => parse(seasonSchema, raw, SEASON_MESSAGE);

/** A malformed id can never name a member: NOT_FOUND, like an unknown one. */
export function parseMemberId(raw: string): string {
  const r = memberIdSchema.safeParse(raw);
  if (!r.success) throw new AppError("NOT_FOUND", MESSAGES.memberNotFound);
  return r.data;
}
