// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { SeasonId } from "@/domain/types";
import type { ActionResult } from "@/ui/action-result";
import type { MemberProfileView } from "@/server/views/member-profile";
import { MemberDialog } from "./member-dialog";

const replace = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace, refresh: vi.fn() }),
  unstable_rethrow: (e: unknown) => {
    throw e;
  },
}));
vi.mock("sonner", () => ({ toast: { error: vi.fn() } }));
const action = vi.fn<(id: string, season: string) => Promise<ActionResult<MemberProfileView>>>();
vi.mock("@/app/_actions/member-profile", () => ({
  getMemberProfileAction: (id: string, season: string) => action(id, season),
}));

const SEASON = "2026-10" as SeasonId;

function view(over: Partial<MemberProfileView> = {}): MemberProfileView {
  return {
    member: { id: "m1", displayName: "Minh", avatarUrl: null, active: true },
    eloTenths: 10168,
    seed: 1,
    lastMatchDayDelta: 123,
    season: {
      id: SEASON,
      rank: 2,
      totals: { wins: 5, pointsFor: 100, pointsAgainst: 90, played: 8 },
      diff: 10,
    },
    allTime: {
      totals: { wins: 20, pointsFor: 400, pointsAgainst: 420, played: 30 },
      diff: -20,
      podium: { first: 7, second: 6, third: 5, fourth: 4 },
    },
    ...over,
  } as MemberProfileView;
}

function renderDialog(memberId = "m1") {
  render(
    <MemberDialog memberId={memberId} season={SEASON}>
      Mở
    </MemberDialog>,
  );
  fireEvent.click(screen.getByRole("button", { name: "Mở" }));
}

beforeEach(() => {
  action.mockReset();
  replace.mockReset();
});
afterEach(cleanup);

