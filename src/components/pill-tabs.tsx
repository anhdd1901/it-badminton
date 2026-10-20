import Link from "next/link";
import { cn } from "@/lib/utils";

export type PillTabItem = { href: string; label: string; active: boolean };

export function PillTabs({ items }: { items: PillTabItem[] }) {
  return (
    <nav className="flex gap-2">
      {items.map((it) => (
        <Link
          key={it.href}
          href={it.href}
          aria-current={it.active ? "page" : undefined}
          className={cn(
            "inline-flex min-h-11 items-center rounded-full border px-4 text-sm font-medium",
            it.active
              ? "border-transparent bg-primary text-primary-foreground"
              : "border-border bg-surface text-text-2",
          )}
        >
          {it.label}
        </Link>
      ))}
    </nav>
  );
}
