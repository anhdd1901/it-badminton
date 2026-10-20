// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { StatsFilter } from "./stats-filter";

const members = [
  { id: "m1", displayName: "An", username: "an", avatarUrl: null, active: true },
  { id: "m2", displayName: "Bình", username: "binh", avatarUrl: null, active: false },
];

describe("StatsFilter", () => {
  it("giữ xem và giá trị lọc, Bỏ lọc trỏ về chế độ xem hiện tại", () => {
    const { container } = render(
      <StatsFilter value={{ view: "cap", from: "2026-03" }} members={members} />,
    );
    expect((container.querySelector('input[name="tu"]') as HTMLInputElement).value).toBe("2026-03");
    expect((container.querySelector('input[name="xem"]') as HTMLInputElement).value).toBe("cap");
    expect(container.querySelector("form")?.getAttribute("method")).toBe("get");
    expect(screen.getByRole("link", { name: "Bỏ lọc" }).getAttribute("href")).toBe(
      "/thong-ke?xem=cap",
    );
  });
  it("select mem có Tất cả mem và đánh dấu mem đã ngưng", () => {
    render(<StatsFilter value={{ view: "mem", memberId: "m2" }} members={members} />);
    const select = screen.getByLabelText("Mem") as HTMLSelectElement;
    expect(select.options[0].textContent).toBe("Tất cả mem");
    expect(screen.getByRole("option", { name: "Bình (đã ngưng)" })).toBeTruthy();
    expect(select.value).toBe("m2");
  });
});
