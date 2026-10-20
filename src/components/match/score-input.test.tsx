// @vitest-environment jsdom
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ScoreInput } from "./score-input";

const refresh = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ replace: vi.fn(), refresh }) }));

const onSave = vi.fn();
beforeEach(() => {
  onSave.mockReset();
  refresh.mockReset();
});

function setup(initial: { scoreA: number; scoreB: number } | null = null) {
  render(<ScoreInput initial={initial} labelA="An & Bình" labelB="Chi & Dũng" onSave={onSave} />);
}
function fill(a: string, b: string) {
  fireEvent.change(screen.getByLabelText("An & Bình"), { target: { value: a } });
  fireEvent.change(screen.getByLabelText("Chi & Dũng"), { target: { value: b } });
  fireEvent.click(screen.getByRole("button", { name: "Lưu tỷ số" }));
}

describe("ScoreInput", () => {
  it("một ô trống: báo lỗi, không gọi onSave", () => {
    setup();
    fill("21", "");
    expect(screen.getByRole("alert").textContent).toBe("Nhập tỷ số cho cả hai cặp");
    expect(onSave).not.toHaveBeenCalled();
  });

  it.each([
    ["abc", "5", "Tỷ số phải là số nguyên từ 0 trở lên"],
    ["-3", "5", "Tỷ số phải là số nguyên từ 0 trở lên"],
    ["21.5", "5", "Tỷ số phải là số nguyên từ 0 trở lên"],
    ["21", "20", "Tỷ số 21–20 không hợp lệ: chưa cách 2 điểm, phải đánh tiếp"],
    ["30", "30", "Không có tỷ số hòa"],
  ])("%s/%s → %s", (a, b, msg) => {
    setup();
    fill(a, b);
    expect(screen.getByRole("alert").textContent).toBe(msg);
    expect(onSave).not.toHaveBeenCalled();
  });

  it("tỷ số hợp lệ gọi onSave", async () => {
    onSave.mockResolvedValue({ ok: true, data: undefined });
    setup();
    fill("21", "15");
    await waitFor(() => expect(onSave).toHaveBeenCalledWith({ scoreA: 21, scoreB: 15 }));
    expect(screen.queryByRole("alert")).toBeNull();
  });

  it("CONFLICT hiện message và làm mới", async () => {
    const message = "Trận này vừa được nhập 21–19, hãy tải lại";
    onSave.mockResolvedValue({ ok: false, code: "CONFLICT", message });
    setup();
    fill("21", "15");
    await waitFor(() => expect(screen.getByRole("alert").textContent).toBe(message));
    expect(refresh).toHaveBeenCalled();
  });

  it("sau CONFLICT không gửi lại giá trị cũ khi chưa nhập lại", async () => {
    const message = "Trận này vừa được nhập 21–19, hãy tải lại";
    onSave.mockResolvedValue({ ok: false, code: "CONFLICT", message });
    setup();
    fill("21", "15");
    await waitFor(() => expect(screen.getByRole("alert").textContent).toBe(message));
    expect((screen.getByLabelText("An & Bình") as HTMLInputElement).value).toBe("");
    fireEvent.click(screen.getByRole("button", { name: "Lưu tỷ số" }));
    expect(screen.getByRole("alert").textContent).toBe("Nhập tỷ số cho cả hai cặp");
    expect(onSave).toHaveBeenCalledTimes(1);
  });

  it("lỗi được gắn với hai ô nhập", () => {
    setup();
    fill("21", "");
    const alert = screen.getByRole("alert");
    const a = screen.getByLabelText("An & Bình");
    expect(a.getAttribute("aria-invalid")).toBe("true");
    expect(a.getAttribute("aria-describedby")).toBe(alert.id);
  });
});
