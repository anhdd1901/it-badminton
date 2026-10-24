// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { SeasonId } from "@/domain/types";
import { EloTable } from "./elo-table";

vi.mock("next/navigation", () => ({ useRouter: () => ({ replace: vi.fn(), refresh: vi.fn() }) }));
vi.mock("sonner", () => ({ toast: { error: vi.fn() } }));
vi.mock("@/app/_actions/member-profile", () => ({ getMemberProfileAction: vi.fn() }));

const SEASON = "2026-10" as SeasonId;
afterEach(cleanup);

const row = (id: string, eloTenths: number, seed: 1 | 2, delta: number | null) => ({
  member: { id, displayName: `Mem ${id}`, username: id, avatarUrl: null, active: true },
  eloTenths,
  seed,
  lastMatchDayDelta: delta,
});

describe("EloTable", () => {
  it("hiện ELO và thay đổi có ký hiệu", () => {
    render(<EloTable rows={[row("a", 10168, 1, 168), row("b", 9900, 2, null)]} season={SEASON} />);
    expect(screen.getByText("1.016,8")).toBeTruthy();
    expect(screen.getByText("▲ 16,8").className).toContain("text-accent-text");
    expect(screen.getByText("–")).toBeTruthy();
    expect(screen.getByText("1.016,8").className).toContain("font-display");
  });
  it("giảm hiện ▼ màu danger", () => {
    render(<EloTable rows={[row("a", 9000, 2, -50)]} season={SEASON} />);
    expect(screen.getByText("▼ 5,0").className).toContain("text-danger");
  });
  it("không có cột Hạt giống; dòng Hạt giống 1 có nền surface-2", () => {
    const { container } = render(
      <EloTable rows={[row("a", 10168, 1, 0), row("b", 9000, 2, 0)]} season={SEASON} />,
    );
    expect(container.querySelector("thead")!.textContent).not.toContain("Hạt giống");
    const [top, other] = Array.from(container.querySelectorAll("tbody tr"));
    expect(top.className).toContain("bg-surface-2");
    expect(top.querySelector("th")!.className).toContain("bg-surface-2");
    expect(top.textContent).toContain("Hạt giống 1");
    expect(other.className).not.toContain("bg-surface-2");
    // --border equals --surface-2 in the dark theme, so dividers use --bg
    expect(top.className).toContain("var(--bg)");
  });
  it("tên mem là nút mở popup", async () => {
    render(<EloTable rows={[row("a", 10168, 1, 0)]} season={SEASON} />);
    fireEvent.click(screen.getByRole("button", { name: "Mem a" }));
    expect(await screen.findByRole("dialog")).toBeTruthy();
  });
});
