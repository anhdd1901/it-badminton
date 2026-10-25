// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { MemberPill } from "./member-pill";

afterEach(cleanup);
const player = { id: "a", displayName: "An", avatarUrl: null };

describe("MemberPill", () => {
  it("mặc định là viên thuốc có nền, kéo dài hết chiều ngang", () => {
    const { container } = render(<MemberPill player={player} />);
    const cls = (container.firstElementChild as HTMLElement).className;
    expect(cls).toContain("bg-surface-2");
    expect(cls).toContain("w-full");
  });

  it("plain: không nền; className ghi đè padding phải", () => {
    const { container } = render(<MemberPill plain className="pr-6" player={player} />);
    const cls = (container.firstElementChild as HTMLElement).className;
    expect(cls).not.toContain("bg-surface-2");
    expect(cls).toContain("pr-6");
    expect(cls).not.toContain("pr-0");
  });

  it("note đứng cạnh tên, màu mờ, tên truy cập có khoảng trắng", () => {
    render(<MemberPill player={player} note="4 trận" />);
    expect(screen.getByText("· 4 trận").className).toContain("text-text-2/70");
    expect(screen.getByText("· 4 trận").parentElement?.textContent).toBe("An · 4 trận");
  });
});
