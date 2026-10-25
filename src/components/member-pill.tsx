import { cn } from "@/lib/utils";
import { MemberAvatar, type AvatarMember } from "@/components/member-avatar";

// Select shadcn mặc định co theo nội dung: hai lớp này cho tag giãn hết ô và hết mục.
export const PILL_TRIGGER_CLASS =
  "*:data-[slot=select-value]:min-w-0 *:data-[slot=select-value]:flex-1";
// pr-2 thay pr-8 mặc định; tag tự chừa chỗ cho dấu tick bằng pr-6.
export const PILL_ITEM_CLASS = "pr-2 *:[span]:last:min-w-0 *:[span]:last:flex-1";

// Viên thuốc avatar + tên như MemberTag, không bấm được: dùng trong ô và danh sách chọn mem.
// `note` (số trận, "đã ngưng"…) đứng ngay cạnh tên, màu mờ hơn.
export function MemberPill({
  player,
  note,
  plain,
  className,
}: {
  player: AvatarMember & { username?: never };
  note?: string;
  /** Không nền: dùng cho mục trong danh sách chọn. */
  plain?: boolean;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "flex h-8 w-full min-w-0 items-center gap-1.5 text-sm",
        plain ? "pr-0" : "rounded-full bg-surface-2 pr-3",
        className,
      )}
    >
      <span aria-hidden="true" className="inline-flex">
        <MemberAvatar member={player} size={32} />
      </span>
      <span className="min-w-0 truncate">
        {player.displayName}
        {note ? (
          <>
            {" "}
            <span className="text-text-2/70">{`· ${note}`}</span>
          </>
        ) : null}
      </span>
    </span>
  );
}
