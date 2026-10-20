import { existsSync } from "node:fs";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import { createDb } from "../db/client";

export default async function setup(): Promise<void> {
  if (existsSync(".env")) process.loadEnvFile(".env");
  const url = process.env.DATABASE_URL_TEST;
  if (!url) throw new Error("DATABASE_URL_TEST is not set");
  const { db, close } = createDb(url);
  try {
    await migrate(db, { migrationsFolder: "drizzle" });
  } finally {
    await close();
  }
}
