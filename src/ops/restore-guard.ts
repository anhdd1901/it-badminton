/** Pure checks for `pnpm db:restore`: what may be restored, where, and the confirmation. */

export function checkRestoreFile(path: string): "sql" | "sql.gz" {
  if (path.endsWith(".sql.gz")) return "sql.gz";
  if (path.endsWith(".sql")) return "sql";
  throw new Error("Chỉ khôi phục từ file .sql hoặc .sql.gz");
}

/** Host and database name of a connection URL, for the confirmation prompt (never the password). */
export function describeTarget(url: string): { host: string; database: string } {
  const u = new URL(url);
  return { host: u.host, database: decodeURIComponent(u.pathname.replace(/^\//, "")) };
}

export function confirmMatches(typed: string, database: string): boolean {
  return typed.trim() === database;
}

/**
 * The dump (`--schema=public --schema=drizzle`) creates both schemas itself, so a restore only has
 * to drop them first to run on a non-empty database.
 */
export const RESET_SQL =
  "DROP SCHEMA IF EXISTS drizzle CASCADE; DROP SCHEMA IF EXISTS public CASCADE;";
