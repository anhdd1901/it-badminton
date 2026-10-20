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

  /** Runs backup.sh and returns its failure: exit status plus stderr (never the secret). */
  function failure(url: string): { status: number; stderr: string } {
    try {
      run("backup.sh", { BACKUP_DATABASE_URL: url });
    } catch (e) {
      const err = e as { status: number; stderr: Buffer | string };
      return { status: err.status, stderr: String(err.stderr) };
    }
    throw new Error("backup.sh lẽ ra phải lỗi");
  }

  it.each(["********************", "psql", "DATABASE_URL_UNPOOLED", "localhost/anh_em_it_test"])(
    "chuỗi không phải URL kết nối (%s) bị từ chối ngay, không đi tìm socket cục bộ",
    (bad) => {
      const f = failure(bad);
      expect(f.status).toBe(1);
      expect(f.stderr).toContain("không phải chuỗi kết nối");
      expect(f.stderr).toContain("postgres://");
      expect(f.stderr).not.toContain("socket");
      expect(f.stderr).not.toContain(bad);
    },
  );

  it("chuỗi kết nối qua pooler bị từ chối với hướng dẫn dùng chuỗi trực tiếp", () => {
    const f = failure(
      "postgres://u:matkhaubimat@ep-cool-123-pooler.ap-southeast-1.aws.neon.tech/neondb",
    );
    expect(f.status).toBe(1);
    expect(f.stderr).toContain("-pooler");
    expect(f.stderr).not.toContain("matkhaubimat");
  });

  it.each([
    ["dấu nháy bao quanh", (u: string) => `"${u}"`],
    ["tiền tố tên biến", (u: string) => `DATABASE_URL_UNPOOLED=${u}`],
    ["tiền tố và dấu nháy", (u: string) => `DATABASE_URL_UNPOOLED="${u}"`],
    ["khoảng trắng và xuống dòng thừa", (u: string) => ` ${u}\n`],
  ])("dán thừa (%s) vẫn sao lưu được", (_name, wrap) => {
    const out = run("backup.sh", { BACKUP_DATABASE_URL: wrap(testUrl()) });
    expect(out).toMatch(/Đã sao lưu|Dữ liệu không đổi/);
  });

  it("backup.sh báo lỗi khi thiếu BACKUP_DATABASE_URL", () => {
    expect(() => run("backup.sh", { BACKUP_DATABASE_URL: "" })).toThrow();
  });
});
