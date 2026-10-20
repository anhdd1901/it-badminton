import "server-only";
import { blobAvatarStore, localAvatarStore, type AvatarStore } from "@/server/members/avatar-store";
import { avatarBackend } from "./avatar-backend";

export const LOCAL_AVATAR_DIR = ".data/avatars";
export const LOCAL_AVATAR_PREFIX = "/anh-dai-dien";

/** True when avatars are kept on local disk (no Blob credentials, not on Vercel). */
export function isLocalAvatarStore(): boolean {
  return avatarBackend(process.env).kind === "local";
}

export function getAvatarStore(): AvatarStore {
  const backend = avatarBackend(process.env);
  if (backend.kind === "blob") return blobAvatarStore(backend.token);
  if (backend.kind === "local") return localAvatarStore(LOCAL_AVATAR_DIR, LOCAL_AVATAR_PREFIX);
  throw new Error(
    "Thiếu BLOB_READ_WRITE_TOKEN hoặc BLOB_STORE_ID: nối kho Vercel Blob vào project",
  );
}
