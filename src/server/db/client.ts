import { drizzle, type PostgresJsDatabase } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

export type Db = PostgresJsDatabase<typeof schema>;
export type Tx = Parameters<Parameters<Db["transaction"]>[0]>[0];

export function createDb(url: string): { db: Db; close: () => Promise<void> } {
  const client = postgres(url);
  return { db: drizzle(client, { schema }), close: () => client.end() };
}
