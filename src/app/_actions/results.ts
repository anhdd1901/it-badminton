"use server";
import { runAction } from "@/app/_lib/action";
import {
  deleteAllResults,
  deleteResult,
  enterResult,
  updateResult,
} from "@/server/match-days/results";
import type { ActionResult } from "@/ui/action-result";

type MatchRef = { day: string; scheduleKey: string; matchNumber: number };

export async function saveResultAction(
  input: MatchRef & { scoreA: number; scoreB: number; expectedVersion: number | null },
): Promise<ActionResult> {
  return runAction(async ({ db, actor, now }) => {
    const { expectedVersion, ...rest } = input;
    if (expectedVersion === null) await enterResult(db, actor, rest, now);
    else await updateResult(db, actor, { ...rest, expectedVersion }, now);
  });
}

export async function deleteResultAction(input: MatchRef): Promise<ActionResult> {
  return runAction(async ({ db, actor, now }) => {
    await deleteResult(db, actor, input, now);
  });
}

export async function deleteAllResultsAction(input: {
  day: string;
  scheduleKey: string;
}): Promise<ActionResult> {
  return runAction(async ({ db, actor, now }) => {
    await deleteAllResults(db, actor, input, now);
  });
}
