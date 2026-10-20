import type { ErrorCode } from "@/server/errors";

export type ActionResult<T = void> =
  { ok: true; data: T } | { ok: false; code: ErrorCode | "UNEXPECTED"; message: string };

export const UNEXPECTED_MESSAGE = "Có lỗi không mong muốn, hãy thử lại";
