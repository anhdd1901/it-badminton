// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { getMemberProfileAction } from "@/app/_actions/member-profile";
import type { SeasonId } from "@/domain/types";
import { SeasonTable } from "./season-table";

vi.mock("next/navigation", () => ({ useRouter: () => ({ replace: vi.fn(), refresh: vi.fn() }) }));
vi.mock("sonner", () => ({ toast: { error: vi.fn() } }));
vi.mock("@/app/_actions/member-profile", () => ({ getMemberProfileAction: vi.fn() }));

const SEASON = "2026-10" as SeasonId;
afterEach(cleanup);
const mem = (id: string) => ({
  id,
  displayName: `Mem ${id}`,
  username: id,
  avatarUrl: null,
  active: true,
});
const totals = { wins: 1, losses: 0, pointsFor: 21, pointsAgainst: 10, played: 1 };

describe("SeasonTable", () => {
  it("tên mem là nút mở popup của mùa đang xem", async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const rows = [{ rank: 1, member: mem("a"), totals, diff: 11 }] as any;
    render(<SeasonTable rows={rows} season={SEASON} />);
    fireEvent.click(screen.getByRole("button", { name: "Mem a" }));
    expect(await screen.findByRole("dialog")).toBeTruthy();
    expect(getMemberProfileAction).toHaveBeenCalledWith("a", SEASON);
  });
  it("không có cột Hạng; top 4 có huy chương sau tên (đồng hạng cùng huy chương)", () => {
    const rows = [
      { rank: 1, member: mem("a"), totals, diff: 11 },
      { rank: 1, member: mem("b"), totals, diff: 11 },
      { rank: 3, member: mem("c"), totals, diff: 5 },
      { rank: 4, member: mem("d"), totals, diff: 1 },
      { rank: 5, member: mem("e"), totals, diff: 0 },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ] as any;
    const { container } = render(<SeasonTable rows={rows} season={SEASON} />);
    expect(container.querySelector("thead")!.textContent).not.toContain("Hạng");
    expect(container.querySelectorAll("tr[data-leader]").length).toBe(2);
    const medals = Array.from(container.querySelectorAll("tbody tr")).map(
      (tr) => tr.querySelector("th [data-medal]")?.className ?? null,
    );
    expect(medals[0]).toContain("bg-gold");
    expect(medals[1]).toContain("bg-gold");
    expect(medals[2]).toContain("bg-bronze");
    expect(medals[3]).toContain("bg-fourth");
    expect(medals[4]).toBeNull();
    expect(screen.getAllByRole("img", { name: "Hạng 1" })).toHaveLength(2);
  });
});
