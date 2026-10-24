import { describe, expect, it } from "vitest";
import { AVATAR_COLORS, avatarColor, avatarInitial } from "./avatar";
import { contrastRatio } from "./contrast";

describe("avatar", () => {
  it("dải màu khớp spec 8.1, không có xanh lá hay xanh ngọc", () => {
    expect(AVATAR_COLORS).toEqual([
      "#C2185B",
      "#7B1FA2",
      "#4527A0",
      "#1565C0",
      "#455A64",
      "#B71C1C",
      "#AD4A00",
      "#5D4037",
    ]);
  });

  it("lấy chữ cái đầu, viết hoa theo tiếng Việt", () => {
    expect(avatarInitial("đức anh")).toBe("Đ");
    expect(avatarInitial("  ánh")).toBe("Á");
    expect(avatarInitial("ánh")).toBe("Á");
    expect(avatarInitial("ánh")).toBe("Á"); // NFD
  });

  it("màu cố định theo id và nằm trong dải màu", () => {
    const id = "3f1c2a9e-7b4d-4c1a-9e55-0a1b2c3d4e5f";
    expect(avatarColor(id)).toBe(avatarColor(id));
    expect(AVATAR_COLORS).toContain(avatarColor(id));
  });

  it("mọi màu avatar đạt 4,5:1 với chữ trắng", () => {
    for (const c of AVATAR_COLORS)
      expect(contrastRatio("#FFFFFF", c), c).toBeGreaterThanOrEqual(4.5);
  });
});
