"use client";
import { BarChart3, CalendarDays, History, Trophy, User } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { MemberAvatar } from "@/components/member-avatar";
import { cn } from "@/lib/utils";
import type { AvatarMember } from "@/components/member-avatar";

const ITEMS = [
  { href: "/", label: "Tuần này", Icon: CalendarDays },
  { href: "/xep-hang", label: "Xếp hạng", Icon: Trophy },
  { href: "/thong-ke", label: "Thống kê", Icon: BarChart3 },
  { href: "/lich-su", label: "Lịch sử", Icon: History },
  { href: "/toi", label: "Tôi", Icon: User },
] as const;

function isActive(pathname: string, href: string): boolean {
  return href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(`${href}/`);
}

// Serialized to the browser: avatar fields only, no username (spec 8.2).
export function AppNav({ me }: { me: AvatarMember & { username?: never } }) {
  const pathname = usePathname();
  const link = (item: (typeof ITEMS)[number], layout: "bottom" | "side") => {
    const active = isActive(pathname, item.href);
    return (
      <Link
        key={item.href}
        href={item.href}
        aria-current={active ? "page" : undefined}
        className={cn(
          "relative flex min-h-11 items-center rounded-[6px] text-xs font-medium outline-none focus-visible:ring-2 focus-visible:ring-chrome-active",
          layout === "bottom"
            ? "flex-1 flex-col justify-center gap-0.5 py-1"
            : "justify-start gap-2 px-1 text-sm",
          active ? "text-chrome-active" : "text-on-chrome",
        )}
      >
        {active && (
          <span
            data-slot="nav-mark"
            aria-hidden="true"
            className={cn(
              "absolute bg-chrome-active",
              layout === "bottom" ? "inset-x-3 top-0 h-[3px]" : "inset-y-2 left-0 w-[3px]",
            )}
          />
        )}
        {layout === "side" ? (
          <span data-slot="nav-icon" className="flex size-10 shrink-0 items-center justify-center">
            <item.Icon className="size-5" aria-hidden="true" />
          </span>
        ) : (
          <item.Icon className="size-5" aria-hidden="true" />
        )}
        <span>{item.label}</span>
      </Link>
    );
  };
  return (
    <>
      <nav
        aria-label="Điều hướng chính"
        className="fixed inset-x-0 bottom-0 z-40 flex border-t border-chrome bg-chrome text-on-chrome pb-[env(safe-area-inset-bottom)] md:hidden"
      >
        {ITEMS.map((i) => link(i, "bottom"))}
      </nav>
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-56 flex-col gap-4 border-r border-chrome bg-chrome p-3 text-on-chrome md:flex">
        <div className="flex items-center gap-2 px-1 pt-1">
          <MemberAvatar member={me} size={40} />
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold">{me.displayName}</p>
            <p className="text-xs text-on-chrome">ANH EM IT</p>
          </div>
        </div>
        <nav aria-label="Điều hướng chính" className="flex flex-col gap-1">
          {ITEMS.map((i) => link(i, "side"))}
        </nav>
      </aside>
    </>
  );
}
