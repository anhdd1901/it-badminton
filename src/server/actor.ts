import type { Role } from "@/domain/types";
import { AppError, MESSAGES } from "./errors";

export type Actor = { memberId: string; role: Role; sessionId: string };

export function requireRole(actor: Actor, ...roles: Role[]): void {
  if (!roles.includes(actor.role)) throw new AppError("FORBIDDEN", MESSAGES.forbidden);
}
