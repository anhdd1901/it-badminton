import { getDb } from "@/app/_lib/db";
import { requireActor } from "@/app/_lib/session";
import { logoutAction } from "@/app/_actions/auth";
import { AppNav } from "@/components/app-nav";
import { getMe } from "@/server/views/members";

export default async function AppLayout({ children }: LayoutProps<"/">) {
  const actor = await requireActor();
  const me = await getMe(getDb(), actor);
  return (
    <div className="flex flex-1 flex-col bg-bg text-text md:pl-56">
      <AppNav me={me} />
      {/* Temporary logout until the "Tôi" screen (Task 12) provides it. */}
      <form action={logoutAction} className="flex justify-end p-2">
        <button type="submit" className="min-h-11 px-3 text-sm text-text-2 underline">
          Đăng xuất
        </button>
      </form>
      <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col pb-20 md:pb-6">{children}</div>
    </div>
  );
}
