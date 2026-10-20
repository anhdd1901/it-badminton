import { getDb } from "@/app/_lib/db";
import { requireActor } from "@/app/_lib/session";
import { Forbidden } from "@/components/forbidden";
import { MemberForm } from "@/components/members/member-form";
import { MemberList } from "@/components/members/member-list";
import { PillTabs } from "@/components/pill-tabs";
import { listMembers } from "@/server/views/members";
import type { SearchParams } from "@/ui/params";

export default async function ManageMembersPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const actor = await requireActor();
  if (actor.role !== "admin") return <Forbidden />;
  const inactive = (await searchParams)["trang-thai"] === "ngung";
  const members = await listMembers(getDb(), actor, inactive ? "inactive" : "active");

  return (
    <main className="flex flex-col gap-4 p-4">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-xl font-semibold">Quản lý mem</h1>
        <MemberForm />
      </div>
      <PillTabs
        aria-label="Lọc mem"
        items={[
          { href: "/toi/quan-ly-mem", label: "Đang hoạt động", active: !inactive },
          { href: "/toi/quan-ly-mem?trang-thai=ngung", label: "Đã ngưng", active: inactive },
        ]}
      />
      <MemberList members={members} selfId={actor.memberId} />
    </main>
  );
}
