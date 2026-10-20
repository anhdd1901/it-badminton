"use client";
import { useState } from "react";
import { updateDisplayNameAction } from "@/app/_actions/profile";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAppAction } from "@/components/use-app-action";

export function DisplayNameForm({
  memberId,
  displayName,
}: {
  memberId: string;
  displayName: string;
}) {
  const [value, setValue] = useState(displayName);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const { run, pending } = useAppAction(updateDisplayNameAction);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setDone(false);
    const result = await run(memberId, value);
    if (result.ok) setDone(true);
    else setError(result.message);
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-3">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="display-name">Tên hiển thị</Label>
        <Input
          id="display-name"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          autoComplete="off"
          required
        />
      </div>
      {error ? (
        <p role="alert" className="text-sm text-danger">
          {error}
        </p>
      ) : null}
      {done ? (
        <p role="status" className="text-sm text-win">
          Đã lưu tên
        </p>
      ) : null}
      <Button type="submit" disabled={pending} className="self-start">
        Lưu tên
      </Button>
    </form>
  );
}
