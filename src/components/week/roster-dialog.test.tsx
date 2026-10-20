// @vitest-environment jsdom
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ActionResult } from "@/ui/action-result";
import { RosterDialog } from "./roster-dialog";

const refresh = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ replace: vi.fn(), refresh }) }));
vi.mock("sonner", () => ({ toast: { error: vi.fn() } }));
const setAction = vi.fn<(id: string, a: boolean) => Promise<ActionResult>>();
const rosterAction = vi.fn();
vi.mock("@/app/_actions/attendance", () => ({
  setAttendanceAction: (id: string, a: boolean) => setAction(id, a),
  getRosterAction: () => rosterAction(),
}));

const minh = { id: "m1", displayName: "Minh", username: "minh.nt", avatarUrl: null, active: true };
const lan = { id: "m2", displayName: "Lan", username: "lan", avatarUrl: null, active: true };
const attendees = [{ id: "m1", displayName: "Minh", avatarUrl: null, seed: null }];

beforeEach(() => {
  setAction.mockReset();
  rosterAction.mockReset();
  refresh.mockReset();
});

describe("RosterDialog", () => {
  it("mem thường chỉ thấy tên người đã điểm danh", () => {
    render(
      <RosterDialog attendees={attendees} activeMemberCount={2} canManage={false} canChange />,
    );
    fireEvent.click(screen.getByRole("button", { name: /1 đã điểm danh \/ 2 mem/ }));
    expect(screen.getByText("Minh")).toBeTruthy();
    expect(screen.queryByText(/@minh\.nt/)).toBeNull();
    expect(screen.queryByRole("button", { name: /Điểm danh/ })).toBeNull();
    expect(rosterAction).not.toHaveBeenCalled();
  });

  it("quản lý thấy Tên (@username) và công tắc có tên; lỗi giữ nguyên dòng", async () => {
    rosterAction.mockResolvedValue({
      ok: true,
      data: [
        { member: minh, attending: true },
        { member: lan, attending: false },
      ],
    });
    setAction.mockResolvedValue({ ok: false, code: "LOCKED", message: "Buổi đấu đã khóa" });
    render(<RosterDialog attendees={attendees} activeMemberCount={2} canManage canChange />);
    fireEvent.click(screen.getByRole("button", { name: /đã điểm danh \/ 2 mem/ }));
    expect(await screen.findByText("Minh (@minh.nt)")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Hủy điểm danh Minh" })).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Điểm danh Lan" }));
    expect((await screen.findByRole("alert")).textContent).toBe("Buổi đấu đã khóa");
    expect(setAction).toHaveBeenCalledWith("m2", true);
    expect(screen.getByRole("button", { name: "Điểm danh Lan" })).toBeTruthy();
    await waitFor(() => expect(refresh).toHaveBeenCalled());
  });
});
