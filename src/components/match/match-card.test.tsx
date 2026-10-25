// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { SeasonId } from "@/domain/types";
import { PlayerFocusProvider } from "@/components/player-focus";
import type { WeekMatch } from "@/server/views/week";
import { MatchCard } from "./match-card";

vi.mock("next/navigation", () => ({ useRouter: () => ({ replace: vi.fn(), refresh: vi.fn() }) }));
vi.mock("sonner", () => ({ toast: { error: vi.fn() } }));
vi.mock("@/app/_actions/member-profile", () => ({ getMemberProfileAction: vi.fn() }));
vi.mock("@/app/_actions/results", () => ({
  saveResultAction: vi.fn(),
  deleteResultAction: vi.fn(),
  changePlayersAction: vi.fn(),
}));

const SEASON = "2026-10" as SeasonId;
afterEach(cleanup);

const p = (id: string, seed: 1 | 2 | null = null) => ({
  id,
  displayName: `Mem ${id}`,
  avatarUrl: null,
  seed,
});
function match(result: WeekMatch["result"], seed: 1 | 2 | null = null): WeekMatch {
  return { number: 1, teamA: [p("a", seed), p("b")], teamB: [p("c"), p("d")], result };
}

describe("MatchCard", () => {
  it("cặp thắng text-win, cặp thua text-loss", () => {
    render(
      <MatchCard
        match={match({ scoreA: 21, scoreB: 15, version: 1 })}
        editable={false}
        day="2026-10-17"
        scheduleKey="k"
        season={SEASON}
      />,
    );
    expect(screen.getByTestId("team-a").className).toContain("text-win");
    expect(screen.getByTestId("team-b").className).toContain("text-loss");
    expect(screen.getByTestId("score-a").textContent).toBe("21");
  });

  it("chưa có kết quả: hai ô –", () => {
    render(
      <MatchCard match={match(null)} editable={false} day="d" scheduleKey="k" season={SEASON} />,
    );
    expect(screen.getAllByText("–")).toHaveLength(2);
  });

  it("seed 1 có chấm có aria-label", () => {
    render(
      <MatchCard match={match(null, 1)} editable={false} day="d" scheduleKey="k" season={SEASON} />,
    );
    expect(screen.getByLabelText("Hạt giống 1")).toBeTruthy();
  });

  it("tên mem trong thẻ là nút mở popup, kể cả khi thẻ sửa được", () => {
    for (const editable of [false, true]) {
      render(
        <MatchCard
          match={match(null)}
          editable={editable}
          day="d"
          scheduleKey="k"
          season={SEASON}
        />,
      );
      expect(screen.getByRole("button", { name: "Mem a" })).toBeTruthy();
      cleanup();
    }
  });

  it("thẻ sửa được: không có nút lồng trong nút", () => {
    render(<MatchCard match={match(null)} editable day="d" scheduleKey="k" season={SEASON} />);
    const buttons = screen.getAllByRole("button");
    expect(buttons.length).toBe(5);
    for (const b of buttons) expect(b.querySelector("button")).toBeNull();
  });

  it("nút Nhập tỷ số trận N vẫn mở popup nhập tỷ số", () => {
    render(<MatchCard match={match(null)} editable day="d" scheduleKey="k" season={SEASON} />);
    fireEvent.click(screen.getByRole("button", { name: "Nhập tỷ số trận 1" }));
    expect(screen.getByRole("dialog")).toBeTruthy();
    expect(within(screen.getByRole("dialog")).getByText("Trận 1")).toBeTruthy();
  });

  it("hover tên một mem tô mọi vị trí của mem đó trong các thẻ cùng provider", () => {
    const m2: WeekMatch = {
      ...match(null),
      number: 2,
      teamA: [p("a"), p("c")],
      teamB: [p("b"), p("d")],
    };
    render(
      <PlayerFocusProvider>
        <MatchCard match={match(null)} editable day="d" scheduleKey="k" season={SEASON} />
        <MatchCard match={m2} editable={false} day="d" scheduleKey="k" season={SEASON} />
      </PlayerFocusProvider>,
    );
    const as = screen.getAllByRole("button", { name: "Mem a" });
    expect(as).toHaveLength(2);
    fireEvent.pointerEnter(as[0], { pointerType: "mouse" });
    for (const a of as) expect(a).toHaveAttribute("data-focused");
    expect(screen.getAllByRole("button", { name: "Mem b" })[0]).not.toHaveAttribute("data-focused");
  });
});

