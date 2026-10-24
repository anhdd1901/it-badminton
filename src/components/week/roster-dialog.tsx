"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { getRosterAction, setAttendanceAction } from "@/app/_actions/attendance";
import { MemberAvatar } from "@/components/member-avatar";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useAppAction } from "@/components/use-app-action";
import type { PlayerRef } from "@/server/views/week";
import type { MemberRef } from "@/server/views/rankings";

type Row = { member: MemberRef; attending: boolean };

export function RosterDialog({
  attendees,
  activeMemberCount,
  canManage,
  canChange,
}: {
  attendees: PlayerRef[];
  activeMemberCount: number;
  canManage: boolean;
  /** Whether attendance can still be changed (open window). */
  canChange: boolean;
}) {
  const [rows, setRows] = useState<Row[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const [busyId, setBusyId] = useState<string | null>(null);
  const { run: loadRoster } = useAppAction(getRosterAction);
  const { run: setAttendance } = useAppAction(setAttendanceAction);

  async function load() {
    setLoading(true);
    const r = await loadRoster();
    setLoading(false);
    if (r.ok) {
      setRows(r.data);
      setError(null);
    } else setError(r.message);
  }

  async function toggle(row: Row) {
    setBusyId(row.member.id);
    setError(null);
    const r = await setAttendance(row.member.id, !row.attending);
    setBusyId(null);
    if (!r.ok) {
      setError(r.message);
      if (r.code === "LOCKED") router.refresh();
      return;
    }
    setRows((cur) =>
      cur
        ? cur.map((x) => (x.member.id === row.member.id ? { ...x, attending: !x.attending } : x))
        : cur,
    );
  }

  return (
    <Dialog
      onOpenChange={(open) => {
        if (open) {
          if (canManage) void load();
        } else {
          setError(null);
          setRows(null);
        }
      }}
    >
      <DialogTrigger asChild>
        <button
          type="button"
          className="min-h-11 self-start rounded-sm text-left text-sm text-on-chrome underline outline-none focus-visible:ring-2 focus-visible:ring-chrome-active"
        >
          {attendees.length} đã điểm danh / {activeMemberCount} mem
        </button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Danh sách điểm danh</DialogTitle>
          <DialogDescription>
            {attendees.length} đã điểm danh / {activeMemberCount} mem
          </DialogDescription>
        </DialogHeader>
        {error ? (
          <p role="alert" className="text-sm text-danger">
            {error}
          </p>
        ) : null}
        {canManage && loading && !rows ? (
          <p className="text-sm text-text-2">Đang tải danh sách…</p>
        ) : canManage ? (
          <ul className="flex max-h-[60vh] flex-col gap-1 overflow-y-auto">
            {(rows ?? []).map((row) => (
              <li key={row.member.id} className="flex items-center gap-3 py-1">
                <MemberAvatar member={row.member} size={32} />
                <span className="min-w-0 flex-1 truncate text-sm">
                  {row.member.displayName} (@{row.member.username})
                </span>
                <Button
                  type="button"
                  size="sm"
                  variant={row.attending ? "outline" : "default"}
                  aria-label={`${row.attending ? "Hủy điểm danh" : "Điểm danh"} ${row.member.displayName}`}
                  disabled={!canChange || busyId === row.member.id}
                  onClick={() => void toggle(row)}
                >
                  {row.attending ? "Hủy điểm danh" : "Điểm danh"}
                </Button>
              </li>
            ))}
          </ul>
        ) : attendees.length === 0 ? (
          <p className="text-sm text-text-2">Chưa có ai điểm danh</p>
        ) : (
          <ul className="flex max-h-[60vh] flex-col gap-1 overflow-y-auto">
            {attendees.map((p) => (
              <li key={p.id} className="flex items-center gap-3 py-1">
                <MemberAvatar member={p} size={32} />
                <span className="text-sm">{p.displayName}</span>
              </li>
            ))}
          </ul>
        )}
      </DialogContent>
    </Dialog>
  );
}
