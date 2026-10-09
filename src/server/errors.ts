export type ErrorCode = "UNAUTHENTICATED" | "FORBIDDEN" | "VALIDATION" | "CONFLICT" | "LOCKED" | "NOT_FOUND";

export class AppError extends Error {
  constructor(
    readonly code: ErrorCode,
    message: string,
  ) {
    super(message);
    this.name = "AppError";
  }
}

export const HTTP_STATUS: Record<ErrorCode, number> = {
  UNAUTHENTICATED: 401,
  FORBIDDEN: 403,
  VALIDATION: 400,
  CONFLICT: 409,
  LOCKED: 423,
  NOT_FOUND: 404,
};

export const MESSAGES = {
  forbidden: "Bạn không có quyền làm việc này",
  badLogin: "Sai tên đăng nhập hoặc mật khẩu",
  loginLocked: "Đăng nhập tạm khóa 15 phút do nhập sai quá nhiều lần",
  matchDayLocked: "Buổi đấu đã khóa, không thể thay đổi điểm danh",
  inactiveMember: "Mem đã ngưng hoạt động",
  noSchedule: "Buổi đấu chưa có lịch thi đấu",
  matchNotFound: "Không tìm thấy trận đấu",
  memberNotFound: "Không tìm thấy mem",
  usernameTaken: "Tên đăng nhập đã có người dùng",
  wrongPassword: "Mật khẩu không đúng",
} as const;

/** Score of pair A first. */
export function resultConflict(scoreA: number, scoreB: number): string {
  return `Trận này vừa được nhập ${scoreA}–${scoreB}, hãy tải lại`;
}
