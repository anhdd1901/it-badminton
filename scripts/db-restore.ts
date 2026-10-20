import { existsSync } from "node:fs";
import { confirmMatches, describeTarget, checkRestoreFile } from "../src/ops/restore-guard";
import { restoreDatabase } from "../src/ops/restore";
import { createPrompter, reportFailure, targetUrl } from "./cli";

async function main(): Promise<void> {
  const file = process.argv[2];
  if (!file) {
    console.error("Cách dùng: pnpm db:restore <file.sql.gz>");
    process.exit(1);
  }
  try {
    checkRestoreFile(file);
  } catch (e) {
    console.error((e as Error).message);
    process.exit(1);
  }
  if (!existsSync(file)) {
    console.error(`Không tìm thấy file ${file}`);
    process.exit(1);
  }
  const url = targetUrl();
  const { host, database } = describeTarget(url);
  console.log(`Sẽ GHI ĐÈ database ${database} trên ${host} bằng ${file}`);
  const prompt = createPrompter();
  const typed = await prompt.ask("Gõ tên database để xác nhận: ");
  prompt.close();
  if (!confirmMatches(typed, database)) {
    console.error("Đã hủy");
    process.exit(1);
  }
  await restoreDatabase(url, file);
  console.log("Đã khôi phục");
}

main().catch(reportFailure);
