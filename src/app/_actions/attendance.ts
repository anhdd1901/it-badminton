"use server";
import { runAction } from "@/app/_lib/action";
import type { ActionResult } from "@/ui/action-result";
import { setAttendance } from "@/server/match-days/attendance";
import { getRoster } from "@/server/views/members";
import type { MemberRef } from "@/server/views/rankings";

export async function setAttendanceAction(
  memberId: string,
  attending: boolean,
): Promise<ActionResult> {
  return runAction(async ({ db, actor, now }) => {
    await setAttendance(db, actor, { memberId, attending }, now);
  });
}

export async function getRosterAction(): Promise<
  ActionResult<{ member: MemberRef; attending: boolean }[]>
> {
  return runAction(({ db, actor, now }) => getRoster(db, actor, now));
}
