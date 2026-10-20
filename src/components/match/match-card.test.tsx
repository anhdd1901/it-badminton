// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { WeekMatch } from "@/server/views/week";
import { MatchCard } from "./match-card";

vi.mock("next/navigation", () => ({ useRouter: () => ({ replace: vi.fn(), refresh: vi.fn() }) }));
vi.mock("@/app/_actions/results", () => ({
  saveResultAction: vi.fn(),
  deleteResultAction: vi.fn(),
}));

const p = (id: string, seed: 1 | 2 | null = null) => ({
  id,
  displayName: `Mem ${id}`,
  avatarUrl: null,
  seed,
});
function match(result: WeekMatch["result"], seed: 1 | 2 | null = null): WeekMatch {
  return { number: 1, teamA: [p("a", seed), p("b")], teamB: [p("c"), p("d")], result };
}

describe("MatchCard", () => {
  it("cặp thắng text-win, cặp thua text-loss", () => {
    render(
      <MatchCard
        match={match({ scoreA: 21, scoreB: 15, version: 1 })}
        editable={false}
        day="2026-10-17"
        scheduleKey="k"
      />,
    );
    expect(screen.getByTestId("team-a").className).toContain("text-win");
    expect(screen.getByTestId("team-b").className).toContain("text-loss");
    expect(screen.getByTestId("team-a").textContent).toContain("21");
  });

  it("chưa có kết quả: hai ô –", () => {
    render(<MatchCard match={match(null)} editable={false} day="d" scheduleKey="k" />);
    expect(screen.getAllByText("–")).toHaveLength(2);
  });

  it("seed 1 có chấm có aria-label", () => {
    render(<MatchCard match={match(null, 1)} editable={false} day="d" scheduleKey="k" />);
    expect(screen.getByLabelText("Hạt giống 1")).toBeTruthy();
  });
});
