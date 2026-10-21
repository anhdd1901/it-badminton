"use server";
import { runAction } from "@/app/_lib/action";
import type { ActionResult } from "@/ui/action-result";
import { getMemberProfileView, type MemberProfileView } from "@/server/views/member-profile";

export async function getMemberProfileAction(
  memberId: string,
  season: string,
): Promise<ActionResult<MemberProfileView>> {
  return runAction(({ db, now }) => getMemberProfileView(db, memberId, season, now), {
    revalidate: false,
  });
}
