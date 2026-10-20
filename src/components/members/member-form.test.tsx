// @vitest-environment jsdom
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ActionResult } from "@/ui/action-result";
import { MemberForm } from "./member-form";

const toast = vi.hoisted(() => ({ error: vi.fn(), success: vi.fn() }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ replace: vi.fn(), refresh: vi.fn() }) }));
vi.mock("sonner", () => ({ toast }));
const createMemberAction = vi.fn<(f: FormData) => Promise<ActionResult<{ id: string }>>>();
vi.mock("@/app/_actions/members", () => ({
  createMemberAction: (f: FormData) => createMemberAction(f),
}));

beforeEach(() => {
  createMemberAction.mockReset();
  toast.success.mockReset();
});

function open() {
  render(<MemberForm />);
  fireEvent.click(screen.getByRole("button", { name: "Thêm mem" }));
}

function fillAndSubmit() {
  fireEvent.change(screen.getByLabelText("Tên hiển thị"), { target: { value: "Giang" } });
  fireEvent.change(screen.getByLabelText("Tên đăng nhập"), { target: { value: "giang" } });
  fireEvent.change(screen.getByLabelText("Mật khẩu"), { target: { value: "matkhau123" } });
  const dialog = screen.getByRole("dialog");
  const submit = Array.from(dialog.querySelectorAll("button[type=submit]"))[0];
  fireEvent.click(submit);
}

describe("MemberForm", () => {
  it("ELO ban đầu có sẵn 1000", () => {
    open();
    expect((screen.getByLabelText("ELO ban đầu") as HTMLInputElement).value).toBe("1000");
  });

  it("tên đăng nhập đã có: hiện dưới ô username, không đóng form", async () => {
    createMemberAction.mockResolvedValue({
      ok: false,
      code: "CONFLICT",
      message: "Tên đăng nhập đã có người dùng",
    });
    open();
    fillAndSubmit();
    const alert = await screen.findByRole("alert");
    expect(alert.textContent).toBe("Tên đăng nhập đã có người dùng");
    expect(screen.getByLabelText("Tên đăng nhập").getAttribute("aria-describedby")).toBe(alert.id);
    expect(screen.queryByRole("dialog")).not.toBeNull();
    expect(toast.success).not.toHaveBeenCalled();
  });

  it("thành công: gửi các trường, đóng form, toast Đã thêm mem", async () => {
    createMemberAction.mockResolvedValue({ ok: true, data: { id: "m1" } });
    open();
    fillAndSubmit();
    await waitFor(() => expect(toast.success).toHaveBeenCalledWith("Đã thêm mem"));
    const form = createMemberAction.mock.calls[0][0];
    expect(form.get("username")).toBe("giang");
    expect(form.get("initialElo")).toBe("1000");
    expect(form.has("file")).toBe(false);
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
  });
});
