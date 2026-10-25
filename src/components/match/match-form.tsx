"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import type { AvatarMember } from "@/components/member-avatar";
import { MemberPill, PILL_ITEM_CLASS, PILL_TRIGGER_CLASS } from "@/components/member-pill";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { LINEUP_INVALID } from "@/domain/lineup";
import { checkScore } from "@/domain/score";
import type { ActionResult } from "@/ui/action-result";

type Pair = [string, string];
export type LineupIds = { teamA: Pair; teamB: Pair };
export type Scores = { scoreA: number; scoreB: number };
type Person = AvatarMember & { username?: never };
type TeamKey = "teamA" | "teamB";

const TEAMS = [
  { key: "teamA", name: "Cặp A" },
  { key: "teamB", name: "Cặp B" },
] as const;

const ids = (a: [Person, Person], b: [Person, Person]): LineupIds => ({
  teamA: [a[0].id, a[1].id],
  teamB: [b[0].id, b[1].id],
});
const flat = (l: LineupIds) => [...l.teamA, ...l.teamB];

/** Popup "Trận N": chọn mem từng cặp, nhập tỷ số, một nút lưu cả hai (spec 4.6, 4.6a). */
export function MatchForm({
  teamA,
  teamB,
  initialScores,
  lineup,
  onSaveScores,
  onChangePlayers,
  onDelete,
  onDone,
}: {
  teamA: [Person, Person];
  teamB: [Person, Person];
  initialScores: Scores | null;
  /** Chỉ admin có: danh sách mem để đổi người. */
  lineup?: { roster: Person[]; counts: Map<string, number> };
  onSaveScores: (scores: Scores) => Promise<ActionResult>;
  onChangePlayers: (next: LineupIds) => Promise<ActionResult>;
  onDelete?: () => Promise<ActionResult>;
  onDone: () => void;
}) {
  const initial = ids(teamA, teamB);
  const [picked, setPicked] = useState<LineupIds>(initial);
  // After a refresh brings a new server lineup, drop stale picks so a retry is a deliberate re-entry.
  const initialKey = flat(initial).join("|");
  const [seenKey, setSeenKey] = useState(initialKey);
  if (seenKey !== initialKey) {
    setSeenKey(initialKey);
    setPicked(initial);
  }
  const [a, setA] = useState(initialScores ? String(initialScores.scoreA) : "");
  const [b, setB] = useState(initialScores ? String(initialScores.scoreB) : "");
  const [error, setError] = useState<string | null>(null);
  // Whether the message is about the scores (marks the score inputs) or about the lineup.
  const [onScores, setOnScores] = useState(true);
  const fail = (message: string, scores: boolean) => {
    setOnScores(scores);
    setError(message);
  };
  const [busy, setBusy] = useState(false);
  const router = useRouter();

  const byId = new Map<string, Person>(
    [...(lineup?.roster ?? []), ...teamA, ...teamB].map((p) => [p.id, p]),
  );
  const distinct = new Set(flat(picked)).size === 4;
  const lineupChanged = flat(picked).some((id, i) => id !== flat(initial)[i]);
  const shownError = lineup && !distinct ? LINEUP_INVALID : error;

  function choose(team: TeamKey, index: 0 | 1, id: string) {
    setError(null);
    setPicked((l) => {
      const pair: Pair = [...l[team]];
      pair[index] = id;
      return { ...l, [team]: pair };
    });
  }

  /** Returns false (after showing the message) when the server refused. */
  async function step(
    call: () => Promise<ActionResult>,
    partial: boolean,
    scores: boolean,
  ): Promise<boolean> {
    const r = await call();
    if (r.ok) return true;
    fail(r.message, scores);
    if (r.code === "CONFLICT" || r.code === "LOCKED") {
      // Drop the typed values: after the refresh the version is fresh, so a
      // retry must be a deliberate re-entry, never a silent overwrite.
      setA("");
      setB("");
      // After a saved lineup the refresh brings exactly `picked`; resetting to the old one would flash stale names.
      if (!partial) setPicked(initial);
    }
    if (r.code === "CONFLICT" || r.code === "LOCKED" || partial) router.refresh();
    return false;
  }

  async function run(work: () => Promise<boolean>) {
    setBusy(true);
    try {
      if (await work()) onDone();
    } finally {
      setBusy(false);
    }
  }

  function save() {
    setError(null);
    if (lineup && !distinct) return;
    const typed = a.trim() !== "" || b.trim() !== "";
    // Empty scores are fine only when the lineup alone is being changed.
    if (!typed && !lineupChanged) {
      if (initialScores) return onDone();
      return fail("Nhập tỷ số cho cả hai cặp", true);
    }
    let scores: Scores | null = null;
    if (typed || !lineupChanged) {
      if (a.trim() === "" || b.trim() === "") return fail("Nhập tỷ số cho cả hai cặp", true);
      const scoreA = /^\d+$/.test(a.trim()) ? Number(a) : NaN;
      const scoreB = /^\d+$/.test(b.trim()) ? Number(b) : NaN;
      const check = checkScore(scoreA, scoreB);
      if (!check.ok) return fail(check.reason, true);
      scores = { scoreA, scoreB };
    }
    const scoresChanged =
      scores !== null &&
      (!initialScores ||
        initialScores.scoreA !== scores.scoreA ||
        initialScores.scoreB !== scores.scoreB);
    void run(async () => {
      if (lineupChanged && !(await step(() => onChangePlayers(picked), false, false))) return false;
      if (scores && scoresChanged) {
        const s = scores;
        return step(() => onSaveScores(s), lineupChanged, true);
      }
      return true;
    });
  }

  const invalid = error && onScores ? true : undefined;
  const describedBy = error && onScores ? "score-error" : undefined;
  const scoreInput = (id: string, label: string, value: string, set: (v: string) => void) => (
    <Input
      id={id}
      aria-label={label}
      inputMode="numeric"
      className="tabular-nums"
      aria-invalid={invalid}
      aria-describedby={describedBy}
      value={value}
      onChange={(e) => set(e.target.value)}
    />
  );

  return (
    <form
      className="flex flex-col gap-4"
      onSubmit={(e) => {
        e.preventDefault();
        save();
      }}
    >
      {TEAMS.map(({ key, name }) => {
        const shown = key === "teamA" ? teamA : teamB;
        return (
          <div key={key} className="flex flex-col gap-2">
            <div className="grid grid-cols-2 gap-2">
              {([0, 1] as const).map((i) => {
                const person = byId.get(picked[key][i]);
                return lineup ? (
                  <Select key={i} value={picked[key][i]} onValueChange={(id) => choose(key, i, id)}>
                    <SelectTrigger
                      aria-label={`${name}, người ${i + 1}`}
                      aria-invalid={!distinct ? true : undefined}
                      className={`w-full min-w-0 px-1.5 text-base data-[size=default]:h-11 md:text-sm ${PILL_TRIGGER_CLASS}`}
                    >
                      <SelectValue>
                        {person ? <MemberPill plain player={person} /> : null}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      {lineup.roster.map((p) => (
                        <SelectItem key={p.id} value={p.id} className={PILL_ITEM_CLASS}>
                          <MemberPill
                            plain
                            className="pr-6"
                            player={p}
                            note={`${lineup.counts.get(p.id) ?? 0} trận`}
                          />
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <div key={i} className="flex min-h-11 min-w-0 items-center">
                    <MemberPill player={shown[i]} />
                  </div>
                );
              })}
            </div>
            {scoreInput(
              key === "teamA" ? "score-a" : "score-b",
              `Tỷ số cặp ${key === "teamA" ? "A" : "B"}`,
              key === "teamA" ? a : b,
              key === "teamA" ? setA : setB,
            )}
          </div>
        );
      })}
      {shownError ? (
        <p id="score-error" role="alert" className="text-sm text-danger">
          {shownError}
        </p>
      ) : null}
      <div className="flex items-center gap-2">
        {onDelete ? (
          <Button
            type="button"
            size="lg"
            variant="outline"
            disabled={busy}
            onClick={() => {
              setError(null);
              void run(() => step(onDelete, false, true));
            }}
          >
            Xóa kết quả
          </Button>
        ) : null}
        <Button type="submit" size="lg" className="ml-auto" disabled={busy}>
          Lưu kết quả
        </Button>
      </div>
    </form>
  );
}
