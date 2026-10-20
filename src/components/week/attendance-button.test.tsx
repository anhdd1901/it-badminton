// @vitest-environment jsdom
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ActionResult } from "@/ui/action-result";
import { AttendanceButton } from "./attendance-button";

const refresh = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ replace: vi.fn(), refresh }) }));
vi.mock("sonner", () => ({ toast: { error: vi.fn() } }));
const setAttendanceAction = vi.fn<(id: string, attending: boolean) => Promise<ActionResult>>();
vi.mock("@/app/_actions/attendance", () => ({
  setAttendanceAction: (id: string, attending: boolean) => setAttendanceAction(id, attending),
}));

beforeEach(() => setAttendanceAction.mockReset());

describe("AttendanceButton", () => {
  it("lỗi: trả về trạng thái cũ và hiện thông báo dưới nút", async () => {
    setAttendanceAction.mockResolvedValue({
      ok: false,
      code: "LOCKED",
      message: "Buổi đấu đã khóa, không thể thay đổi điểm danh",
    });
    render(<AttendanceButton memberId="m1" attending={false} disabled={false} />);
    fireEvent.click(screen.getByRole("button", { name: "Điểm danh" }));
    const alert = await screen.findByRole("alert");
    expect(alert.textContent).toBe("Buổi đấu đã khóa, không thể thay đổi điểm danh");
    expect(screen.getByRole("button", { name: "Điểm danh" })).toBeTruthy();
    expect(setAttendanceAction).toHaveBeenCalledWith("m1", true);
    expect(refresh).toHaveBeenCalled();
  });

  it("thành công: nút thành Hủy điểm danh", async () => {
    setAttendanceAction.mockResolvedValue({ ok: true, data: undefined });
    render(<AttendanceButton memberId="m1" attending={false} disabled={false} />);
    fireEvent.click(screen.getByRole("button", { name: "Điểm danh" }));
    await waitFor(() => expect(screen.getByRole("button", { name: "Hủy điểm danh" })).toBeTruthy());
    expect(screen.queryByRole("alert")).toBeNull();
  });

  it("disabled: không gọi action, hiện lý do", () => {
    render(
      <AttendanceButton
        memberId="m1"
        attending={true}
        disabled
        disabledReason="Đã đóng điểm danh lúc 12:00"
      />,
    );
    const btn = screen.getByRole("button", { name: "Hủy điểm danh" }) as HTMLButtonElement;
    expect(btn.disabled).toBe(true);
    fireEvent.click(btn);
    expect(setAttendanceAction).not.toHaveBeenCalled();
    expect(screen.getByText("Đã đóng điểm danh lúc 12:00")).toBeTruthy();
  });
});
