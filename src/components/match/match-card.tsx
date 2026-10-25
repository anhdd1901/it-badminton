"use client";
import { useState } from "react";
import { changePlayersAction, deleteResultAction, saveResultAction } from "@/app/_actions/results";
import { MemberTag } from "@/components/member-tag";
import { PlayersInput } from "@/components/match/players-input";
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
import type { PlayerOption, PlayerRef, WeekMatch } from "@/server/views/week";

function Team({
  testId,
  players,
  tone,
  season,
  side,
}: {
  testId: string;
  players: [PlayerRef, PlayerRef];
  tone: "win" | "loss" | "none";
  season: SeasonId;
  side: "left" | "right";
}) {
  const cls = tone === "win" ? "text-win font-semibold" : tone === "loss" ? "text-loss" : "";
  return (
    <div data-testid={testId} className={`flex min-w-0 flex-col gap-2 ${cls}`}>
      {players.map((p) => (
        <MemberTag key={p.id} player={p} season={season} seed={p.seed} side={side} />
      ))}
    </div>
  );
}

// Tỷ số hai đội xếp ngang ở giữa thẻ; lưới bị cắt đứt đúng đoạn này.
const SCORE_W = "w-[4.5rem] sm:w-24";

function ScoreCell({
  result,
  tones,
}: {
  result: { scoreA: number; scoreB: number } | null;
  tones: [string, string];
}) {
  const num = "font-display text-2xl sm:text-[28px] leading-none font-semibold tabular-nums italic";
  return (
    <span className="flex items-center justify-center gap-1 sm:gap-1.5">
      <span data-testid="score-a" className={`${num} ${tones[0]}`}>
        {result?.scoreA ?? "–"}
      </span>
      <span aria-hidden="true" className="text-text-2">
        :
      </span>
      <span data-testid="score-b" className={`${num} ${tones[1]}`}>
        {result?.scoreB ?? "–"}
      </span>
    </span>
  );
}

const names = (t: [PlayerRef, PlayerRef]) => `${t[0].displayName} & ${t[1].displayName}`;

export function MatchCard({
  match,
  editable,
  day,
  scheduleKey,
  season,
  lineup,
}: {
  match: WeekMatch;
  editable: boolean;
  day: string;
  scheduleKey: string;
  season: SeasonId;
  lineup?: { roster: PlayerOption[]; counts: Map<string, number> };
}) {
  const [open, setOpen] = useState(false);
  const { run: save } = useAppAction(saveResultAction);
  const { run: del } = useAppAction(deleteResultAction);
  const { run: change } = useAppAction(changePlayersAction);
  const r = match.result;
  const toneA = !r ? "none" : r.scoreA > r.scoreB ? "win" : "loss";
  const toneB = !r ? "none" : r.scoreB > r.scoreA ? "win" : "loss";
  const scoreTone = (t: string) =>
    t === "win" ? "text-accent-text" : t === "loss" ? "text-loss" : "text-text-2";
  const score = <ScoreCell result={r} tones={[scoreTone(toneA), scoreTone(toneB)]} />;
  const body = (
    <>
      <div className="relative grid min-w-0 flex-1 grid-cols-[1fr_auto_1fr] items-center gap-2">
        <div
          data-testid="net"
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 top-1/2 flex -translate-y-1/2"
        >
          <span className="net flex-1" />
          <span className="w-[5.5rem] shrink-0 sm:w-28" />
          <span className="net flex-1" />
        </div>
        <Team testId="team-a" players={match.teamA} tone={toneA} season={season} side="left" />
        <div className={`${SCORE_W} relative z-10`}>
          {editable ? (
            <DialogTrigger asChild>
              <button
                type="button"
                className="flex min-h-11 w-full items-center justify-center rounded-[6px] outline-none hover:bg-surface-2 focus-visible:ring-2 focus-visible:ring-ring"
                aria-label={`Nhập tỷ số trận ${match.number}`}
              >
                {score}
              </button>
            </DialogTrigger>
          ) : (
            score
          )}
        </div>
        <Team testId="team-b" players={match.teamB} tone={toneB} season={season} side="right" />
      </div>
    </>
  );
  const box =
    "flex w-full items-center gap-3 rounded-lg border border-border bg-surface p-2 text-left text-sm sm:p-3";
  if (!editable) return <div className={box}>{body}</div>;

  const ref = { day, scheduleKey, matchNumber: match.number };
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <div className={`${box} min-h-11`}>{body}</div>
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
        {lineup ? (
          <PlayersInput
            roster={lineup.roster}
            counts={lineup.counts}
            initial={{
              teamA: [match.teamA[0].id, match.teamA[1].id],
              teamB: [match.teamB[0].id, match.teamB[1].id],
            }}
            onSave={async (next) => {
              const res = await change({
                ...ref,
                expected: {
                  teamA: [match.teamA[0].id, match.teamA[1].id],
                  teamB: [match.teamB[0].id, match.teamB[1].id],
                },
                next,
              });
              if (res.ok) setOpen(false);
              return res;
            }}
          />
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
