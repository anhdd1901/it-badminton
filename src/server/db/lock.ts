import { sql } from "drizzle-orm";
import type { LocalDate } from "@/domain/types";
import type { Tx } from "./client";

/** Serialises all writers of one match day until the transaction ends. */
export async function lockMatchDay(tx: Tx, day: LocalDate): Promise<void> {
  await tx.execute(sql`SELECT pg_advisory_xact_lock(hashtext(${"match_day:" + day}))`);
}
