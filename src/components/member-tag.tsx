"use client";
import { MemberAvatar, type AvatarMember } from "@/components/member-avatar";
import { PlayerName } from "@/components/player-name";
import type { SeasonId } from "@/domain/types";
import { cn } from "@/lib/utils";

// Tag tên mem: avatar + tên trong một viên thuốc; hover/focus đổi nền (spec 8.2).
export function MemberTag({
  player,
  season,
  seed,
  side = "right",
  className,
}: {
  // Props are serialized to the browser: never pass a whole MemberRef (username, spec 8.2).
  player: AvatarMember & { username?: never };
  season: SeasonId;
  seed?: 1 | 2 | null;
  side?: "left" | "right";
  className?: string;
}) {
  return (
    <PlayerName
      player={{ id: player.id, displayName: player.displayName }}
      season={season}
      aria-label={player.displayName}
      className={cn(
        "flex h-8 min-w-0 items-center gap-1 rounded-full sm:gap-1.5 bg-surface-2 py-0 text-sm transition-colors hover:bg-accent hover:text-on-accent data-focused:bg-accent data-focused:text-on-accent",
        side === "left"
          ? "flex-row-reverse pr-0 pl-2 text-right sm:pl-3"
          : "pr-2 pl-0 text-left sm:pr-3",
        className,
      )}
    >
      <span aria-hidden="true" className="inline-flex">
        <MemberAvatar member={player} size={32} />
      </span>
      <span className="min-w-0 flex-1 truncate">{player.displayName}</span>
      {seed ? (
        <span
          role="img"
          aria-label={`Hạt giống ${seed}`}
          className={`shrink-0 text-xs ${seed === 1 ? "text-seed-1" : "text-seed-2"}`}
        >
          ●
        </span>
      ) : null}
    </PlayerName>
  );
}
