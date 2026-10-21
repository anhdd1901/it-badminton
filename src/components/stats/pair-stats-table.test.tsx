// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { getMemberProfileAction } from "@/app/_actions/member-profile";
import type { SeasonId } from "@/domain/types";
import { PairStatsTable } from "./pair-stats-table";

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

describe("PairStatsTable", () => {
  it("hai tên là hai nút riêng; nút thứ hai mở popup của mem thứ hai", async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const rows = [{ key: "a|b", rank: 1, members: [mem("a"), mem("b")], totals, diff: 11 }] as any;
    render(<PairStatsTable rows={rows} season={SEASON} />);
    expect(screen.getByRole("button", { name: "Mem a" })).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Mem b" }));
    expect(await screen.findByRole("dialog")).toBeTruthy();
    expect(getMemberProfileAction).toHaveBeenCalledWith("b", SEASON);
    expect(getMemberProfileAction).not.toHaveBeenCalledWith("a", SEASON);
  });
});
