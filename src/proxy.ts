import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE, sessionCookieOptions } from "@/app/_lib/session-cookie";
import { buildCsp } from "@/ui/csp";

export function proxy(request: NextRequest) {
  const nonce = Buffer.from(crypto.randomUUID()).toString("base64");
  const csp = buildCsp(nonce, { dev: process.env.NODE_ENV === "development" });

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-nonce", nonce);
  requestHeaders.set("Content-Security-Policy", csp);

  const response = NextResponse.next({ request: { headers: requestHeaders } });
  response.headers.set("Content-Security-Policy", csp);

  // Sliding renewal: re-set the same value with identical attributes.
  const token = request.cookies.get(SESSION_COOKIE)?.value;
  if (token) response.cookies.set(SESSION_COOKIE, token, sessionCookieOptions());

  return response;
}

export const config = {
  matcher: [
    {
      source:
        "/((?!_next/static|_next/image|icon.png|apple-icon.png|icons/|manifest.webmanifest|anh-dai-dien).*)",
      missing: [
        { type: "header", key: "next-router-prefetch" },
        { type: "header", key: "purpose", value: "prefetch" },
      ],
    },
  ],
};
