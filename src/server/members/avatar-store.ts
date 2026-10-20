import { randomUUID } from "node:crypto";
import { mkdir, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { del, put } from "@vercel/blob";

export interface AvatarStore {
  /** Stores the (already processed) image under a server-generated random name; returns its URL. */
  put(bytes: Buffer): Promise<string>;
  remove(url: string): Promise<void>;
}

/** `token` is optional: on Vercel the SDK can authenticate with OIDC when `BLOB_STORE_ID` is set. */
export function blobAvatarStore(token?: string): AvatarStore {
  const auth = token ? { token } : {};
  return {
    async put(bytes) {
      const blob = await put(`avatars/${randomUUID()}.webp`, bytes, {
        access: "public",
        contentType: "image/webp",
        ...auth,
      });
      return blob.url;
    },
    async remove(url) {
      await del(url, { ...auth });
    },
  };
}

const FILE_NAME = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.webp$/;

export function localAvatarStore(dir: string, urlPrefix: string): AvatarStore {
  const prefix = urlPrefix.replace(/\/+$/, "");
  return {
    async put(bytes) {
      const name = `${randomUUID()}.webp`;
      await mkdir(dir, { recursive: true });
      await writeFile(path.join(dir, name), bytes);
      return `${prefix}/${name}`;
    },
    async remove(url) {
      if (!url.startsWith(`${prefix}/`)) return;
      const name = url.slice(prefix.length + 1);
      if (!FILE_NAME.test(name)) return;
      try {
        await unlink(path.join(dir, name));
      } catch (e) {
        if ((e as { code?: unknown }).code !== "ENOENT") throw e;
      }
    },
  };
}
