import { existsSync } from "node:fs";
import { createInterface } from "node:readline";
import { Writable } from "node:stream";
import { directUrl } from "../src/ops/deploy-env";
import { createDb } from "../src/server/db/client";
import { AppError, safeErrorSummary } from "../src/server/errors";

/** Loads `ENV_FILE` (e.g. `.env.production.local`) when set, otherwise `.env`. */
export function loadEnv(): void {
  const envFile = process.env.ENV_FILE;
  if (envFile) {
    if (!existsSync(envFile)) {
      console.error(`Không tìm thấy file ${envFile}`);
      process.exit(1);
    }
    process.loadEnvFile(envFile);
  } else if (!process.env.DATABASE_URL && existsSync(".env")) {
    process.loadEnvFile(".env");
  }
}

/** Direct connection URL for admin commands (works against Neon too); exits when missing. */
export function targetUrl(): string {
  loadEnv();
  try {
    return directUrl(process.env);
  } catch {
    console.error("Thiếu DATABASE_URL (đặt trong file .env)");
    process.exit(1);
  }
}

export function connect(): ReturnType<typeof createDb> {
  return createDb(targetUrl());
}

/** Line prompts on stdin; secret answers are not echoed. Works with piped input too. */
export function createPrompter() {
  let muted = false;
  const output = new Writable({
    write(chunk, _enc, cb) {
      if (!muted) process.stdout.write(chunk);
      cb();
    },
  });
  const rl = createInterface({
    input: process.stdin,
    output,
    terminal: process.stdin.isTTY === true,
  });
  const queue: string[] = [];
  const waiters: Array<(line: string | null) => void> = [];
  let ended = false;
  rl.on("line", (line) => {
    const waiter = waiters.shift();
    if (waiter) waiter(line);
    else queue.push(line);
  });
  rl.on("close", () => {
    ended = true;
    for (const w of waiters.splice(0)) w(null);
  });

  async function ask(label: string, secret: boolean): Promise<string> {
    process.stdout.write(label);
    muted = secret;
    const queued = queue.shift();
    const line =
      queued !== undefined
        ? queued
        : ended
          ? null
          : await new Promise<string | null>((r) => waiters.push(r));
    muted = false;
    if (secret) process.stdout.write("\n");
    if (line === null) throw new Error("Không đọc được dữ liệu nhập");
    return line;
  }

  return {
    ask: (label: string) => ask(label, false),
    askSecret: (label: string) => ask(label, true),
    close: () => rl.close(),
  };
}

export function reportFailure(e: unknown): never {
  if (e instanceof AppError) console.error(e.message);
  else console.error("Có lỗi không mong muốn: " + safeErrorSummary(e));
  process.exit(1);
}
