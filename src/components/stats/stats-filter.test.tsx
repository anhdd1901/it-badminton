// @vitest-environment jsdom
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { SeasonId } from "@/domain/types";
import { StatsFilter } from "./stats-filter";

const members = [
  { id: "m1", displayName: "An", active: true },
  { id: "m2", displayName: "Bình", active: false },
];
const bounds = { min: "2026-01" as SeasonId, max: "2026-10" as SeasonId };
const hidden = (c: HTMLElement, name: string) =>
  (c.querySelector(`input[name="${name}"]`) as HTMLInputElement).value;

describe("StatsFilter", () => {
  it("giữ xem và giá trị lọc, Bỏ lọc trỏ về chế độ xem hiện tại", () => {
    const { container } = render(
      <StatsFilter
        value={{ view: "cap", from: "2026-03", to: "2026-05" }}
        members={members}
        bounds={bounds}
      />,
    );
    expect(hidden(container, "tu")).toBe("2026-03");
    expect(hidden(container, "den")).toBe("2026-05");
    expect(hidden(container, "xem")).toBe("cap");
    expect(container.querySelector("form")?.getAttribute("method")).toBe("get");
    expect(screen.getByRole("link", { name: "Bỏ lọc" }).getAttribute("href")).toBe(
      "/thong-ke?xem=cap",
    );
    expect(screen.getByLabelText("Từ tháng").textContent).toBe("Tháng 3/2026");
    expect(screen.getByLabelText("Đến tháng").textContent).toBe("Tháng 5/2026");
  });

  it("không có label hiện ra; Bỏ lọc cùng kiểu nút outline như Đăng xuất", () => {
    const { container } = render(
      <StatsFilter value={{ view: "mem" }} members={members} bounds={bounds} />,
    );
    expect(container.querySelector("label")).toBeNull();
    expect(screen.getByRole("link", { name: "Bỏ lọc" }).className).toContain("border-border");
  });

  it("ô trống hiện Từ tháng / Đến tháng và gửi chuỗi rỗng", () => {
    const { container } = render(
      <StatsFilter value={{ view: "mem" }} members={members} bounds={bounds} />,
    );
    expect(screen.getByLabelText("Từ tháng").textContent).toBe("Từ tháng");
    expect(hidden(container, "tu")).toBe("");
    expect(hidden(container, "den")).toBe("");
    expect(hidden(container, "mem")).toBe("");
  });

  it("nút Xóa đưa ô từ tháng về trống", () => {
    const { container } = render(
      <StatsFilter value={{ view: "mem", from: "2026-03" }} members={members} bounds={bounds} />,
    );
    fireEvent.click(screen.getByLabelText("Từ tháng"));
    fireEvent.click(screen.getByRole("button", { name: "Xóa" }));
    expect(hidden(container, "tu")).toBe("");
    expect(screen.getByLabelText("Từ tháng").textContent).toBe("Từ tháng");
  });

  it("Select mem hiện Tất cả mem khi không chọn, tên kèm (đã ngưng) khi có", () => {
    const a = render(<StatsFilter value={{ view: "mem" }} members={members} bounds={bounds} />);
    expect(screen.getByLabelText("Mem").textContent).toBe("Tất cả mem");
    expect(hidden(a.container, "mem")).toBe("");
    a.unmount();
    const b = render(
      <StatsFilter value={{ view: "mem", memberId: "m2" }} members={members} bounds={bounds} />,
    );
    expect(screen.getByLabelText("Mem").textContent).toBe("Bình (đã ngưng)");
    expect(hidden(b.container, "mem")).toBe("m2");
  });

  it("không dùng input month hay select gốc", () => {
    const { container } = render(
      <StatsFilter value={{ view: "mem" }} members={members} bounds={bounds} />,
    );
    expect(container.querySelector('input[type="month"]')).toBeNull();
    // Radix renders an aria-hidden native select inside forms for autofill; it has no name.
    expect(container.querySelector("select:not([aria-hidden])")).toBeNull();
    expect(container.querySelector("select[name]")).toBeNull();
  });
});
