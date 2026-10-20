import { eq } from "drizzle-orm";
import sharp from "sharp";
import { type Actor, requireRole } from "../actor";
import type { Db } from "../db/client";
import { members } from "../db/schema";
import { AppError, MESSAGES, safeErrorSummary } from "../errors";
import { parseMemberId } from "../validation";
import type { AvatarStore } from "./avatar-store";

export const MAX_AVATAR_BYTES = 5 * 1024 * 1024;
const MAX_INPUT_PIXELS = 40_000_000;
const ALLOWED_FORMATS = new Set(["jpeg", "png", "webp"]);

/** Validates by content, applies EXIF orientation, crops to a square and re-encodes (drops metadata). */
export async function processAvatar(bytes: Uint8Array): Promise<Buffer> {
  if (bytes.byteLength > MAX_AVATAR_BYTES)
    throw new AppError("VALIDATION", MESSAGES.avatarTooLarge);
  const bad = () => new AppError("VALIDATION", MESSAGES.avatarFormat);
  try {
    const input = Buffer.from(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    const open = () => sharp(input, { limitInputPixels: MAX_INPUT_PIXELS });
    const meta = await open().metadata();
    if (!meta.format || !ALLOWED_FORMATS.has(meta.format)) throw bad();
    if ((meta.width ?? 0) * (meta.height ?? 0) > MAX_INPUT_PIXELS) throw bad();
    return await open()
      .rotate()
      .resize(256, 256, { fit: "cover" })
      .webp({ quality: 85 })
      .toBuffer();
  } catch (e) {
    if (e instanceof AppError) throw e;
    // sharp throws plain Errors for unsupported, corrupt or oversized input
    throw bad();
  }
}

async function safeRemove(store: AvatarStore, url: string | null | undefined): Promise<void> {
  if (!url) return;
  try {
    await store.remove(url);
  } catch (e) {
    console.error(`avatar cleanup failed: ${safeErrorSummary(e)}`);
  }
}

function authorize(actor: Actor, rawMemberId: string): string {
  const memberId = parseMemberId(rawMemberId);
  if (actor.memberId !== memberId) requireRole(actor, "admin");
  return memberId;
}

/** Sets avatarUrl (or clears it with null) and returns the previous URL. */
async function swapAvatarUrl(db: Db, memberId: string, url: string | null) {
  return db.transaction(async (tx) => {
    const [row] = await tx
      .select({ url: members.avatarUrl })
      .from(members)
      .where(eq(members.id, memberId))
      .for("update");
    if (!row) throw new AppError("NOT_FOUND", MESSAGES.memberNotFound);
    await tx.update(members).set({ avatarUrl: url }).where(eq(members.id, memberId));
    return row.url;
  });
}

export async function setAvatar(
  db: Db,
  actor: Actor,
  rawMemberId: string,
  bytes: Uint8Array,
  store: AvatarStore,
): Promise<void> {
  const memberId = authorize(actor, rawMemberId);
  const processed = await processAvatar(bytes);
  const url = await store.put(processed);
  let previous: string | null;
  try {
    previous = await swapAvatarUrl(db, memberId, url);
  } catch (e) {
    await safeRemove(store, url);
    throw e;
  }
  await safeRemove(store, previous);
}

export async function removeAvatar(
  db: Db,
  actor: Actor,
  rawMemberId: string,
  store: AvatarStore,
): Promise<void> {
  const memberId = authorize(actor, rawMemberId);
  const previous = await swapAvatarUrl(db, memberId, null);
  await safeRemove(store, previous);
}
