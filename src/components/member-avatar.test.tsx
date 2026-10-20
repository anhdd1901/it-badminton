// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { avatarColor } from "@/ui/avatar";
import { MemberAvatar } from "./member-avatar";

describe("MemberAvatar", () => {
  it("không có ảnh: chữ cái đầu trên màu theo mem", () => {
    render(<MemberAvatar member={{ id: "abc", displayName: "Đức", avatarUrl: null }} size={40} />);
    const el = screen.getByText("Đ");
    const root = el.closest("[data-slot='avatar']") as HTMLElement;
    const probe = document.createElement("div");
    probe.style.backgroundColor = avatarColor("abc");
    expect(root.style.backgroundColor).toBe(probe.style.backgroundColor);
  });

  it("có ảnh: img với alt là tên", () => {
    render(
      <MemberAvatar member={{ id: "abc", displayName: "Đức", avatarUrl: "/a.png" }} size={32} />,
    );
    expect(screen.getByRole("img", { name: "Đức" })).toHaveAttribute("src", "/a.png");
  });
});
