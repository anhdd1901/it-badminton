"use client";
import { useRef, type ReactNode } from "react";
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
  "aria-label": ariaLabel,
  children,
}: {
  // Props are serialized to the browser: never pass a whole MemberRef (username, spec 8.2).
  player: { id: string; displayName: string; username?: never };
  season: SeasonId;
  className?: string;
  "aria-label"?: string;
  children?: ReactNode;
}) {
  const { focusedId, setFocusedId, enabled } = usePlayerFocus();
  const pointerType = useRef("mouse");
  const focused = focusedId === player.id;
  const clear = () => {
    if (focusedId === player.id) setFocusedId(null);
  };
  return (
    <MemberDialog
      memberId={player.id}
      season={season}
      triggerClassName={cn("rounded-sm", className)}
      triggerProps={{
        ...(ariaLabel ? { "aria-label": ariaLabel } : null),
        ...(focused ? DATA_FOCUSED : null),
        onPointerDown: (e) => {
          pointerType.current = e.pointerType;
        },
        // Touch in a match list: first tap highlights, a second tap on the same name opens the popup.
        onClick: (e) => {
          if (enabled && pointerType.current !== "mouse" && !focused) {
            e.preventDefault();
            setFocusedId(player.id);
          }
          pointerType.current = "mouse";
        },
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
