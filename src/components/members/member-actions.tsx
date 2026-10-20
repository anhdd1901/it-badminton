"use client";
import { useState } from "react";
import { toast } from "sonner";
import {
  adjustEloAction,
  changeUsernameAction,
  resetPasswordAction,
  setActiveAction,
  setSubadminAction,
  transferAdminAction,
} from "@/app/_actions/members";
import { DisplayNameForm } from "@/components/profile/display-name-form";
import { AvatarForm } from "@/components/profile/avatar-form";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAppAction } from "@/components/use-app-action";
import type { Role } from "@/domain/types";
import type { ActionResult } from "@/ui/action-result";
import { eloInputValue } from "@/ui/format";

export type ManagedMember = {
  id: string;
  displayName: string;
  username: string;
  avatarUrl: string | null;
  active: boolean;
  role: Role;
  eloTenths: number;
};

function FieldForm({
  id,
  label,
  initial,
  hint,
  submit,
  onSubmit,
  clearOnSuccess,
  inputMode,
  secret,
}: {
  id: string;
  label: string;
  initial: string;
  hint?: string;
  submit: string;
  onSubmit: (value: string) => Promise<ActionResult>;
  clearOnSuccess?: boolean;
  inputMode?: "decimal";
  secret?: boolean;
}) {
  const [value, setValue] = useState(initial);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const { run } = useAppAction(async (v: string) => onSubmit(v));

  async function submitForm(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setPending(true);
    try {
      const result = await run(value);
      if (result.ok) {
        toast.success("Đã lưu");
        if (clearOnSuccess) setValue("");
      } else setError(result.message);
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={submitForm} className="flex flex-col gap-1.5">
      <Label htmlFor={id}>{label}</Label>
      <div className="flex gap-2">
        <Input
          id={id}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          autoComplete="off"
          autoCapitalize="none"
          inputMode={inputMode}
          type={secret ? "password" : "text"}
          required
        />
        <Button type="submit" variant="outline" disabled={pending}>
          {submit}
        </Button>
      </div>
      {hint ? <p className="text-xs text-text-2">{hint}</p> : null}
      {error ? (
        <p role="alert" className="text-sm text-danger">
          {error}
        </p>
      ) : null}
    </form>
  );
}

type View = "menu" | "deactivate" | "transfer";

export function MemberActions({
  member,
  isSelf,
  open,
  onOpenChange,
}: {
  member: ManagedMember;
  isSelf: boolean;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [view, setView] = useState<View>("menu");
  const [error, setError] = useState<string | null>(null);
  const [password, setPassword] = useState("");
  const toggleActive = useAppAction(setActiveAction);
  const toggleSubadmin = useAppAction(setSubadminAction);
  const transfer = useAppAction(transferAdminAction);

  function change(o: boolean) {
    onOpenChange(o);
    if (!o) {
      setView("menu");
      setError(null);
      setPassword("");
    }
  }

  function goto(v: View) {
    setError(null);
    setPassword("");
    setView(v);
  }

  async function onActive(active: boolean) {
    setError(null);
    const r = await toggleActive.run(member.id, active);
    if (r.ok) {
      toast.success("Đã lưu");
      change(false);
    } else setError(r.message);
  }

  async function onSubadmin() {
    setError(null);
    const r = await toggleSubadmin.run(member.id, member.role !== "subadmin");
    if (r.ok) toast.success("Đã lưu");
    else setError(r.message);
  }

  async function onTransfer(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const r = await transfer.run(member.id, password);
    // Success redirects to /toi (the navigation unmounts this screen).
    if (!r.ok) setError(r.message);
  }

  const busy = toggleActive.pending || toggleSubadmin.pending || transfer.pending;
  const errorNode = error ? (
    <p role="alert" className="text-sm text-danger">
      {error}
    </p>
  ) : null;

  return (
    <Dialog open={open} onOpenChange={change}>
      <DialogContent className="max-h-[90dvh] overflow-y-auto">
        {view === "menu" ? (
          <>
            <DialogHeader>
              <DialogTitle>
                {member.displayName} (@{member.username})
              </DialogTitle>
              <DialogDescription className="sr-only">Thao tác với mem này</DialogDescription>
            </DialogHeader>
            <div className="flex flex-col gap-4">
              <DisplayNameForm memberId={member.id} displayName={member.displayName} />
              <FieldForm
                id="manage-username"
                label="Tên đăng nhập"
                initial={member.username}
                submit="Lưu"
                onSubmit={(v) => changeUsernameAction(member.id, v)}
              />
              <AvatarForm member={member} />
              <FieldForm
                id="manage-password"
                label="Mật khẩu mới"
                initial=""
                hint="Tối thiểu 8 ký tự. Mem sẽ bị đăng xuất khỏi mọi thiết bị."
                submit="Đặt lại"
                clearOnSuccess
                secret
                onSubmit={(v) => resetPasswordAction(member.id, v)}
              />
              <FieldForm
                id="manage-elo"
                label="ELO hiện tại"
                initial={eloInputValue(member.eloTenths)}
                hint="Số lớn hơn 0, tối đa 5000, tối đa 1 chữ số thập phân (ví dụ 1016,8)."
                submit="Điều chỉnh"
                inputMode="decimal"
                onSubmit={(v) => adjustEloAction(member.id, v)}
              />
              {!isSelf && member.active ? (
                <Button
                  type="button"
                  variant="outline"
                  disabled={busy}
                  onClick={() => void onSubadmin()}
                >
                  {member.role === "subadmin" ? "Gỡ subadmin" : "Đặt làm subadmin"}
                </Button>
              ) : null}
              {!isSelf && !member.active ? (
                <Button type="button" disabled={busy} onClick={() => void onActive(true)}>
                  Kích hoạt lại
                </Button>
              ) : null}
              {!isSelf && member.active ? (
                <Button type="button" variant="outline" onClick={() => goto("deactivate")}>
                  Ngưng hoạt động
                </Button>
              ) : null}
              {!isSelf && member.active ? (
                <Button type="button" variant="outline" onClick={() => goto("transfer")}>
                  Chuyển quyền admin
                </Button>
              ) : null}
              {errorNode}
            </div>
          </>
        ) : null}
        {view === "deactivate" ? (
          <>
            <DialogHeader>
              <DialogTitle>Ngưng hoạt động {member.displayName}?</DialogTitle>
              <DialogDescription>
                Ngưng hoạt động {member.displayName}? Mem sẽ bị đăng xuất khỏi mọi thiết bị.
              </DialogDescription>
            </DialogHeader>
            {errorNode}
            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <Button type="button" variant="outline" onClick={() => goto("menu")}>
                Hủy
              </Button>
              <Button type="button" disabled={busy} onClick={() => void onActive(false)}>
                Ngưng hoạt động
              </Button>
            </div>
          </>
        ) : null}
        {view === "transfer" ? (
          <form onSubmit={onTransfer} className="flex flex-col gap-4">
            <DialogHeader>
              <DialogTitle>Chuyển quyền admin cho {member.displayName}?</DialogTitle>
              <DialogDescription>
                Chuyển quyền admin cho {member.displayName}? Bạn sẽ trở thành mem thường.
              </DialogDescription>
            </DialogHeader>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="transfer-password">Mật khẩu của bạn</Label>
              <Input
                id="transfer-password"
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
            {errorNode}
            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <Button type="button" variant="outline" onClick={() => goto("menu")}>
                Hủy
              </Button>
              <Button type="submit" disabled={busy}>
                Chuyển quyền
              </Button>
            </div>
          </form>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
