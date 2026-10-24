import { cookies } from "next/headers";
import Link from "next/link";
import { logoutAction } from "@/app/_actions/auth";
import { getDb } from "@/app/_lib/db";
import { requireActor } from "@/app/_lib/session";
import { MemberAvatar } from "@/components/member-avatar";
import { AvatarForm } from "@/components/profile/avatar-form";
import { DisplayNameForm } from "@/components/profile/display-name-form";
import { PasswordForm } from "@/components/profile/password-form";
import { ThemePicker, type ThemeChoice } from "@/components/profile/theme-picker";
import { Button } from "@/components/ui/button";
import type { Role } from "@/domain/types";
import { getMe } from "@/server/views/members";

const ROLE_LABEL: Record<Role, string> = {
  admin: "Admin",
  subadmin: "Subadmin",
  member: "Mem",
};

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-3 rounded-lg border border-border bg-surface p-4">
      <h2 className="text-base font-semibold">{title}</h2>
      {children}
    </section>
  );
}

export default async function ProfilePage() {
  const actor = await requireActor();
  const me = await getMe(getDb(), actor);
  const cookie = (await cookies()).get("theme")?.value;
  const theme: ThemeChoice = cookie === "light" || cookie === "dark" ? cookie : "system";

  return (
    <main className="flex flex-col gap-4 p-4">
      <h1 className="sr-only">Tôi</h1>
      <div className="flex items-center gap-3">
        <MemberAvatar member={me} size={64} />
        <div className="min-w-0">
          <p className="truncate text-xl font-semibold">{me.displayName}</p>
          <p className="text-sm text-text-2">
            @{me.username} · {ROLE_LABEL[me.role]}
          </p>
        </div>
      </div>
      <Section title="Tên hiển thị">
        <DisplayNameForm memberId={me.id} displayName={me.displayName} />
      </Section>
      <Section title="Ảnh đại diện">
        <AvatarForm member={me} />
      </Section>
      <Section title="Đổi mật khẩu">
        <PasswordForm />
      </Section>
      <Section title="Giao diện">
        <ThemePicker value={theme} />
      </Section>
      {me.role === "admin" ? (
        <Link
          href="/toi/quan-ly-mem"
          className="inline-flex h-11 w-full items-center justify-center rounded-[6px] border border-border bg-surface px-4 text-sm font-medium"
        >
          Quản lý mem
        </Link>
      ) : null}
      <form action={logoutAction}>
        <Button type="submit" variant="outline" className="w-full">
          Đăng xuất
        </Button>
      </form>
    </main>
  );
}
