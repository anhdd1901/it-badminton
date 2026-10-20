// No "server-only": also imported by src/proxy.ts.
export const SESSION_COOKIE = "aei_session";
export const SESSION_MAX_AGE_SECONDS = 400 * 24 * 60 * 60;

export function sessionCookieOptions() {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    maxAge: SESSION_MAX_AGE_SECONDS,
  };
}
