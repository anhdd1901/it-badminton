"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { checkScore } from "@/domain/score";
import type { ActionResult } from "@/ui/action-result";

export type Scores = { scoreA: number; scoreB: number };

export function ScoreInput({
  initial,
  labelA,
  labelB,
  onSave,
  onDelete,
}: {
  initial: Scores | null;
  labelA: string;
  labelB: string;
  onSave: (scores: Scores) => Promise<ActionResult>;
  onDelete?: () => Promise<ActionResult>;
}) {
  const [a, setA] = useState(initial ? String(initial.scoreA) : "");
  const [b, setB] = useState(initial ? String(initial.scoreB) : "");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const router = useRouter();

  async function finish(call: () => Promise<ActionResult>) {
    setBusy(true);
    try {
      const r = await call();
      if (!r.ok) {
        setError(r.message);
        if (r.code === "CONFLICT" || r.code === "LOCKED") router.refresh();
      }
    } finally {
      setBusy(false);
    }
  }

  function save() {
    setError(null);
    if (a.trim() === "" || b.trim() === "") return setError("Nhập tỷ số cho cả hai cặp");
    const scoreA = /^\d+$/.test(a.trim()) ? Number(a) : NaN;
    const scoreB = /^\d+$/.test(b.trim()) ? Number(b) : NaN;
    const check = checkScore(scoreA, scoreB);
    if (!check.ok) return setError(check.reason);
    void finish(() => onSave({ scoreA, scoreB }));
  }

  return (
    <form
      className="flex flex-col gap-3"
      onSubmit={(e) => {
        e.preventDefault();
        save();
      }}
    >
      <div className="flex flex-col gap-1">
        <Label htmlFor="score-a">{labelA}</Label>
        <Input
          id="score-a"
          inputMode="numeric"
          className="tabular-nums"
          value={a}
          onChange={(e) => setA(e.target.value)}
        />
      </div>
      <div className="flex flex-col gap-1">
        <Label htmlFor="score-b">{labelB}</Label>
        <Input
          id="score-b"
          inputMode="numeric"
          className="tabular-nums"
          value={b}
          onChange={(e) => setB(e.target.value)}
        />
      </div>
      {error ? (
        <p role="alert" className="text-sm text-danger">
          {error}
        </p>
      ) : null}
      <div className="flex gap-2">
        <Button type="submit" size="lg" disabled={busy}>
          Lưu tỷ số
        </Button>
        {onDelete ? (
          <Button
            type="button"
            size="lg"
            variant="outline"
            disabled={busy}
            onClick={() => {
              setError(null);
              void finish(onDelete);
            }}
          >
            Xóa kết quả
          </Button>
        ) : null}
      </div>
    </form>
  );
}
