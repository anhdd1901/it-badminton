"use server";
import { redirect } from "next/navigation";
import { runAction } from "@/app/_lib/action";
import { getAvatarStore } from "@/app/_lib/avatar-store";
import { AppError, MESSAGES } from "@/server/errors";
import { adjustElo, setActive, setSubadmin, transferAdmin } from "@/server/members/admin";
import { MAX_AVATAR_BYTES } from "@/server/members/avatar";
import { changeUsername, createMember, resetPassword } from "@/server/members/profile";
import type { ActionResult } from "@/ui/action-result";

const text = (form: FormData, key: string): string => {
  const v = form.get(key);
  return typeof v === "string" ? v : "";
};

/** The optional file is external input: only its size (checked before reading) and bytes count. */
export async function createMemberAction(form: FormData): Promise<ActionResult<{ id: string }>> {
  return runAction(async ({ db, actor, now }) => {
    const file = form.get("file");
    let avatar: Uint8Array | undefined;
    if (file instanceof File && file.size > 0) {
      if (file.size > MAX_AVATAR_BYTES) throw new AppError("VALIDATION", MESSAGES.avatarTooLarge);
      avatar = new Uint8Array(await file.arrayBuffer());
    }
    return createMember(
      db,
      actor,
      {
        displayName: text(form, "displayName"),
        username: text(form, "username"),
        password: text(form, "password"),
        initialElo: text(form, "initialElo"),
        avatar,
      },
      now,
      avatar ? getAvatarStore() : undefined,
    );
  });
}

export async function changeUsernameAction(
  memberId: string,
  username: string,
): Promise<ActionResult> {
  return runAction(async ({ db, actor }) => {
    await changeUsername(db, actor, String(memberId), String(username));
  });
}

export async function resetPasswordAction(
  memberId: string,
  password: string,
): Promise<ActionResult> {
  return runAction(async ({ db, actor }) => {
    await resetPassword(db, actor, String(memberId), String(password));
  });
}

export async function setActiveAction(memberId: string, active: boolean): Promise<ActionResult> {
  return runAction(async ({ db, actor, now }) => {
    await setActive(db, actor, String(memberId), active === true, now);
  });
}

export async function setSubadminAction(
  memberId: string,
  isSubadmin: boolean,
): Promise<ActionResult> {
  return runAction(async ({ db, actor }) => {
    await setSubadmin(db, actor, String(memberId), isSubadmin === true);
  });
}

export async function adjustEloAction(memberId: string, elo: string): Promise<ActionResult> {
  return runAction(async ({ db, actor, now }) => {
    await adjustElo(db, actor, { memberId: String(memberId), elo: String(elo) }, now);
  });
}

export async function transferAdminAction(
  memberId: string,
  password: string,
): Promise<ActionResult> {
  return runAction(async ({ db, actor }) => {
    await transferAdmin(db, actor, { memberId: String(memberId), password: String(password) });
    redirect("/toi");
  });
}
