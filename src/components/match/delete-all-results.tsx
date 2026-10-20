"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { deleteAllResultsAction } from "@/app/_actions/results";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useAppAction } from "@/components/use-app-action";

export function DeleteAllResults({ day, scheduleKey }: { day: string; scheduleKey: string }) {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const { run, pending } = useAppAction(deleteAllResultsAction);

  async function confirm() {
    setError(null);
    const r = await run({ day, scheduleKey });
    if (r.ok) return setOpen(false);
    setError(r.message);
    if (r.code === "CONFLICT" || r.code === "LOCKED") router.refresh();
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        if (!o) setError(null);
      }}
    >
      <DialogTrigger asChild>
        <Button type="button" variant="outline" size="lg">
          Xóa hết kết quả buổi này
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Xóa hết kết quả buổi này?</DialogTitle>
          <DialogDescription>
            Xóa hết kết quả buổi này? Buổi sẽ mở lại điểm danh nếu trước 12:00 thứ 7.
          </DialogDescription>
        </DialogHeader>
        {error ? (
          <p role="alert" className="text-sm text-danger">
            {error}
          </p>
        ) : null}
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => setOpen(false)}>
            Hủy
          </Button>
          <Button type="button" disabled={pending} onClick={() => void confirm()}>
            Xóa hết
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
