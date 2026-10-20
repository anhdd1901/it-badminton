"use server";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { now } from "@/app/_lib/clock";
import { getDb } from "@/app/_lib/db";
import { clearSessionCookie, SESSION_COOKIE, setSessionCookie } from "@/app/_lib/session";
import { login } from "@/server/auth/login";
import { logout } from "@/server/auth/sessions";
import { UNEXPECTED_MESSAGE } from "@/ui/action-result";
import { toActionResult } from "@/app/_lib/action";
import { unstable_rethrow } from "next/navigation";

type LoginState = { message: string } | null;

/** Not wrapped by runAction: there is no actor yet (ruling R2). */
export async function loginAction(_prev: LoginState, form: FormData): Promise<LoginState> {
  const username = String(form.get("username") ?? "");
  const password = String(form.get("password") ?? "");
  try {
    const result = await login(getDb(), { username, password }, now());
    if (!result.ok) return { message: result.message };
    await setSessionCookie(result.token);
  } catch (e) {
    unstable_rethrow(e);
    const r = toActionResult(e);
    return { message: r.ok ? UNEXPECTED_MESSAGE : r.message };
  }
  redirect("/");
}

/** Not wrapped by runAction: must work even with an invalid session (ruling R2). */
export async function logoutAction(): Promise<void> {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (token) {
    try {
      await logout(getDb(), token);
    } catch (e) {
      unstable_rethrow(e);
      toActionResult(e); // logged; the cookie is cleared regardless
    }
  }
  await clearSessionCookie();
  redirect("/dang-nhap");
}
