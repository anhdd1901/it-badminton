// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { EloTable } from "./elo-table";

const row = (id: string, eloTenths: number, seed: 1 | 2, delta: number | null) => ({
  member: { id, displayName: `Mem ${id}`, username: id, avatarUrl: null, active: true },
  eloTenths,
  seed,
  lastMatchDayDelta: delta,
});

describe("EloTable", () => {
  it("hiện ELO và thay đổi có ký hiệu", () => {
    render(<EloTable rows={[row("a", 10168, 1, 168), row("b", 9900, 2, null)]} />);
    expect(screen.getByText("1.016,8")).toBeTruthy();
    expect(screen.getByText("▲ 16,8").className).toContain("text-seed-2");
    expect(screen.getByText("–")).toBeTruthy();
  });
  it("giảm hiện ▼ màu danger", () => {
    render(<EloTable rows={[row("a", 9000, 2, -50)]} />);
    expect(screen.getByText("▼ 5,0").className).toContain("text-danger");
  });
  it("hạt giống 1 hiện chữ 1 kèm chấm màu", () => {
    const { container } = render(<EloTable rows={[row("a", 10168, 1, 0)]} />);
    const cell = screen.getByLabelText("Hạt giống 1");
    expect(cell.textContent).toContain("1");
    expect(container.querySelector(".bg-seed-1")).not.toBeNull();
  });
});
