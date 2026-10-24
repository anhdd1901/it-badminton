import { redirect } from "next/navigation";
import { getActor } from "@/app/_lib/session";
import { LoginForm } from "./login-form";

export default async function LoginPage() {
  if (await getActor()) redirect("/");
  return (
    <main className="flex flex-1 bg-chrome">
      <div className="mx-auto flex w-full max-w-sm flex-col justify-center gap-6 p-4">
        <h1 className="text-center font-display text-5xl font-bold italic text-on-chrome">
          ANH EM IT
        </h1>
        <div aria-hidden="true" className="net" />
        <div className="rounded-lg bg-surface p-4">
          <LoginForm />
        </div>
      </div>
    </main>
  );
}
