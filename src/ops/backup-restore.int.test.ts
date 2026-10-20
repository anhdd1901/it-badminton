import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { gunzipSync, gzipSync } from "node:zlib";
import { sql } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createDb } from "@/server/db/client";
import { members } from "@/server/db/schema";
import { createFirstAdmin } from "@/server/members/bootstrap";
import { useTestDb, vn } from "@/server/test/db";
import { restoreDatabase } from "./restore";

describe("sao lưu và khôi phục", () => {
  const t = useTestDb();
  const testUrl = () => process.env.DATABASE_URL_TEST as string;
  const restoreUrl = () => {
    const u = new URL(testUrl());
    u.pathname = "/anh_em_it_restore";
    return u.toString();
  };
  const adminUrl = () => {
    const u = new URL(testUrl());
    u.pathname = "/postgres";
    return u.toString();
  };

  let dir: string;

  beforeAll(async () => {
    const { db, close } = createDb(adminUrl());
    await db.execute(sql.raw("DROP DATABASE IF EXISTS anh_em_it_restore"));
    await db.execute(sql.raw("CREATE DATABASE anh_em_it_restore"));
    await close();
    dir = mkdtempSync(path.join(tmpdir(), "aei-backup-"));
    execFileSync("git", ["init", "-q", dir]);
    execFileSync("git", ["-C", dir, "config", "user.name", "test"]);
    execFileSync("git", ["-C", dir, "config", "user.email", "test@example.com"]);
  }, 60_000);

  afterAll(async () => {
    rmSync(dir, { recursive: true, force: true });
    await t.db.execute(sql.raw("DROP SCHEMA IF EXISTS neon_auth CASCADE"));
    const { db, close } = createDb(adminUrl());
    await db.execute(sql.raw("DROP DATABASE IF EXISTS anh_em_it_restore"));
    await close();
  });

  function run(script: string, env: Record<string, string> = {}): string {
    return execFileSync("bash", [path.resolve("ops/backup", script), dir], {
      env: { ...process.env, ...env },
      encoding: "utf8",
    });
  }

  it("sao lưu, bỏ qua commit khi không đổi, khôi phục được nhiều lần", async () => {
    await createFirstAdmin(
      t.db,
      {
        username: "chu.nhiem",
        displayName: "Chủ nhiệm",
        password: "matkhau123",
        initialElo: "1000",
      },
      vn("2026-10-12T09:00"),
    );

    // Neon Auth (and similar add-ons) create schemas the app does not own; they must stay out of the dump.
    await t.db.execute(sql.raw("CREATE SCHEMA IF NOT EXISTS neon_auth"));
    await t.db.execute(sql.raw("CREATE TABLE IF NOT EXISTS neon_auth.users_sync (id text)"));

    const out = run("backup.sh", { BACKUP_DATABASE_URL: testUrl() });
    expect(out).not.toContain("postgres://");
    const file = path.join(dir, "anh-em-it.sql.gz");
    const dump = gunzipSync(readFileSync(file)).toString("utf8");
    expect(dump).toContain("CREATE TABLE public.members");
    expect(dump).toContain("CREATE TABLE drizzle.__drizzle_migrations");
    expect(dump).not.toContain("neon_auth");

    expect(run("commit.sh")).not.toContain("Không có thay đổi");
    run("backup.sh", { BACKUP_DATABASE_URL: testUrl() });
    expect(run("commit.sh")).toContain("Không có thay đổi, bỏ qua commit");
    expect(
      execFileSync("git", ["-C", dir, "rev-list", "--count", "HEAD"], { encoding: "utf8" }).trim(),
    ).toBe("1");

    for (let i = 0; i < 2; i++) {
      await restoreDatabase(restoreUrl(), file);
      const { db, close } = createDb(restoreUrl());
      const rows = await db.select({ username: members.username }).from(members);
      await close();
      expect(rows).toEqual([{ username: "chu.nhiem" }]);
    }
  }, 180_000);

  it("file dump lỗi giữa chừng thì database đích giữ nguyên", async () => {
    const bad = path.join(dir, "hong.sql.gz");
    writeFileSync(
      bad,
      gzipSync("CREATE SCHEMA public;\nCREATE TABLE public.tam (id int);\nSELECT 1/0;\n"),
    );
    await expect(restoreDatabase(restoreUrl(), bad)).rejects.toThrow();
    const { db, close } = createDb(restoreUrl());
    const rows = await db.select({ username: members.username }).from(members);
    await close();
    expect(rows).toEqual([{ username: "chu.nhiem" }]);
  }, 120_000);

  it("backup.sh báo lỗi khi thiếu BACKUP_DATABASE_URL", () => {
    expect(() => run("backup.sh", { BACKUP_DATABASE_URL: "" })).toThrow();
  });
});
