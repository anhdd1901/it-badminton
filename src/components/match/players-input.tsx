"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { LINEUP_INVALID } from "@/domain/lineup";
import type { PlayerOption } from "@/server/views/week";
import type { ActionResult } from "@/ui/action-result";

type Pair = [string, string];
export type LineupIds = { teamA: Pair; teamB: Pair };

const SLOTS = [
  { team: "teamA", index: 0, label: "Cặp A, người 1" },
  { team: "teamA", index: 1, label: "Cặp A, người 2" },
  { team: "teamB", index: 0, label: "Cặp B, người 1" },
  { team: "teamB", index: 1, label: "Cặp B, người 2" },
] as const;

const flat = (l: LineupIds) => [...l.teamA, ...l.teamB];

export function PlayersInput({
  roster,
  counts,
  initial,
  onSave,
}: {
  roster: PlayerOption[];
  counts: Map<string, number>;
  initial: LineupIds;
  onSave: (next: LineupIds) => Promise<ActionResult>;
}) {
  const [lineup, setLineup] = useState<LineupIds>(initial);
  // After a refresh brings a new server lineup, drop stale picks so a retry is a deliberate re-entry.
  const initialKey = flat(initial).join("|");
  const [seenKey, setSeenKey] = useState(initialKey);
  if (seenKey !== initialKey) {
    setSeenKey(initialKey);
    setLineup(initial);
  }
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const router = useRouter();

  const ids = flat(lineup);
  const distinct = new Set(ids).size === 4;
  const changed = ids.some((id, i) => id !== flat(initial)[i]);

  function choose(team: "teamA" | "teamB", index: 0 | 1, id: string) {
    setError(null);
    setLineup((l) => {
      const pair: Pair = [...l[team]];
      pair[index] = id;
      return { ...l, [team]: pair };
    });
  }

  async function save() {
    setError(null);
    setBusy(true);
    try {
      const r = await onSave(lineup);
      if (!r.ok) {
        setError(r.message);
        if (r.code === "CONFLICT" || r.code === "LOCKED") router.refresh();
      }
    } finally {
      setBusy(false);
    }
  }

  const shownError = !distinct ? LINEUP_INVALID : error;

  return (
    <section className="flex flex-col gap-3 border-t border-border pt-3">
      <h3 className="font-semibold">Người chơi</h3>
      {(["teamA", "teamB"] as const).map((team) => (
        <div key={team} className="flex flex-col gap-2">
          <p className="text-sm text-text-2">{team === "teamA" ? "Cặp A" : "Cặp B"}</p>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {SLOTS.filter((s) => s.team === team).map((s) => (
              <Select
                key={s.label}
                value={lineup[team][s.index]}
                onValueChange={(id) => choose(team, s.index, id)}
              >
                <SelectTrigger
                  aria-label={s.label}
                  aria-invalid={!distinct ? true : undefined}
                  className="w-full min-w-0 text-base data-[size=default]:h-11 md:text-sm"
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {roster.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {`${p.displayName} · ${counts.get(p.id) ?? 0} trận`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ))}
          </div>
        </div>
      ))}
      {shownError ? (
        <p role="alert" className="text-sm text-danger">
          {shownError}
        </p>
      ) : null}
      <Button
        type="button"
        size="lg"
        className="self-start"
        disabled={busy || !changed || !distinct}
        onClick={() => void save()}
      >
        Lưu người chơi
      </Button>
    </section>
  );
}
