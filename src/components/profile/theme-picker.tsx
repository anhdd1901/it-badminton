"use client";
import { useState } from "react";
import { cn } from "@/lib/utils";

export type ThemeChoice = "system" | "light" | "dark";

const OPTIONS: { value: ThemeChoice; label: string }[] = [
  { value: "system", label: "Theo thiết bị" },
  { value: "light", label: "Sáng" },
  { value: "dark", label: "Tối" },
];

const MAX_AGE = 400 * 24 * 60 * 60;

function apply(value: ThemeChoice) {
  if (value === "system") {
    document.cookie = "theme=; path=/; max-age=0; SameSite=Lax";
    delete document.documentElement.dataset.theme;
  } else {
    document.cookie = `theme=${value}; path=/; max-age=${MAX_AGE}; SameSite=Lax`;
    document.documentElement.dataset.theme = value;
  }
}

export function ThemePicker({ value }: { value: ThemeChoice }) {
  const [current, setCurrent] = useState(value);
  return (
    <div role="group" aria-label="Giao diện" className="flex flex-wrap gap-2">
      {OPTIONS.map((o) => (
        <button
          key={o.value}
          type="button"
          aria-pressed={current === o.value}
          onClick={() => {
            apply(o.value);
            setCurrent(o.value);
          }}
          className={cn(
            "inline-flex min-h-11 items-center rounded-full border px-4 text-sm font-medium outline-none focus-visible:ring-2 focus-visible:ring-ring",
            current === o.value
              ? "border-transparent bg-primary text-primary-foreground"
              : "border-border bg-surface text-text-2",
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}
