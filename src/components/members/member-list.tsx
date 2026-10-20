"use client";
import { useState } from "react";
import { MemberAvatar } from "@/components/member-avatar";
import { MemberActions, type ManagedMember } from "@/components/members/member-actions";
import type { Role } from "@/domain/types";
import { formatElo } from "@/ui/format";

const ROLE_LABEL: Record<Role, string> = {
  admin: "Admin",
  subadmin: "Subadmin",
  member: "Mem",
};

export function MemberList({ members, selfId }: { members: ManagedMember[]; selfId: string }) {
  const [openId, setOpenId] = useState<string | null>(null);
  const current = members.find((m) => m.id === openId);

  if (members.length === 0) {
    return <p className="text-text-2">Chưa có mem nào ở mục này.</p>;
  }
  return (
    <>
      <ul className="flex flex-col gap-2">
        {members.map((m) => (
          <li key={m.id}>
            <button
              type="button"
              onClick={() => setOpenId(m.id)}
              className="flex min-h-14 w-full items-center gap-3 rounded-lg border border-border bg-surface p-3 text-left"
            >
              <MemberAvatar member={m} size={40} />
              <span className="min-w-0 flex-1">
                <span className="block truncate font-medium">
                  {m.displayName} (@{m.username})
                </span>
                <span className="block text-sm text-text-2">{ROLE_LABEL[m.role]}</span>
              </span>
              <span className="tabular-nums text-sm">{formatElo(m.eloTenths)}</span>
            </button>
          </li>
        ))}
      </ul>
      {current ? (
        <MemberActions
          key={current.id}
          member={current}
          isSelf={current.id === selfId}
          open
          onOpenChange={(o) => {
            if (!o) setOpenId(null);
          }}
        />
      ) : null}
    </>
  );
}
