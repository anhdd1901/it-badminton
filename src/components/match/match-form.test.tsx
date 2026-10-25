// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { LINEUP_INVALID } from "@/domain/lineup";
import { MatchForm } from "./match-form";

const refresh = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ replace: vi.fn(), refresh }) }));

const onSaveScores = vi.fn();
const onChangePlayers = vi.fn();
const onDelete = vi.fn();
const onDone = vi.fn();
const ok = { ok: true, data: undefined };

const person = (id: string, displayName: string) => ({ id, displayName, avatarUrl: null });
const roster = [
  person("a", "An"),
  person("b", "Bình"),
  person("c", "Chi"),
  person("d", "Dũng"),
  person("e", "Em"),
];
const counts = new Map([
  ["a", 4],
  ["b", 4],
  ["c", 4],
  ["d", 3],
  ["e", 3],
]);
const teamA: [ReturnType<typeof person>, ReturnType<typeof person>] = [roster[0], roster[1]];
const teamB: [ReturnType<typeof person>, ReturnType<typeof person>] = [roster[2], roster[3]];

beforeEach(() => {
  for (const f of [onSaveScores, onChangePlayers, onDelete, onDone, refresh]) f.mockReset();
  // Radix Select needs these in jsdom.
  Element.prototype.hasPointerCapture ??= () => false;
  Element.prototype.setPointerCapture ??= () => {};
  Element.prototype.releasePointerCapture ??= () => {};
  Element.prototype.scrollIntoView ??= () => {};
});
afterEach(cleanup);

function setup(
  o: { scores?: { scoreA: number; scoreB: number } | null; lineup?: boolean; del?: boolean } = {},
) {
  return render(
    <MatchForm
      teamA={teamA}
      teamB={teamB}
      initialScores={o.scores ?? null}
      lineup={o.lineup ? { roster, counts } : undefined}
      onSaveScores={onSaveScores}
      onChangePlayers={onChangePlayers}
      onDelete={o.del ? onDelete : undefined}
      onDone={onDone}
    />,
  );
}
const scoreA = () => screen.getByLabelText("Tỷ số cặp A") as HTMLInputElement;
const scoreB = () => screen.getByLabelText("Tỷ số cặp B") as HTMLInputElement;
const type = (a: string, b: string) => {
  fireEvent.change(scoreA(), { target: { value: a } });
  fireEvent.change(scoreB(), { target: { value: b } });
};
const submit = () => fireEvent.click(screen.getByRole("button", { name: "Lưu kết quả" }));
function pick(label: string, option: RegExp | string) {
  fireEvent.keyDown(screen.getByRole("combobox", { name: label }), { key: "Enter" });
  fireEvent.click(screen.getByRole("option", { name: option }));
}

