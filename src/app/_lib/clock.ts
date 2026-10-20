import "server-only";

export function now(): Date {
  const fake = process.env.APP_FAKE_NOW;
  if (process.env.ALLOW_FAKE_CLOCK === "1" && !process.env.VERCEL && fake) {
    const d = new Date(fake);
    if (!Number.isNaN(d.getTime())) return d;
  }
  return new Date();
}
