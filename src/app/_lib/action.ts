import "server-only";
import { revalidatePath } from "next/cache";
import { unstable_rethrow } from "next/navigation";
import type { Actor } from "@/server/actor";
import type { Db } from "@/server/db/client";
import { AppError, safeErrorSummary } from "@/server/errors";
import { UNEXPECTED_MESSAGE, type ActionResult } from "@/ui/action-result";
import { now } from "./clock";
import { getDb } from "./db";
import { getActor } from "./session";

export function toActionResult(e: unknown): ActionResult<never> {
  if (e instanceof AppError) return { ok: false, code: e.code, message: e.message };
  console.error(safeErrorSummary(e));
  return { ok: false, code: "UNEXPECTED", message: UNEXPECTED_MESSAGE };
}

export async function runAction<T>(
  fn: (ctx: { db: Db; actor: Actor; now: Date }) => Promise<T>,
): Promise<ActionResult<T>> {
  try {
    const actor = await getActor();
    if (!actor) {
      return {
        ok: false,
        code: "UNAUTHENTICATED",
        message: "Phiên đăng nhập đã hết, hãy đăng nhập lại",
      };
    }
    const data = await fn({ db: getDb(), actor, now: now() });
    revalidatePath("/", "layout");
    return { ok: true, data };
  } catch (e) {
    // A successful action may end with redirect(): still refresh cached data first.
    const digest = (e as { digest?: unknown } | null)?.digest;
    if (typeof digest === "string" && digest.startsWith("NEXT_REDIRECT")) {
      revalidatePath("/", "layout");
    }
    unstable_rethrow(e);
    return toActionResult(e);
  }
}
