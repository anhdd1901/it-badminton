import "server-only";
import { blobAvatarStore, localAvatarStore, type AvatarStore } from "@/server/members/avatar-store";

export const LOCAL_AVATAR_DIR = ".data/avatars";
export const LOCAL_AVATAR_PREFIX = "/anh-dai-dien";

/** True when avatars are kept on local disk (no Blob token, not on Vercel). */
export function isLocalAvatarStore(): boolean {
  return !process.env.BLOB_READ_WRITE_TOKEN && !process.env.VERCEL;
}

export function getAvatarStore(): AvatarStore {
  const token = process.env.BLOB_READ_WRITE_TOKEN;
  if (token) return blobAvatarStore(token);
  if (isLocalAvatarStore()) return localAvatarStore(LOCAL_AVATAR_DIR, LOCAL_AVATAR_PREFIX);
  throw new Error("BLOB_READ_WRITE_TOKEN is required on Vercel");
}
