import "server-only";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { isLocalAvatarStore, LOCAL_AVATAR_DIR } from "@/app/_lib/avatar-store";

const NAME = /^[0-9a-f-]{36}\.webp$/;

export async function GET(_req: Request, ctx: { params: Promise<{ name: string }> }) {
  const { name } = await ctx.params;
  if (!isLocalAvatarStore() || !NAME.test(name)) return new Response(null, { status: 404 });
  try {
    const bytes = await readFile(path.join(process.cwd(), LOCAL_AVATAR_DIR, name));
    return new Response(new Uint8Array(bytes), {
      headers: {
        "Content-Type": "image/webp",
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });
  } catch {
    return new Response(null, { status: 404 });
  }
}
