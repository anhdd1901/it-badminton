"use client";
import { BarChart3, CalendarDays, History, Trophy, User } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { MemberAvatar } from "@/components/member-avatar";
import { cn } from "@/lib/utils";
import type { Me } from "@/server/views/members";

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

export function AppNav({ me }: { me: Me }) {
  const pathname = usePathname();
  const link = (item: (typeof ITEMS)[number], layout: "bottom" | "side") => {
    const active = isActive(pathname, item.href);
    return (
      <Link
        key={item.href}
        href={item.href}
        aria-current={active ? "page" : undefined}
        className={cn(
          "flex min-h-11 items-center justify-center rounded-md text-xs font-medium outline-none focus-visible:ring-2 focus-visible:ring-ring",
          layout === "bottom" ? "flex-1 flex-col gap-0.5 py-1" : "gap-3 px-3 text-sm",
          active ? "text-accent-text" : "text-text-2",
          layout === "side" && active && "bg-surface-2",
        )}
      >
        <item.Icon className="size-5" aria-hidden="true" />
        <span>{item.label}</span>
      </Link>
    );
  };
  return (
    <>
      <nav
        aria-label="Điều hướng chính"
        className="fixed inset-x-0 bottom-0 z-40 flex border-t border-border bg-surface pb-[env(safe-area-inset-bottom)] md:hidden"
      >
        {ITEMS.map((i) => link(i, "bottom"))}
      </nav>
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-56 flex-col gap-4 border-r border-border bg-surface p-3 md:flex">
        <div className="flex items-center gap-2 px-1 pt-1">
          <MemberAvatar member={me} size={40} />
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold">{me.displayName}</p>
            <p className="text-xs text-text-2">ANH EM IT</p>
          </div>
        </div>
        <nav aria-label="Điều hướng chính" className="flex flex-col gap-1">
          {ITEMS.map((i) => link(i, "side"))}
        </nav>
      </aside>
    </>
  );
}
