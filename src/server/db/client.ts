import { drizzle, type PostgresJsDatabase } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

export type Db = PostgresJsDatabase<typeof schema>;
export type Tx = Parameters<Parameters<Db["transaction"]>[0]>[0];

/**
 * `prepare: false` is required behind Neon's pooler (transaction mode); `connect_timeout`
 * leaves room for a sleeping Neon compute to wake up.
 */
export function connectionOptions() {
  return { prepare: false, max: 5, connect_timeout: 15, idle_timeout: 20, onnotice: () => {} };
}

export function createDb(url: string): { db: Db; close: () => Promise<void> } {
  const client = postgres(url, connectionOptions());
  return { db: drizzle(client, { schema }), close: () => client.end() };
}
