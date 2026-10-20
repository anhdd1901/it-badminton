"use client";
import { useState } from "react";
import { toast } from "sonner";
import { createMemberAction } from "@/app/_actions/members";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAppAction } from "@/components/use-app-action";
import { MAX_AVATAR_BYTES } from "@/ui/avatar";

const TOO_LARGE = "Ảnh tối đa 5 MB";

export function MemberForm() {
  const [open, setOpen] = useState(false);
  const [usernameError, setUsernameError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { run, pending } = useAppAction(createMemberAction);

  function onOpenChange(o: boolean) {
    setOpen(o);
    if (!o) {
      setUsernameError(null);
      setError(null);
    }
  }

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setUsernameError(null);
    setError(null);
    const form = new FormData(e.currentTarget);
    const file = form.get("file");
    if (file instanceof File && file.size > MAX_AVATAR_BYTES) {
      setError(TOO_LARGE);
      return;
    }
    if (file instanceof File && file.size === 0) form.delete("file");
    const result = await run(form);
    if (result.ok) {
      toast.success("Đã thêm mem");
      setOpen(false);
    } else if (result.code === "CONFLICT") {
      setUsernameError(result.message);
    } else {
      setError(result.message);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        <Button type="button">Thêm mem</Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90dvh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Thêm mem</DialogTitle>
        </DialogHeader>
        <form onSubmit={onSubmit} className="flex flex-col gap-3">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="new-display-name">Tên hiển thị</Label>
            <Input id="new-display-name" name="displayName" autoComplete="off" required />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="new-username">Tên đăng nhập</Label>
            <Input
              id="new-username"
              name="username"
              autoComplete="off"
              autoCapitalize="none"
              required
              aria-invalid={usernameError ? true : undefined}
              aria-describedby={usernameError ? "new-username-error" : undefined}
            />
            {usernameError ? (
              <p id="new-username-error" role="alert" className="text-sm text-danger">
                {usernameError}
              </p>
            ) : null}
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="new-password">Mật khẩu</Label>
            <Input
              id="new-password"
              name="password"
              type="text"
              autoComplete="off"
              autoCapitalize="none"
              required
            />
            <p className="text-xs text-text-2">Tối thiểu 8 ký tự. Gửi cho mem sau khi tạo.</p>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="new-elo">ELO ban đầu</Label>
            <Input
              id="new-elo"
              name="initialElo"
              inputMode="decimal"
              autoComplete="off"
              defaultValue="1000"
              required
            />
            <p className="text-xs text-text-2">
              Số lớn hơn 0, tối đa 5000, tối đa 1 chữ số thập phân (ví dụ 1000 hoặc 1016,8).
            </p>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="new-avatar">Ảnh đại diện (tùy chọn)</Label>
            <Input
              id="new-avatar"
              name="file"
              type="file"
              accept="image/jpeg,image/png,image/webp"
            />
          </div>
          {error ? (
            <p role="alert" className="text-sm text-danger">
              {error}
            </p>
          ) : null}
          <Button type="submit" disabled={pending}>
            Thêm mem
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
