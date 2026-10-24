// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { LocalDate } from "@/domain/types";
import { WeekHeader } from "./week-header";

describe("WeekHeader", () => {
  it("nằm trên nền chrome, ngày bằng font hiển thị", () => {
    const { container } = render(
      <WeekHeader day={"2026-10-17" as LocalDate} status="open">
        <button>8/10</button>
      </WeekHeader>,
    );
    const header = container.querySelector("header")!;
    expect(header.className).toContain("bg-chrome");
    expect(header.className).toContain("text-on-chrome");
    expect(header.className).toContain("border-chrome-active");
    const date = screen.getByText("Thứ 7, 17/10");
    expect(date.className).toContain("font-display");
    expect(date.className).toContain("italic");
    expect(screen.getByText("Đang mở điểm danh").className).toContain("text-chrome-active");
    expect(header.querySelector(".text-accent-text, .text-text-2")).toBeNull();
  });
});
