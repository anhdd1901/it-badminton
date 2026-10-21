// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { SeasonId } from "@/domain/types";
import { PlayerFocusProvider } from "./player-focus";
import { PlayerName } from "./player-name";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: vi.fn(), refresh: vi.fn() }),
  unstable_rethrow: (e: unknown) => {
    throw e;
  },
}));
vi.mock("sonner", () => ({ toast: { error: vi.fn() } }));
const action = vi.fn();
vi.mock("@/app/_actions/member-profile", () => ({
  getMemberProfileAction: (...a: unknown[]) => action(...a),
}));

const SEASON = "2026-10" as SeasonId;
const A = { id: "a", displayName: "An" };
const B = { id: "b", displayName: "Bình" };

function setup() {
  render(
    <PlayerFocusProvider>
      <PlayerName player={A} season={SEASON} />
      <PlayerName player={A} season={SEASON}>
        An lần hai
      </PlayerName>
      <PlayerName player={B} season={SEASON} />
    </PlayerFocusProvider>,
  );
  return {
    a1: screen.getByRole("button", { name: "An" }),
    a2: screen.getByRole("button", { name: "An lần hai" }),
    b: screen.getByRole("button", { name: "Bình" }),
  };
}

afterEach(cleanup);

describe("PlayerName", () => {
  it("rê vào một tên thì mọi tên cùng id trong provider có data-focused, rời thì bỏ", () => {
    const { a1, a2, b } = setup();
    fireEvent.pointerEnter(a1, { pointerType: "mouse" });
    expect(a1).toHaveAttribute("data-focused");
    expect(a2).toHaveAttribute("data-focused");
    expect(b).not.toHaveAttribute("data-focused");
    fireEvent.pointerLeave(a1, { pointerType: "mouse" });
    expect(a1).not.toHaveAttribute("data-focused");
    expect(a2).not.toHaveAttribute("data-focused");
  });

  it("pointerType touch không highlight", () => {
    const { a1, a2 } = setup();
    fireEvent.pointerEnter(a1, { pointerType: "touch" });
    expect(a1).not.toHaveAttribute("data-focused");
    expect(a2).not.toHaveAttribute("data-focused");
  });

  it("id khác không highlight", () => {
    const { a1, b } = setup();
    fireEvent.pointerEnter(b, { pointerType: "mouse" });
    expect(a1).not.toHaveAttribute("data-focused");
    expect(b).toHaveAttribute("data-focused");
  });

  it("không có provider vẫn render và bấm được (không lỗi)", () => {
    action.mockReturnValue(new Promise(() => {}));
    render(<PlayerName player={A} season={SEASON} />);
    const el = screen.getByRole("button", { name: "An" });
    fireEvent.pointerEnter(el, { pointerType: "mouse" });
    fireEvent.click(el);
    expect(el).not.toHaveAttribute("data-focused");
  });

  it("bấm tên mở popup", async () => {
    action.mockReturnValue(new Promise(() => {}));
    setup();
    fireEvent.click(screen.getByRole("button", { name: "Bình" }));
    expect(await screen.findByRole("dialog")).toBeInTheDocument();
  });

  it("focus bàn phím highlight, blur bỏ highlight", () => {
    const { a1, a2 } = setup();
    a1.matches = () => true;
    fireEvent.focus(a1);
    expect(a2).toHaveAttribute("data-focused");
    fireEvent.blur(a1);
    expect(a2).not.toHaveAttribute("data-focused");
  });

  it("focus không phải focus-visible thì không highlight", () => {
    const { a1 } = setup();
    a1.matches = () => false;
    fireEvent.focus(a1);
    expect(a1).not.toHaveAttribute("data-focused");
  });

  it("blur của tên khác không xóa highlight do chuột đặt", () => {
    const { a1, b } = setup();
    fireEvent.pointerEnter(a1, { pointerType: "mouse" });
    fireEvent.blur(b);
    expect(a1).toHaveAttribute("data-focused");
  });
});
