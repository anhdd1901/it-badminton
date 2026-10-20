import { afterEach, describe, expect, it, vi } from "vitest";
import { now } from "./clock";

vi.mock("server-only", () => ({}));
const FAKE = "2026-10-17T03:00:00.000Z";

describe("now", () => {
  afterEach(() => vi.unstubAllEnvs());
  it("uses APP_FAKE_NOW only when allowed and not on Vercel", () => {
    vi.stubEnv("APP_FAKE_NOW", FAKE);
    vi.stubEnv("ALLOW_FAKE_CLOCK", "1");
    vi.stubEnv("VERCEL", "");
    expect(now().toISOString()).toBe(FAKE);
    vi.stubEnv("VERCEL", "1");
    expect(now().toISOString()).not.toBe(FAKE);
    vi.stubEnv("VERCEL", "");
    vi.stubEnv("ALLOW_FAKE_CLOCK", "");
    expect(now().toISOString()).not.toBe(FAKE);
  });
});
