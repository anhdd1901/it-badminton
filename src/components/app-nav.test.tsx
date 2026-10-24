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
  avatarUrl: null,
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

  it("menu bên: ô icon cùng cỡ avatar, link căn trái cùng lề khối user", () => {
    const { container } = render(<AppNav me={me} />);
    const aside = container.querySelector("aside") as HTMLElement;
    const links = Array.from(aside.querySelectorAll("a"));
    expect(links).toHaveLength(5);
    for (const l of links) {
      expect(l).toHaveClass("justify-start", "px-1");
      expect(l).not.toHaveClass("justify-center");
      expect(l.querySelector('[data-slot="nav-icon"]')).toHaveClass("size-10");
    }
    const userBlock = screen.getByText("Đức").parentElement?.parentElement;
    expect(userBlock).toHaveClass("px-1", "gap-2");
  });

  it("thanh đáy giữ nguyên", () => {
    const { container } = render(<AppNav me={me} />);
    const nav = container.querySelector("nav") as HTMLElement;
    for (const l of Array.from(nav.querySelectorAll("a"))) expect(l).toHaveClass("flex-col");
  });

  it("thanh đáy và menu bên nền chrome", () => {
    const { container } = render(<AppNav me={me} />);
    expect(container.querySelector("nav")).toHaveClass("bg-chrome");
    expect(container.querySelector("aside")).toHaveClass("bg-chrome");
    expect(container.querySelector("nav")).toHaveClass("text-on-chrome");
    expect(container.querySelector("aside")).toHaveClass("text-on-chrome");
  });

  it("mục đang chọn màu chrome-active, có vạch nhấn", () => {
    pathname.mockReturnValue("/xep-hang");
    render(<AppNav me={me} />);
    for (const l of screen.getAllByRole("link", { name: "Xếp hạng" })) {
      expect(l).toHaveClass("text-chrome-active");
      expect(l.querySelector('[data-slot="nav-mark"]')).not.toBeNull();
    }
    for (const l of screen.getAllByRole("link", { name: "Tuần này" })) {
      expect(l).toHaveClass("text-on-chrome");
      expect(l.querySelector('[data-slot="nav-mark"]')).toBeNull();
    }
  });

  it("viền focus nhìn thấy trên nền chrome", () => {
    render(<AppNav me={me} />);
    for (const l of screen.getAllByRole("link")) {
      expect(l).toHaveClass("focus-visible:ring-chrome-active");
      expect(l).not.toHaveClass("focus-visible:ring-ring");
    }
  });
});
