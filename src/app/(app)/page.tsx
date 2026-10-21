import { now } from "@/app/_lib/clock";
import { getDb } from "@/app/_lib/db";
import { requireActor } from "@/app/_lib/session";
import { DeleteAllResults } from "@/components/match/delete-all-results";
import { MatchCard } from "@/components/match/match-card";
import { PlayerFocusProvider } from "@/components/player-focus";
import { seasonOf } from "@/domain/time";
import { AttendanceButton } from "@/components/week/attendance-button";
import { RosterDialog } from "@/components/week/roster-dialog";
import { WeekHeader } from "@/components/week/week-header";
import { WeekNotice } from "@/components/week/week-notice";
import { getWeekView } from "@/server/views/week";

export default async function ThisWeekPage() {
  const actor = await requireActor();
  const view = await getWeekView(getDb(), actor, now());
  const { can, schedule } = view;
  const disabledReason =
    view.status === "locked"
      ? "Buổi đấu đã khóa, không thể thay đổi điểm danh"
      : view.status === "closed"
        ? "Đã đóng điểm danh lúc 12:00"
        : "Chưa mở điểm danh";

  return (
    <main className="flex flex-col gap-4 p-4">
      <WeekHeader day={view.day} status={view.status}>
        <RosterDialog
          attendees={view.attendees.map((a) => a.member)}
          activeMemberCount={view.activeMemberCount}
          canManage={can.manageAttendance}
          canChange={can.changeOwnAttendance}
        />
      </WeekHeader>
      {can.changeOwnAttendance || view.actorAttending ? (
        <AttendanceButton
          memberId={actor.memberId}
          attending={view.actorAttending}
          disabled={!can.changeOwnAttendance}
          disabledReason={disabledReason}
        />
      ) : null}
      {view.notice ? <WeekNotice notice={view.notice} /> : null}
      {schedule ? (
        <PlayerFocusProvider>
          <section className="flex flex-col gap-2">
            {schedule.source === "draft" ? (
              <span className="text-xs text-text-2">Lịch nháp</span>
            ) : null}
            {schedule.matches.map((m) => (
              <MatchCard
                key={m.number}
                match={m}
                editable={can.editResults}
                day={view.day}
                scheduleKey={schedule.key}
                season={seasonOf(view.day)}
              />
            ))}
            {can.editResults && schedule.matches.some((m) => m.result) ? (
              <DeleteAllResults day={view.day} scheduleKey={schedule.key} />
            ) : null}
          </section>
        </PlayerFocusProvider>
      ) : null}
    </main>
  );
}
