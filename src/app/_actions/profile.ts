"use server";
import { runAction } from "@/app/_lib/action";
import { getAvatarStore } from "@/app/_lib/avatar-store";
import { AppError, MESSAGES } from "@/server/errors";
import { MAX_AVATAR_BYTES, removeAvatar, setAvatar } from "@/server/members/avatar";
import { changeOwnPassword, updateDisplayName } from "@/server/members/profile";
import type { ActionResult } from "@/ui/action-result";

export async function updateDisplayNameAction(
  memberId: string,
  displayName: string,
): Promise<ActionResult> {
  return runAction(async ({ db, actor }) => {
    await updateDisplayName(db, actor, memberId, displayName);
  });
}

export async function changeOwnPasswordAction(input: {
  current: string;
  next: string;
  confirm: string;
}): Promise<ActionResult> {
  return runAction(async ({ db, actor }) => {
    if (input.next !== input.confirm) {
      throw new AppError("VALIDATION", "Mật khẩu nhập lại không khớp");
    }
    await changeOwnPassword(db, actor, String(input.current), String(input.next));
  });
}

/** The file is external input: only its size (checked before reading) and bytes count; type and name are never trusted. */
export async function setAvatarAction(memberId: string, form: FormData): Promise<ActionResult> {
  return runAction(async ({ db, actor }) => {
    const file = form.get("file");
    if (!(file instanceof File) || file.size === 0) {
      throw new AppError("VALIDATION", MESSAGES.avatarFormat);
    }
    if (file.size > MAX_AVATAR_BYTES) throw new AppError("VALIDATION", MESSAGES.avatarTooLarge);
    const bytes = new Uint8Array(await file.arrayBuffer());
    await setAvatar(db, actor, memberId, bytes, getAvatarStore());
  });
}

export async function removeAvatarAction(memberId: string): Promise<ActionResult> {
  return runAction(async ({ db, actor }) => {
    await removeAvatar(db, actor, memberId, getAvatarStore());
  });
}
