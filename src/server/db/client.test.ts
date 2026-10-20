import { describe, expect, it } from "vitest";
import { connectionOptions } from "./client";

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
