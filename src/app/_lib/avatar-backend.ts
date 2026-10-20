type Env = Record<string, string | undefined>;

export type AvatarBackend =
  { kind: "blob"; token: string | undefined } | { kind: "local" } | { kind: "misconfigured" };

/**
 * Where avatars live. A Blob read-write token wins; on Vercel a store linked through the
 * Marketplace may only provide `BLOB_STORE_ID`, in which case the SDK authenticates with the
 * deployment's OIDC token (so no token is passed). Off Vercel with neither, files go to disk.
 */
export function avatarBackend(env: Env): AvatarBackend {
  const token = env.BLOB_READ_WRITE_TOKEN || undefined;
  if (token) return { kind: "blob", token };
  if (env.BLOB_STORE_ID) return { kind: "blob", token: undefined };
  return env.VERCEL ? { kind: "misconfigured" } : { kind: "local" };
}
