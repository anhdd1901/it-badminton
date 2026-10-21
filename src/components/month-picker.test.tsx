// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { MonthPicker, MonthPopover } from "./month-picker";

afterEach(cleanup);

const btn = (name: string) => screen.getByRole("button", { name }) as HTMLButtonElement;

describe("MonthPicker", () => {
  it("tháng ngoài khoảng bị vô hiệu", () => {
    render(<MonthPicker value="2026-05" onChange={vi.fn()} min="2026-03" max="2026-10" />);
    expect(btn("Tháng 2/2026").disabled).toBe(true);
    expect(btn("Tháng 11/2026").disabled).toBe(true);
    expect(btn("Tháng 3/2026").disabled).toBe(false);
  });

  it("chọn tháng gọi onChange với SeasonId", () => {
    const onChange = vi.fn();
    render(<MonthPicker value={null} onChange={onChange} max="2026-10" />);
    fireEvent.click(btn("Tháng 5/2026"));
    expect(onChange).toHaveBeenCalledWith("2026-05");
  });

  it("tháng đang chọn có aria-pressed", () => {
    render(<MonthPicker value="2026-05" onChange={vi.fn()} max="2026-10" />);
    expect(btn("Tháng 5/2026").getAttribute("aria-pressed")).toBe("true");
    expect(btn("Tháng 6/2026").getAttribute("aria-pressed")).toBe("false");
  });

  it("nút năm dừng ở năm của min và max", () => {
    render(<MonthPicker value="2026-05" onChange={vi.fn()} min="2025-11" max="2026-10" />);
    expect(btn("Năm sau").disabled).toBe(true);
    expect(btn("Năm trước").disabled).toBe(false);
    fireEvent.click(btn("Năm trước"));
    expect(btn("Năm trước").disabled).toBe(true);
    expect(btn("Năm sau").disabled).toBe(false);
    expect(btn("Tháng 10/2025").disabled).toBe(true);
    expect(btn("Tháng 11/2025").disabled).toBe(false);
  });

  it("Xóa chỉ có khi clearable và gọi onChange(null)", () => {
    const onChange = vi.fn();
    const { rerender } = render(<MonthPicker value="2026-05" onChange={onChange} max="2026-10" />);
    expect(screen.queryByRole("button", { name: "Xóa" })).toBeNull();
    rerender(<MonthPicker value="2026-05" onChange={onChange} max="2026-10" clearable />);
    fireEvent.click(btn("Xóa"));
    expect(onChange).toHaveBeenCalledWith(null);
  });

  it("mũi tên phải/xuống chuyển focus sang ô kế (+1 / +4)", () => {
    render(<MonthPicker value="2026-05" onChange={vi.fn()} max="2026-12" />);
    const may = btn("Tháng 5/2026");
    may.focus();
    fireEvent.keyDown(may, { key: "ArrowRight" });
    expect(document.activeElement).toBe(btn("Tháng 6/2026"));
    fireEvent.keyDown(document.activeElement!, { key: "ArrowDown" });
    expect(document.activeElement).toBe(btn("Tháng 10/2026"));
    fireEvent.keyDown(document.activeElement!, { key: "ArrowLeft" });
    expect(document.activeElement).toBe(btn("Tháng 9/2026"));
    fireEvent.keyDown(document.activeElement!, { key: "ArrowUp" });
    expect(document.activeElement).toBe(btn("Tháng 5/2026"));
  });

  it("mũi tên bỏ qua ô vô hiệu và đứng yên khi hết ô", () => {
    render(<MonthPicker value="2026-02" onChange={vi.fn()} min="2026-02" max="2026-10" />);
    const feb = btn("Tháng 2/2026");
    feb.focus();
    fireEvent.keyDown(feb, { key: "ArrowLeft" });
    expect(document.activeElement).toBe(feb);
    fireEvent.keyDown(feb, { key: "ArrowUp" });
    expect(document.activeElement).toBe(feb);
    const oct = btn("Tháng 10/2026");
    oct.focus();
    fireEvent.keyDown(oct, { key: "ArrowRight" });
    expect(document.activeElement).toBe(oct);
  });
});

describe("MonthPopover", () => {
  it("đóng sau khi chọn", () => {
    const onChange = vi.fn();
    render(
      <MonthPopover value="2026-05" onChange={onChange} max="2026-10" aria-label="Chọn tháng">
        Tháng 5/2026
      </MonthPopover>,
    );
    expect(screen.queryByRole("dialog")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Chọn tháng" }));
    expect(screen.getByRole("dialog")).toBeTruthy();
    fireEvent.click(btn("Tháng 6/2026"));
    expect(onChange).toHaveBeenCalledWith("2026-06");
    expect(screen.queryByRole("dialog")).toBeNull();
  });
});
