import { redirect } from "next/navigation";
import { getActor } from "@/app/_lib/session";
import { LoginForm } from "./login-form";

export default async function LoginPage() {
  if (await getActor()) redirect("/");
  return (
    <main className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center gap-6 p-4">
      <h1 className="text-center text-3xl font-bold text-accent-text">ANH EM IT</h1>
      <LoginForm />
    </main>
  );
}
