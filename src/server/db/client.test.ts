import { describe, expect, it } from "vitest";
import { connectionOptions, connectionUrl } from "./client";

describe("connectionOptions", () => {
  it("hợp với pooler của Neon và chịu được lúc Neon đang ngủ", () => {
    expect(connectionOptions()).toMatchObject({
      prepare: false,
      max: 5,
      connect_timeout: 15,
      idle_timeout: 20,
    });
  });
});

describe("connectionUrl", () => {
  it("bỏ channel_binding (postgres.js gửi nó thành tham số server)", () => {
    expect(
      connectionUrl("postgres://u:p@ep-x.neon.tech/neondb?sslmode=require&channel_binding=require"),
    ).toBe("postgres://u:p@ep-x.neon.tech/neondb?sslmode=require");
  });
  it("giữ nguyên chuỗi local", () => {
    expect(connectionUrl("postgres://postgres:postgres@localhost:5433/anh_em_it_dev")).toBe(
      "postgres://postgres:postgres@localhost:5433/anh_em_it_dev",
    );
  });
});
