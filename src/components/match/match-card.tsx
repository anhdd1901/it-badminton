"use client";
import { useState } from "react";
import { deleteResultAction, saveResultAction } from "@/app/_actions/results";
import { MemberAvatar } from "@/components/member-avatar";
import { PlayerName } from "@/components/player-name";
import { ScoreInput } from "@/components/match/score-input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useAppAction } from "@/components/use-app-action";
import type { SeasonId } from "@/domain/types";
import type { PlayerRef, WeekMatch } from "@/server/views/week";

function Player({ p, season }: { p: PlayerRef; season: SeasonId }) {
  return (
    <span className="flex min-w-0 flex-1 items-center gap-1">
      <MemberAvatar member={p} size={24} />
      <PlayerName player={p} season={season} className="block min-w-0 truncate text-left" />
      {p.seed ? (
        <span
          role="img"
          aria-label={`Hạt giống ${p.seed}`}
          className={`shrink-0 ${p.seed === 1 ? "text-seed-1" : "text-seed-2"}`}
        >
          ●
        </span>
      ) : null}
    </span>
  );
}

function Team({
  testId,
  players,
  score,
  tone,
  season,
  scoreWidth,
}: {
  testId: string;
  players: [PlayerRef, PlayerRef];
  score: number | null;
  tone: "win" | "loss" | "none";
  season: SeasonId;
  scoreWidth: string;
}) {
  const cls = tone === "win" ? "text-win font-semibold" : tone === "loss" ? "text-loss" : "";
  return (
    <div data-testid={testId} className={`flex items-center gap-2 ${cls}`}>
      <div className="flex min-w-0 flex-1 gap-3">
        <Player p={players[0]} season={season} />
        <Player p={players[1]} season={season} />
      </div>
      <span className={`${scoreWidth} shrink-0 text-right tabular-nums`}>{score ?? "–"}</span>
    </div>
  );
}

const names = (t: [PlayerRef, PlayerRef]) => `${t[0].displayName} & ${t[1].displayName}`;

export function MatchCard({
  match,
  editable,
  day,
  scheduleKey,
  season,
}: {
  match: WeekMatch;
  editable: boolean;
  day: string;
  scheduleKey: string;
  season: SeasonId;
}) {
  const [open, setOpen] = useState(false);
  const { run: save } = useAppAction(saveResultAction);
  const { run: del } = useAppAction(deleteResultAction);
  const r = match.result;
  // editable: the score column is covered by the w-14 overlay button, so keep names clear of it
  const scoreWidth = editable ? "w-10" : "w-8";
  const body = (
    <>
      <span className="w-5 shrink-0 text-xs text-text-2">{match.number}</span>
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <Team
          testId="team-a"
          players={match.teamA}
          score={r?.scoreA ?? null}
          tone={!r ? "none" : r.scoreA > r.scoreB ? "win" : "loss"}
          season={season}
          scoreWidth={scoreWidth}
        />
        <Team
          testId="team-b"
          players={match.teamB}
          score={r?.scoreB ?? null}
          tone={!r ? "none" : r.scoreB > r.scoreA ? "win" : "loss"}
          season={season}
          scoreWidth={scoreWidth}
        />
      </div>
    </>
  );
  const box =
    "flex w-full items-center gap-3 rounded-lg border border-border bg-surface p-3 text-left text-sm";
  if (!editable) return <div className={box}>{body}</div>;

  const ref = { day, scheduleKey, matchNumber: match.number };
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <div className={`${box} relative min-h-11`}>
        {body}
        <DialogTrigger asChild>
          <button
            type="button"
            className="absolute inset-y-0 right-0 z-10 w-14 rounded-r-lg outline-none focus-visible:ring-2 focus-visible:ring-ring"
            aria-label={`Nhập tỷ số trận ${match.number}`}
          />
        </DialogTrigger>
      </div>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Trận {match.number}</DialogTitle>
          <DialogDescription>Nhập tỷ số một ván</DialogDescription>
        </DialogHeader>
        <ScoreInput
          initial={r ? { scoreA: r.scoreA, scoreB: r.scoreB } : null}
          labelA={names(match.teamA)}
          labelB={names(match.teamB)}
          onSave={async (s) => {
            const res = await save({ ...ref, ...s, expectedVersion: r ? r.version : null });
            if (res.ok) setOpen(false);
            return res;
          }}
          onDelete={
            r
              ? async () => {
                  const res = await del(ref);
                  if (res.ok) setOpen(false);
                  return res;
                }
              : undefined
          }
        />
      </DialogContent>
    </Dialog>
  );
}
