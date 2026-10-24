import { avatarColor, avatarInitial } from "@/ui/avatar";

export type AvatarMember = { id: string; displayName: string; avatarUrl: string | null };

const TEXT_SIZE = {
  24: "text-xs",
  32: "text-sm",
  40: "text-base",
  56: "text-xl",
  64: "text-2xl",
} as const;

export function MemberAvatar({
  member,
  size,
}: {
  member: AvatarMember;
  size: 24 | 32 | 40 | 56 | 64;
}) {
  const box =
    "inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full border-2 border-surface";
  if (member.avatarUrl) {
    return (
      <span data-slot="avatar" className={box} style={{ width: size, height: size }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={member.avatarUrl}
          alt={member.displayName}
          width={size}
          height={size}
          className="size-full object-cover"
        />
      </span>
    );
  }
  return (
    <span
      data-slot="avatar"
      aria-hidden="true"
      className={`${box} font-semibold text-white ${TEXT_SIZE[size]}`}
      // The one allowed inline colour: fixed per member (spec 8.1).
      style={{ width: size, height: size, backgroundColor: avatarColor(member.id) }}
    >
      {avatarInitial(member.displayName)}
    </span>
  );
}
