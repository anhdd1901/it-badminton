// @vitest-environment jsdom
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ActionResult } from "@/ui/action-result";
import { PasswordForm } from "./password-form";

vi.mock("next/navigation", () => ({ useRouter: () => ({ replace: vi.fn(), refresh: vi.fn() }) }));
vi.mock("sonner", () => ({ toast: { error: vi.fn(), success: vi.fn() } }));
type Input = { current: string; next: string; confirm: string };
const changeOwnPasswordAction = vi.fn<(i: Input) => Promise<ActionResult>>();
vi.mock("@/app/_actions/profile", () => ({
  changeOwnPasswordAction: (i: Input) => changeOwnPasswordAction(i),
}));

beforeEach(() => changeOwnPasswordAction.mockReset());

function fill() {
  fireEvent.change(screen.getByLabelText("Mật khẩu hiện tại"), { target: { value: "cu12345678" } });
  fireEvent.change(screen.getByLabelText("Mật khẩu mới"), { target: { value: "moi12345678" } });
  fireEvent.change(screen.getByLabelText("Nhập lại mật khẩu mới"), {
    target: { value: "moi12345678" },
  });
  fireEvent.click(screen.getByRole("button", { name: "Đổi mật khẩu" }));
}

describe("PasswordForm", () => {
  it("lỗi: hiện thông báo tại form, giữ các ô", async () => {
    changeOwnPasswordAction.mockResolvedValue({
      ok: false,
      code: "VALIDATION",
      message: "Mật khẩu không đúng",
    });
    render(<PasswordForm />);
    fill();
    expect((await screen.findByRole("alert")).textContent).toBe("Mật khẩu không đúng");
    expect((screen.getByLabelText("Mật khẩu hiện tại") as HTMLInputElement).value).toBe(
      "cu12345678",
    );
    expect(changeOwnPasswordAction).toHaveBeenCalledWith({
      current: "cu12345678",
      next: "moi12345678",
      confirm: "moi12345678",
    });
  });

  it("thành công: hiện Đã đổi mật khẩu và xóa các ô", async () => {
    changeOwnPasswordAction.mockResolvedValue({ ok: true, data: undefined });
    render(<PasswordForm />);
    fill();
    expect((await screen.findByRole("status")).textContent).toBe("Đã đổi mật khẩu");
    await waitFor(() =>
      expect((screen.getByLabelText("Mật khẩu hiện tại") as HTMLInputElement).value).toBe(""),
    );
    expect((screen.getByLabelText("Mật khẩu mới") as HTMLInputElement).value).toBe("");
    expect((screen.getByLabelText("Nhập lại mật khẩu mới") as HTMLInputElement).value).toBe("");
  });

  it("ô mới dùng autoComplete new-password", () => {
    render(<PasswordForm />);
    expect(screen.getByLabelText("Mật khẩu mới").getAttribute("autocomplete")).toBe("new-password");
    expect(screen.getByLabelText("Mật khẩu hiện tại").getAttribute("autocomplete")).toBe(
      "current-password",
    );
  });
});
