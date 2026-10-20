import { migrate } from "drizzle-orm/postgres-js/migrator";
import { createDb } from "../src/server/db/client";
import { safeErrorSummary } from "../src/server/errors";
import { directUrl, shouldMigrate } from "../src/ops/deploy-env";

async function main(): Promise<void> {
  if (!shouldMigrate(process.env)) {
    console.log("Bỏ qua migration (không phải production)");
    return;
  }
  let url: string;
  try {
    url = directUrl(process.env);
  } catch (e) {
    console.error((e as Error).message + " (nối database Neon vào project trên Vercel)");
    process.exit(1);
  }
  const { db, close } = createDb(url);
  try {
    await migrate(db, { migrationsFolder: "drizzle" });
    console.log("Đã chạy migration");
  } finally {
    await close();
  }
}

main().catch((e: unknown) => {
  console.error("Migration thất bại: " + safeErrorSummary(e));
  process.exit(1);
});
