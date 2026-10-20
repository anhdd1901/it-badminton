type Env = Record<string, string | undefined>;

/** Migrations run only for production deployments; previews must not touch the production database. */
export function shouldMigrate(env: Env): boolean {
  return env.VERCEL_ENV === "production";
}

/** Direct (unpooled) connection for migrations, backups, restores and admin commands. */
export function directUrl(env: Env): string {
  const url = env.DATABASE_URL_UNPOOLED || env.DATABASE_URL;
  if (!url) throw new Error("Thiếu DATABASE_URL");
  return url;
}
