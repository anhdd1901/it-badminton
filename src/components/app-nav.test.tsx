// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { AppNav } from "./app-nav";

const pathname = vi.fn(() => "/");
vi.mock("next/navigation", () => ({
  usePathname: () => pathname(),
  useRouter: () => ({ replace: vi.fn(), push: vi.fn(), refresh: vi.fn() }),
}));

const me = {
  id: "m1",
  displayName: "Đức",
  username: "duc",
  avatarUrl: null,
  active: true,
  role: "member" as const,
};

describe("AppNav", () => {
  it("có đủ 5 link đúng href", () => {
    render(<AppNav me={me} />);
    const expected: [string, string][] = [
      ["Tuần này", "/"],
      ["Xếp hạng", "/xep-hang"],
      ["Thống kê", "/thong-ke"],
      ["Lịch sử", "/lich-su"],
      ["Tôi", "/toi"],
    ];
    for (const [name, href] of expected) {
      const links = screen.getAllByRole("link", { name });
      expect(links.length).toBeGreaterThan(0);
      for (const l of links) expect(l).toHaveAttribute("href", href);
    }
  });

  it("đánh dấu mục đang chọn bằng aria-current", () => {
    pathname.mockReturnValue("/xep-hang");
    render(<AppNav me={me} />);
    for (const l of screen.getAllByRole("link", { name: "Xếp hạng" })) {
      expect(l).toHaveAttribute("aria-current", "page");
    }
    for (const l of screen.getAllByRole("link", { name: "Tuần này" })) {
      expect(l).not.toHaveAttribute("aria-current");
    }
  });
});
