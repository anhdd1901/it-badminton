import { describe, expect, it } from "vitest";
import { safeErrorSummary } from "./errors";

describe("safeErrorSummary", () => {
  it("chỉ trả tên lỗi, không chứa message", () => {
    const s = safeErrorSummary(new Error("secret $argon2id$v=19$m=19456"));
    expect(s).toBe("Error");
    expect(s).not.toContain("argon2");
  });
  it("thêm mã PostgreSQL ở cause, không chứa tham số", () => {
    const e = new Error("insert failed params: abc, hash", { cause: { code: "23505" } });
    expect(safeErrorSummary(e)).toBe("Error 23505");
  });
  it("thêm mã PostgreSQL ở chính lỗi", () => {
    expect(safeErrorSummary(Object.assign(new Error("x"), { code: "40P01" }))).toBe("Error 40P01");
  });
  it("giá trị không phải Error", () => {
    expect(safeErrorSummary("chuỗi")).toBe("UnknownError");
  });
});
