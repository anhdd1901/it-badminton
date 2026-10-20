import { describe, expect, it } from "vitest";
import { buildCsp } from "./csp";

describe("buildCsp", () => {
  const prod = buildCsp("abc", { dev: false });
  it.each([
    "script-src 'self' 'nonce-abc' 'strict-dynamic'",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    "img-src 'self' data: blob: https://*.public.blob.vercel-storage.com",
    "style-src 'self' 'unsafe-inline'",
    "font-src 'self'",
    "connect-src 'self'",
  ])("contains %s", (d) => {
    expect(prod).toContain(d);
  });
  it("allows unsafe-eval only in dev", () => {
    expect(prod).not.toContain("unsafe-eval");
    expect(buildCsp("abc", { dev: true })).toContain("'unsafe-eval'");
  });
});