describe("MemberDialog", () => {
  it("mở popup gọi action đúng một lần với (memberId, season)", async () => {
    action.mockResolvedValue({ ok: true, data: view() });
    renderDialog();
    await screen.findByText("Toàn thời gian");
    expect(action).toHaveBeenCalledTimes(1);
    expect(action).toHaveBeenCalledWith("m1", "2026-10");
  });

  it("hiện khung xương khi đang tải", () => {
    action.mockReturnValue(new Promise(() => {}));
    renderDialog();
    expect(screen.getByRole("status")).toBeTruthy();
  });

  it("hiện tên, ELO bằng formatElo, Hạt giống, hai nhóm số liệu", async () => {
    action.mockResolvedValue({ ok: true, data: view() });
    renderDialog();
    await screen.findByText("Mùa 10/2026");
    expect(screen.getAllByText("Minh").length).toBeGreaterThan(0);
    expect(screen.getByText("1.016,8")).toBeTruthy();
    expect(screen.getByLabelText("Hạt giống 1")).toBeTruthy();
    expect(screen.getByText("Toàn thời gian")).toBeTruthy();
    for (const l of ["Thắng", "Hiệu số", "Cầu thắng", "Cầu thua", "Số trận"]) {
      expect(screen.getAllByText(l)).toHaveLength(2);
    }
    expect(screen.getAllByText("Hạng")).toHaveLength(1);
    expect(screen.getByText("+10")).toBeTruthy();
    expect(screen.getByText("-20")).toBeTruthy();
    for (const l of ["Hạng 1", "Hạng 2", "Hạng 3", "Hạng 4"]) {
      expect(screen.getByText(l)).toBeTruthy();
    }
    expect(screen.getByText("7")).toBeTruthy();
    expect(screen.getByText("6")).toBeTruthy();
    // Chỉ thống kê toàn thời gian có tỷ lệ thắng: 20/30.
    expect(screen.getAllByText("Tỷ lệ thắng")).toHaveLength(1);
    expect(screen.getByText("67%")).toBeTruthy();
  });

  it("chevron theo delta", async () => {
    action.mockResolvedValue({ ok: true, data: view({ lastMatchDayDelta: 123 }) });
    renderDialog();
    const up = await screen.findByLabelText("Tăng 12,3 điểm ở buổi gần nhất");
    expect(up.getAttribute("class")).toContain("text-accent-text");
    expect(screen.getByText("1.016,8").className).toContain("font-display");
    cleanup();
    action.mockResolvedValue({ ok: true, data: view({ lastMatchDayDelta: -123 }) });
    renderDialog();
    await screen.findByLabelText("Giảm 12,3 điểm ở buổi gần nhất");
    cleanup();
    for (const d of [null, 0]) {
      action.mockResolvedValue({ ok: true, data: view({ lastMatchDayDelta: d }) });
      renderDialog();
      await screen.findByText("Toàn thời gian");
      expect(screen.queryByLabelText(/điểm ở buổi gần nhất/)).toBeNull();
      cleanup();
    }
  });

  it("mem đã ngưng: nhãn 'Đã ngưng', Hạt giống hiện '–'", async () => {
    action.mockResolvedValue({
      ok: true,
      data: view({
        member: { id: "m1", displayName: "Minh", avatarUrl: null, active: false },
        seed: null,
      }),
    });
    renderDialog();
    await screen.findByText("Đã ngưng");
    expect(screen.queryByLabelText(/Hạt giống 1|Hạt giống 2/)).toBeNull();
    expect(screen.getByLabelText("Hạt giống: chưa có").textContent).toBe("–");
  });

  it("hạng mùa null hiện '–'", async () => {
    const v = view();
    v.season.rank = null;
    action.mockResolvedValue({ ok: true, data: v });
    renderDialog();
    await screen.findByText("Mùa 10/2026");
    expect(screen.getByText("Hạng").nextElementSibling?.textContent).toBe("–");
  });

  it("khung xương có cùng số ô số liệu với trạng thái đã tải", async () => {
    let resolve: (r: ActionResult<MemberProfileView>) => void = () => {};
    action.mockImplementationOnce(() => new Promise((res) => (resolve = res)));
    renderDialog();
    const cells = () => document.querySelectorAll('[data-slot="stat-cell"]').length;
    const skeletonCount = cells();
    expect(skeletonCount).toBe(16);
    resolve({ ok: true, data: view() });
    await screen.findByText("Toàn thời gian");
    expect(cells()).toBe(skeletonCount);
  });

  it("lỗi: hiện thông báo và nút 'Thử lại' gọi lại action", async () => {
    action.mockResolvedValueOnce({ ok: false, code: "NOT_FOUND", message: "Không tìm thấy mem" });
    renderDialog();
    await screen.findByText("Không tải được thông tin mem");
    expect(screen.getByText("Không tìm thấy mem")).toBeTruthy();
    action.mockResolvedValueOnce({ ok: true, data: view() });
    fireEvent.click(screen.getByRole("button", { name: "Thử lại" }));
    await screen.findByText("Toàn thời gian");
    expect(action).toHaveBeenCalledTimes(2);
  });

  it("đóng popup trước khi kết quả về thì không hiện dữ liệu khi mở lại mem khác", async () => {
    let resolveA: (r: ActionResult<MemberProfileView>) => void = () => {};
    action.mockImplementationOnce(() => new Promise((res) => (resolveA = res)));
    render(
      <>
        <MemberDialog memberId="a" season={SEASON}>
          MemA
        </MemberDialog>
        <MemberDialog memberId="b" season={SEASON}>
          MemB
        </MemberDialog>
      </>,
    );
    fireEvent.click(screen.getByRole("button", { name: "MemA" }));
    fireEvent.keyDown(document.activeElement ?? document.body, { key: "Escape" });
    await waitFor(() => expect(screen.queryByRole("status")).toBeNull());
    action.mockImplementationOnce(() => new Promise(() => {}));
    fireEvent.click(screen.getByRole("button", { name: "MemB" }));
    resolveA({
      ok: true,
      data: view({ member: { id: "a", displayName: "TênA", avatarUrl: null, active: true } }),
    });
    await new Promise((r) => setTimeout(r, 20));
    expect(screen.queryByText("TênA")).toBeNull();
    expect(screen.getByRole("status")).toBeTruthy();
  });

  it("UNAUTHENTICATED → router.replace('/dang-nhap')", async () => {
    action.mockResolvedValue({ ok: false, code: "UNAUTHENTICATED", message: "Hết phiên" });
    renderDialog();
    await waitFor(() => expect(replace).toHaveBeenCalledWith("/dang-nhap"));
  });

  it("popup luôn thoát trạng thái tải khi action ném lỗi", async () => {
    action.mockRejectedValue(new Error("network"));
    renderDialog();
    await screen.findByText("Không tải được thông tin mem");
    expect(screen.queryByRole("status")).toBeNull();
  });
});
