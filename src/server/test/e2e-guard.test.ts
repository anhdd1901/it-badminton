import { describe, expect, it } from "vitest";
import { assertConnectedToE2e, assertSafeE2eDatabase } from "./e2e-guard";

const E2E = "postgres://postgres:postgres@localhost:5433/anh_em_it_e2e";

describe("assertSafeE2eDatabase", () => {
  it("tên không kết thúc bằng _e2e thì ném lỗi", () => {
    expect(() => assertSafeE2eDatabase("postgres://u:p@localhost:5433/anh_em_it_dev", [])).toThrow(
      "_e2e",
    );
  });
  it("trùng host/port/tên với DATABASE_URL dù khác query hay mật khẩu thì ném lỗi", () => {
    expect(() =>
      assertSafeE2eDatabase(E2E, ["postgres://x:y@LOCALHOST:5433/anh_em_it_e2e/?sslmode=disable"]),
    ).toThrow("trùng");
  });
  it("URL e2e hợp lệ thì qua", () => {
    expect(() =>
      assertSafeE2eDatabase(E2E, [
        "postgres://postgres:postgres@localhost:5433/anh_em_it_dev",
        undefined,
        "postgres://postgres:postgres@localhost:5433/anh_em_it_test",
      ]),
    ).not.toThrow();
  });
});

describe("assertConnectedToE2e", () => {
  it("chỉ chấp nhận tên kết thúc _e2e", () => {
    expect(() => assertConnectedToE2e("anh_em_it_dev")).toThrow();
    expect(() => assertConnectedToE2e("anh_em_it_e2e")).not.toThrow();
  });
});
