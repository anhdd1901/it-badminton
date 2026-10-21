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
});
