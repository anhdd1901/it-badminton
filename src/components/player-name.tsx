"use client";
import type { ReactNode } from "react";
import { MemberDialog } from "@/components/member/member-dialog";
import { usePlayerFocus } from "@/components/player-focus";
import type { SeasonId } from "@/domain/types";
import { cn } from "@/lib/utils";

const DATA_FOCUSED = { "data-focused": "" } as const;

function isFocusVisible(el: HTMLElement): boolean {
  try {
    return el.matches(":focus-visible");
  } catch {
    return false;
  }
}

export function PlayerName({
  player,
  season,
  className,
  children,
}: {
  player: { id: string; displayName: string };
  season: SeasonId;
  className?: string;
  children?: ReactNode;
}) {
  const { focusedId, setFocusedId } = usePlayerFocus();
  const focused = focusedId === player.id;
  const clear = () => {
    if (focusedId === player.id) setFocusedId(null);
  };
  return (
    <MemberDialog
      memberId={player.id}
      season={season}
      triggerClassName={cn("rounded-sm data-focused:bg-highlight", className)}
      triggerProps={{
        ...(focused ? DATA_FOCUSED : null),
        onPointerEnter: (e) => {
          if (e.pointerType === "mouse") setFocusedId(player.id);
        },
        onPointerLeave: (e) => {
          if (e.pointerType === "mouse") clear();
        },
        onFocus: (e) => {
          if (isFocusVisible(e.currentTarget)) setFocusedId(player.id);
        },
        onBlur: clear,
      }}
    >
      {children ?? player.displayName}
    </MemberDialog>
  );
}
