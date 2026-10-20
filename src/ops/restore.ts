import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { gunzipSync } from "node:zlib";
import { RESET_SQL, checkRestoreFile } from "./restore-guard";

/**
 * Replaces the whole database at `url` with the dump in `file`, in one transaction, using the
 * PostgreSQL 18 `psql` from Docker (`PG_IMAGE` overrides; a newer client can talk to older servers). The URL is passed through the environment, never argv.
 * psql errors go straight to the terminal (libpq messages name host and user, never the password).
 */
export async function restoreDatabase(url: string, file: string): Promise<void> {
  const kind = checkRestoreFile(file);
  const raw = readFileSync(file);
  const dump = kind === "sql.gz" ? gunzipSync(raw) : raw;
  const input = Buffer.concat([Buffer.from(RESET_SQL + "\n"), dump]);
  execFileSync(
    "docker",
    [
      "run",
      "--rm",
      "-i",
      "--network",
      "host",
      "-e",
      "PGURL",
      process.env.PG_IMAGE || "postgres:18",
      "sh",
      "-c",
      'psql -q -v ON_ERROR_STOP=1 --single-transaction "$PGURL"',
    ],
    {
      input,
      env: { ...process.env, PGURL: url },
      stdio: ["pipe", "ignore", "inherit"],
      maxBuffer: 64 * 1024 * 1024,
    },
  );
}
