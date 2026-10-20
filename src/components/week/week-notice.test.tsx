// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { noDiagramMessage } from "@/domain/schedule";
import { WeekNotice } from "./week-notice";

describe("WeekNotice", () => {
  it("NOT_ENOUGH nêu số người hiện có", () => {
    render(<WeekNotice notice={{ kind: "NOT_ENOUGH", count: 3 }} />);
    expect(screen.getByText("Chưa đủ người để xếp lịch (cần ít nhất 5, hiện có 3)")).toBeTruthy();
  });

  it("NO_DIAGRAM dùng đúng thông báo của domain", () => {
    render(<WeekNotice notice={{ kind: "NO_DIAGRAM", seed1: 4, seed2: 7 }} />);
    expect(screen.getByText(noDiagramMessage(4, 7))).toBeTruthy();
  });
});