describe("MatchForm: tỷ số", () => {
  it("không còn dòng mô tả và khối Người chơi", () => {
    setup({ lineup: true });
    expect(screen.queryByText("Nhập tỷ số một ván")).toBeNull();
    expect(screen.queryByRole("heading", { name: "Người chơi" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Lưu người chơi" })).toBeNull();
  });

  it("ô tỷ số không còn label tên hai mem", () => {
    setup();
    expect(screen.queryByText("An & Bình")).toBeNull();
  });

  it("một ô trống: báo lỗi, không gọi gì", () => {
    setup();
    type("21", "");
    submit();
    expect(screen.getByRole("alert").textContent).toBe("Nhập tỷ số cho cả hai cặp");
    expect(onSaveScores).not.toHaveBeenCalled();
  });

  it.each([
    ["abc", "5", "Tỷ số phải là số nguyên từ 0 trở lên"],
    ["21", "20", "Tỷ số 21–20 không hợp lệ: chưa cách 2 điểm, phải đánh tiếp"],
    ["30", "30", "Không có tỷ số hòa"],
  ])("%s/%s → %s", (a, b, msg) => {
    setup();
    type(a, b);
    submit();
    expect(screen.getByRole("alert").textContent).toBe(msg);
    expect(onSaveScores).not.toHaveBeenCalled();
  });

  it("tỷ số hợp lệ: gọi onSaveScores rồi onDone", async () => {
    onSaveScores.mockResolvedValue(ok);
    setup();
    type("21", "15");
    submit();
    await waitFor(() => expect(onSaveScores).toHaveBeenCalledWith({ scoreA: 21, scoreB: 15 }));
    await waitFor(() => expect(onDone).toHaveBeenCalled());
    expect(onChangePlayers).not.toHaveBeenCalled();
  });

  it("CONFLICT: hiện message, làm mới, xóa giá trị đã nhập", async () => {
    const message = "Trận này vừa được nhập 21–19, hãy tải lại";
    onSaveScores.mockResolvedValue({ ok: false, code: "CONFLICT", message });
    setup();
    type("21", "15");
    submit();
    await waitFor(() => expect(screen.getByRole("alert").textContent).toBe(message));
    expect(refresh).toHaveBeenCalled();
    expect(scoreA().value).toBe("");
    submit();
    expect(screen.getByRole("alert").textContent).toBe("Nhập tỷ số cho cả hai cặp");
    expect(onSaveScores).toHaveBeenCalledTimes(1);
  });

  it("lỗi được gắn với hai ô nhập", () => {
    setup();
    type("21", "");
    submit();
    const alert = screen.getByRole("alert");
    expect(scoreA().getAttribute("aria-invalid")).toBe("true");
    expect(scoreA().getAttribute("aria-describedby")).toBe(alert.id);
  });

  it("có kết quả: Xóa kết quả gọi onDelete rồi onDone", async () => {
    onDelete.mockResolvedValue(ok);
    setup({ scores: { scoreA: 21, scoreB: 15 }, del: true });
    fireEvent.click(screen.getByRole("button", { name: "Xóa kết quả" }));
    await waitFor(() => expect(onDelete).toHaveBeenCalled());
    await waitFor(() => expect(onDone).toHaveBeenCalled());
  });

  it("không có gì đổi: không gọi server, đóng popup", async () => {
    setup({ scores: { scoreA: 21, scoreB: 15 }, lineup: true });
    submit();
    await waitFor(() => expect(onDone).toHaveBeenCalled());
    expect(onSaveScores).not.toHaveBeenCalled();
    expect(onChangePlayers).not.toHaveBeenCalled();
  });
});

describe("MatchForm: người chơi", () => {
  it("có lineup: bốn ô chọn mem; không lineup: không có ô chọn", () => {
    setup({ lineup: true });
    expect(screen.getAllByRole("combobox")).toHaveLength(4);
    cleanup();
    setup();
    expect(screen.queryAllByRole("combobox")).toHaveLength(0);
    expect(screen.getByText("An")).toBeTruthy();
  });

  it("danh sách chọn hiện tên và số trận", () => {
    setup({ lineup: true });
    fireEvent.keyDown(screen.getByRole("combobox", { name: "Cặp A, người 1" }), { key: "Enter" });
    expect(screen.getByRole("option", { name: "Chi · 4 trận" })).toBeTruthy();
  });

  it("chọn trùng người: báo lỗi, không gọi onChangePlayers", () => {
    setup({ lineup: true });
    pick("Cặp A, người 1", /^Chi/);
    expect(screen.getByRole("alert").textContent).toBe(LINEUP_INVALID);
    type("21", "15");
    submit();
    expect(onChangePlayers).not.toHaveBeenCalled();
    expect(onSaveScores).not.toHaveBeenCalled();
  });

  it("đổi mem và nhập tỷ số: lưu người chơi trước rồi tỷ số, rồi đóng", async () => {
    const order: string[] = [];
    onChangePlayers.mockImplementation(async () => (order.push("players"), ok));
    onSaveScores.mockImplementation(async () => (order.push("scores"), ok));
    setup({ lineup: true });
    pick("Cặp A, người 1", /^Em/);
    type("21", "15");
    submit();
    await waitFor(() => expect(onDone).toHaveBeenCalled());
    expect(onChangePlayers).toHaveBeenCalledWith({ teamA: ["e", "b"], teamB: ["c", "d"] });
    expect(onSaveScores).toHaveBeenCalledWith({ scoreA: 21, scoreB: 15 });
    expect(order).toEqual(["players", "scores"]);
  });

  it("chỉ đổi mem, tỷ số để trống: chỉ lưu người chơi", async () => {
    onChangePlayers.mockResolvedValue(ok);
    setup({ lineup: true });
    pick("Cặp A, người 1", /^Em/);
    submit();
    await waitFor(() => expect(onDone).toHaveBeenCalled());
    expect(onSaveScores).not.toHaveBeenCalled();
  });

  it("tỷ số sai: không lưu cả người chơi", () => {
    setup({ lineup: true });
    pick("Cặp A, người 1", /^Em/);
    type("21", "20");
    submit();
    expect(onChangePlayers).not.toHaveBeenCalled();
    expect(screen.getByRole("alert").textContent).toContain("không hợp lệ");
  });

  it("đã có kết quả, chỉ đổi mem: không lưu lại tỷ số cũ", async () => {
    onChangePlayers.mockResolvedValue(ok);
    setup({ lineup: true, scores: { scoreA: 21, scoreB: 15 } });
    pick("Cặp A, người 1", /^Em/);
    submit();
    await waitFor(() => expect(onDone).toHaveBeenCalled());
    expect(onSaveScores).not.toHaveBeenCalled();
  });

  it("lưu người chơi lỗi CONFLICT: hiện thông báo, làm mới, không lưu tỷ số", async () => {
    onChangePlayers.mockResolvedValue({
      ok: false,
      code: "CONFLICT",
      message: "Trận này vừa được đổi",
    });
    setup({ lineup: true });
    pick("Cặp A, người 1", /^Em/);
    type("21", "15");
    submit();
    await waitFor(() =>
      expect(screen.getByRole("alert").textContent).toBe("Trận này vừa được đổi"),
    );
    expect(refresh).toHaveBeenCalled();
    expect(onSaveScores).not.toHaveBeenCalled();
    expect(onDone).not.toHaveBeenCalled();
  });

  it("người chơi đã lưu nhưng tỷ số lỗi: hiện lỗi, làm mới, không đóng", async () => {
    onChangePlayers.mockResolvedValue(ok);
    onSaveScores.mockResolvedValue({ ok: false, code: "LOCKED", message: "Buổi đã khóa" });
    setup({ lineup: true });
    pick("Cặp A, người 1", /^Em/);
    type("21", "15");
    submit();
    await waitFor(() => expect(screen.getByRole("alert").textContent).toBe("Buổi đã khóa"));
    expect(refresh).toHaveBeenCalled();
    expect(onDone).not.toHaveBeenCalled();
  });

  it("CONFLICT rồi lịch mới về: lựa chọn về lịch mới", async () => {
    onChangePlayers.mockResolvedValue({ ok: false, code: "CONFLICT", message: "Đã đổi" });
    const props = { roster, counts };
    const { rerender } = setup({ lineup: true });
    pick("Cặp A, người 1", /^Em/);
    submit();
    await waitFor(() => expect(screen.getByRole("alert")).toBeTruthy());
    rerender(
      <MatchForm
        teamA={[roster[1], roster[0]]}
        teamB={[roster[3], roster[4]]}
        initialScores={null}
        lineup={props}
        onSaveScores={onSaveScores}
        onChangePlayers={onChangePlayers}
        onDone={onDone}
      />,
    );
    const text = (l: string) => screen.getByRole("combobox", { name: l }).textContent;
    expect(text("Cặp A, người 1")).toContain("Bình");
    expect(text("Cặp B, người 2")).toContain("Em");
  });

  it("lưu người chơi xong, tỷ số lỗi LOCKED: không đưa ô chọn về đội hình cũ", async () => {
    onChangePlayers.mockResolvedValue(ok);
    onSaveScores.mockResolvedValue({ ok: false, code: "LOCKED", message: "Buổi đã khóa" });
    setup({ lineup: true });
    pick("Cặp A, người 1", /^Em/);
    type("21", "15");
    submit();
    await waitFor(() => expect(screen.getByRole("alert").textContent).toBe("Buổi đã khóa"));
    expect(screen.getByRole("combobox", { name: "Cặp A, người 1" }).textContent).toContain("Em");
  });

  it("lỗi đội hình không đánh dấu hai ô tỷ số là sai", async () => {
    onChangePlayers.mockResolvedValue({ ok: false, code: "CONFLICT", message: "Đã đổi" });
    setup({ lineup: true });
    pick("Cặp A, người 1", /^Em/);
    submit();
    await waitFor(() => expect(screen.getByRole("alert").textContent).toBe("Đã đổi"));
    expect(scoreA().getAttribute("aria-invalid")).toBeNull();
    expect(scoreA().getAttribute("aria-describedby")).toBeNull();
  });
});