describe("MatchCard court style", () => {
  const r = (
    editable: boolean,
    res: WeekMatch["result"] = { scoreA: 21, scoreB: 15, version: 1 },
  ) =>
    render(
      <MatchCard match={match(res)} editable={editable} day="d" scheduleKey="k" season={SEASON} />,
    );

  it("có lưới ngang giữa hai đội, ẩn với trình đọc màn hình", () => {
    r(false);
    const net = screen.getByTestId("net");
    expect(net.getAttribute("aria-hidden")).toBe("true");
    expect(net.querySelectorAll(".net")).toHaveLength(2);
  });

  it.each([true, false])("lưới bị cắt đứt ở đoạn tỷ số (editable=%s)", (editable) => {
    r(editable);
    const net = screen.getByTestId("net");
    expect(net.contains(screen.getByTestId("score-a"))).toBe(false);
    expect(net.contains(screen.getByTestId("score-b"))).toBe(false);
    cleanup();
  });

  it("tỷ số nằm giữa, hai số xếp ngang theo thứ tự đội A rồi đội B", () => {
    r(false);
    const a = screen.getByTestId("team-a");
    const b = screen.getByTestId("team-b");
    const sa = screen.getByTestId("score-a");
    const sb = screen.getByTestId("score-b");
    const F = Node.DOCUMENT_POSITION_FOLLOWING;
    expect(a.compareDocumentPosition(sa) & F).toBeTruthy();
    expect(sa.compareDocumentPosition(sb) & F).toBeTruthy();
    expect(sb.compareDocumentPosition(b) & F).toBeTruthy();
    expect(sa.parentElement).toBe(sb.parentElement);
  });

  it("điểm cặp thắng màu nhấn, điểm cặp thua màu loss", () => {
    r(false);
    const a = screen.getByTestId("score-a").className;
    for (const c of ["text-accent-text", "font-display", "italic", "tabular-nums"])
      expect(a).toContain(c);
    expect(screen.getByTestId("score-b").className).toContain("text-loss");
  });

  it("không hiện số thứ tự trận", () => {
    r(false);
    expect(screen.queryByTestId("match-number")).toBeNull();
  });

  it("có lineup và editable: popup có bốn ô chọn mem và nút Lưu kết quả", () => {
    const lineup = {
      roster: [{ id: "a", displayName: "Mem a", avatarUrl: null }],
      counts: new Map([["a", 1]]),
    };
    render(
      <MatchCard
        match={match(null)}
        editable
        lineup={lineup}
        day="d"
        scheduleKey="k"
        season={SEASON}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: "Nhập tỷ số trận 1" }));
    expect(screen.getAllByRole("combobox")).toHaveLength(4);
    expect(screen.getByRole("button", { name: "Lưu kết quả" })).toBeTruthy();
  });

  it("editable mà không có lineup: không có ô chọn mem", () => {
    render(<MatchCard match={match(null)} editable day="d" scheduleKey="k" season={SEASON} />);
    fireEvent.click(screen.getByRole("button", { name: "Nhập tỷ số trận 1" }));
    expect(screen.queryAllByRole("combobox")).toHaveLength(0);
  });

  it("popup không còn mô tả: DialogContent không trỏ aria-describedby", () => {
    render(<MatchCard match={match(null)} editable day="d" scheduleKey="k" season={SEASON} />);
    fireEvent.click(screen.getByRole("button", { name: "Nhập tỷ số trận 1" }));
    expect(screen.getByRole("dialog").hasAttribute("aria-describedby")).toBe(false);
  });
});
