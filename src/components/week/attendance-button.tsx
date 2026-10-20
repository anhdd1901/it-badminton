"use client";
import { useRouter } from "next/navigation";
import { useOptimistic, useState, useTransition } from "react";
import { setAttendanceAction } from "@/app/_actions/attendance";
import { Button } from "@/components/ui/button";
import { useAppAction } from "@/components/use-app-action";

export function AttendanceButton({
  memberId,
  attending,
  disabled,
  disabledReason,
}: {
  memberId: string;
  attending: boolean;
  disabled: boolean;
  disabledReason?: string;
}) {
  // `confirmed` follows the server prop but also the last successful action,
  // so the button is right even before the page refresh arrives.
  const [confirmed, setConfirmed] = useState(attending);
  const [seenProp, setSeenProp] = useState(attending);
  if (seenProp !== attending) {
    setSeenProp(attending);
    setConfirmed(attending);
  }
  const [shown, setShown] = useOptimistic(confirmed);
  const [error, setError] = useState<string | null>(null);
  const [, startTransition] = useTransition();
  const router = useRouter();
  const { run } = useAppAction(setAttendanceAction);

  function onClick() {
    if (disabled) return;
    const next = !shown;
    setError(null);
    startTransition(async () => {
      setShown(next);
      const result = await run(memberId, next);
      if (result.ok) setConfirmed(next);
      else {
        setError(result.message);
        if (result.code === "LOCKED") router.refresh();
      }
    });
  }

  return (
    <div className="flex flex-col gap-2">
      <Button
        type="button"
        size="lg"
        variant={shown ? "outline" : "default"}
        disabled={disabled}
        onClick={onClick}
      >
        {shown ? "Hủy điểm danh" : "Điểm danh"}
      </Button>
      {disabled && disabledReason ? <p className="text-sm text-text-2">{disabledReason}</p> : null}
      {error ? (
        <p role="alert" className="text-sm text-danger">
          {error}
        </p>
      ) : null}
    </div>
  );
}
