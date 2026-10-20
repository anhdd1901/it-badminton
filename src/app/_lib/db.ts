import "server-only";
import { createDb } from "@/server/db/client";
import type { Db } from "@/server/db/client";

const g = globalThis as unknown as { __aeiDb?: Db };

export function getDb(): Db {
  if (!g.__aeiDb) {
    const url = process.env.DATABASE_URL;
    if (!url) throw new Error("DATABASE_URL is not set");
    g.__aeiDb = createDb(url).db;
  }
  return g.__aeiDb;
}
