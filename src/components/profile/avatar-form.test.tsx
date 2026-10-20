// @vitest-environment jsdom
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ActionResult } from "@/ui/action-result";
import { AvatarForm } from "./avatar-form";

vi.mock("next/navigation", () => ({ useRouter: () => ({ replace: vi.fn(), refresh: vi.fn() }) }));
vi.mock("sonner", () => ({ toast: { error: vi.fn(), success: vi.fn() } }));
const setAvatarAction = vi.fn<(id: string, f: FormData) => Promise<ActionResult>>();
const removeAvatarAction = vi.fn<(id: string) => Promise<ActionResult>>();
vi.mock("@/app/_actions/profile", () => ({
  setAvatarAction: (id: string, f: FormData) => setAvatarAction(id, f),
  removeAvatarAction: (id: string) => removeAvatarAction(id),
}));

const createObjectURL = vi.fn(() => "blob:preview");
const revokeObjectURL = vi.fn();
beforeEach(() => {
  setAvatarAction.mockReset();
  removeAvatarAction.mockReset();
  createObjectURL.mockClear();
  revokeObjectURL.mockClear();
  URL.createObjectURL = createObjectURL;
  URL.revokeObjectURL = revokeObjectURL;
});

const member = { id: "m1", displayName: "An" };
const input = () => document.querySelector('input[type="file"]') as HTMLInputElement;

function pick(file: File) {
  fireEvent.change(input(), { target: { files: [file] } });
}

describe("AvatarForm", () => {
  it("file 6 MB: hiện Ảnh tối đa 5 MB, không gọi action", () => {
    render(<AvatarForm member={{ ...member, avatarUrl: null }} />);
    const big = new File([new Uint8Array(6 * 1024 * 1024)], "a.png", { type: "image/png" });
    pick(big);
    expect(screen.getByRole("alert").textContent).toBe("Ảnh tối đa 5 MB");
    expect(setAvatarAction).not.toHaveBeenCalled();
    expect(screen.queryByRole("button", { name: "Lưu ảnh" })).toBeNull();
  });

  it("có ảnh xem trước trước khi lưu; lưu gửi FormData trường file", async () => {
    setAvatarAction.mockResolvedValue({ ok: true, data: undefined });
    render(<AvatarForm member={{ ...member, avatarUrl: null }} />);
    pick(new File([new Uint8Array(10)], "a.png", { type: "image/png" }));
    expect(screen.getByAltText("Ảnh xem trước").getAttribute("src")).toBe("blob:preview");
    fireEvent.click(screen.getByRole("button", { name: "Lưu ảnh" }));
    await waitFor(() => expect(setAvatarAction).toHaveBeenCalled());
    const [id, form] = setAvatarAction.mock.calls[0];
    expect(id).toBe("m1");
    expect(form.get("file")).toBeInstanceOf(File);
  });

  it("Xóa ảnh chỉ hiện khi đã có avatar", () => {
    const { unmount } = render(<AvatarForm member={{ ...member, avatarUrl: null }} />);
    expect(screen.queryByRole("button", { name: "Xóa ảnh" })).toBeNull();
    unmount();
    render(<AvatarForm member={{ ...member, avatarUrl: "/anh-dai-dien/x.webp" }} />);
    expect(screen.getByRole("button", { name: "Xóa ảnh" })).toBeTruthy();
  });
});
