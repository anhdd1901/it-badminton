// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { LINEUP_INVALID } from "@/domain/lineup";
import { PlayersInput } from "./players-input";

const refresh = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ replace: vi.fn(), refresh }) }));

const onSave = vi.fn();
const roster = [
  { id: "a", displayName: "An" },
  { id: "b", displayName: "Bình" },
  { id: "c", displayName: "Chi" },
  { id: "d", displayName: "Dũng" },
  { id: "e", displayName: "Em" },
];
const counts = new Map([
  ["a", 4],
  ["b", 4],
  ["c", 4],
  ["d", 3],
  ["e", 3],
]);
const initial = { teamA: ["a", "b"] as [string, string], teamB: ["c", "d"] as [string, string] };

beforeEach(() => {
  onSave.mockReset();
  refresh.mockReset();
  // Radix Select needs these in jsdom.
  Element.prototype.hasPointerCapture ??= () => false;
  Element.prototype.setPointerCapture ??= () => {};
  Element.prototype.releasePointerCapture ??= () => {};
  Element.prototype.scrollIntoView ??= () => {};
});
afterEach(cleanup);

function setup() {
  render(<PlayersInput roster={roster} counts={counts} initial={initial} onSave={onSave} />);
}
function pick(label: string, option: RegExp | string) {
  const trigger = screen.getByRole("combobox", { name: label });
  fireEvent.keyDown(trigger, { key: "Enter" });
  fireEvent.click(screen.getByRole("option", { name: option }));
}
const saveButton = () =>
  screen.getByRole("button", { name: "Lưu người chơi" }) as HTMLButtonElement;

describe("PlayersInput", () => {
  it("chưa đổi gì: nút Lưu người chơi bị vô hiệu", () => {
    setup();
    expect(saveButton().disabled).toBe(true);
  });

  it("hiện số trận trong lựa chọn", () => {
    setup();
    fireEvent.keyDown(screen.getByRole("combobox", { name: "Cặp A, người 1" }), { key: "Enter" });
    expect(screen.getByRole("option", { name: "Chi · 4 trận" })).toBeTruthy();
  });

  it("chọn trùng người: báo lỗi, không gọi onSave", () => {
    setup();
    pick("Cặp A, người 1", /^Chi/);
    expect(screen.getByRole("alert").textContent).toBe(LINEUP_INVALID);
    expect(saveButton().disabled).toBe(true);
    expect(onSave).not.toHaveBeenCalled();
  });

  it("đổi một người: gọi onSave với lineup mới", async () => {
    onSave.mockResolvedValue({ ok: true, data: undefined });
    setup();
    pick("Cặp A, người 1", /^Em/);
    expect(saveButton().disabled).toBe(false);
    fireEvent.click(saveButton());
    await waitFor(() =>
      expect(onSave).toHaveBeenCalledWith({ teamA: ["e", "b"], teamB: ["c", "d"] }),
    );
  });

  it("CONFLICT: hiện thông báo và tải lại", async () => {
    onSave.mockResolvedValue({ ok: false, code: "CONFLICT", message: "Trận này vừa được đổi" });
    setup();
    pick("Cặp A, người 1", /^Em/);
    fireEvent.click(saveButton());
    await waitFor(() =>
      expect(screen.getByRole("alert").textContent).toBe("Trận này vừa được đổi"),
    );
    expect(refresh).toHaveBeenCalled();
  });
});
