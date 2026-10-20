export const AVATAR_COLORS: readonly string[] = [
  "#C2185B",
  "#7B1FA2",
  "#4527A0",
  "#1565C0",
  "#00695C",
  "#2E7D32",
  "#AD4A00",
  "#5D4037",
];

/** Chữ cái đầu của tên hiển thị, viết hoa theo tiếng Việt. */
export function avatarInitial(displayName: string): string {
  const first = Array.from(displayName.normalize("NFC").trim())[0] ?? "";
  return first.toLocaleUpperCase("vi");
}

/** Màu nền cố định theo mem: FNV-1a 32-bit trên id. */
export function avatarColor(memberId: string): string {
  let hash = 0x811c9dc5;
  for (let i = 0; i < memberId.length; i++) {
    hash ^= memberId.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return AVATAR_COLORS[hash % AVATAR_COLORS.length];
}
