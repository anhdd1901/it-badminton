import { describe, expect, it } from "vitest";
import { RESET_SQL, checkRestoreFile, confirmMatches, describeTarget } from "./restore-guard";

describe("checkRestoreFile", () => {
  it("nhận .sql và .sql.gz", () => {
    expect(checkRestoreFile("/tmp/anh-em-it.sql")).toBe("sql");
    expect(checkRestoreFile("anh-em-it.sql.gz")).toBe("sql.gz");
  });
  it.each(["a.dump", "a.gz", "a.txt", "sql"])("từ chối %s", (f) => {
    expect(() => checkRestoreFile(f)).toThrow("Chỉ khôi phục từ file .sql hoặc .sql.gz");
  });
});

describe("describeTarget", () => {
  it("lấy host và tên database, không lộ mật khẩu", () => {
    const t = describeTarget(
      "postgres://u:p@ep-x.ap-southeast-1.aws.neon.tech/neondb?sslmode=require",
    );
    expect(t).toEqual({ host: "ep-x.ap-southeast-1.aws.neon.tech", database: "neondb" });
  });
  it("giữ cổng khi có", () => {
    expect(describeTarget("postgres://u:p@localhost:5433/anh_em_it_dev")).toEqual({
      host: "localhost:5433",
      database: "anh_em_it_dev",
    });
  });
});

describe("confirmMatches", () => {
  it("so sánh sau khi bỏ khoảng trắng, phân biệt hoa thường", () => {
    expect(confirmMatches(" neondb ", "neondb")).toBe(true);
    expect(confirmMatches("NEONDB", "neondb")).toBe(false);
    expect(confirmMatches("", "neondb")).toBe(false);
  });
});

describe("RESET_SQL", () => {
  it("xóa schema drizzle và public rồi tạo lại public", () => {
    expect(RESET_SQL).toBe(
      "DROP SCHEMA IF EXISTS drizzle CASCADE; DROP SCHEMA IF EXISTS public CASCADE; CREATE SCHEMA public;",
    );
  });
});
