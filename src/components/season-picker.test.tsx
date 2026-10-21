// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { SeasonPicker } from "./season-picker";

const push = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ push }) }));

afterEach(() => {
  cleanup();
  push.mockClear();
});

const base = "/xep-hang?mua=";

describe("SeasonPicker", () => {
  it("bấm tháng/năm mở bộ chọn, chọn tháng gọi push(hrefBase + mùa)", () => {
    render(<SeasonPicker value="2026-10" min="2026-08" max="2026-10" hrefBase={base} />);
    fireEvent.click(screen.getByRole("button", { name: "Tháng 10/2026" }));
    const dialog = screen.getByRole("dialog");
    fireEvent.click(within(dialog).getByRole("button", { name: "Tháng 9/2026" }));
    expect(push).toHaveBeenCalledWith("/xep-hang?mua=2026-09");
  });

  it("◀ vô hiệu khi value <= min", () => {
    render(<SeasonPicker value="2026-08" min="2026-08" max="2026-10" hrefBase={base} />);
    expect(screen.queryByRole("link", { name: "Tháng trước" })).toBeNull();
    expect(screen.getByLabelText("Tháng trước").getAttribute("aria-disabled")).toBe("true");
    expect(screen.getByRole("link", { name: "Tháng sau" }).getAttribute("href")).toBe(
      "/xep-hang?mua=2026-09",
    );
  });

  it("▶ vô hiệu khi value >= max", () => {
    render(<SeasonPicker value="2026-10" min="2026-08" max="2026-10" hrefBase={base} />);
    expect(screen.queryByRole("link", { name: "Tháng sau" })).toBeNull();
    expect(screen.getByLabelText("Tháng sau").getAttribute("aria-disabled")).toBe("true");
    expect(screen.getByRole("link", { name: "Tháng trước" }).getAttribute("href")).toBe(
      "/xep-hang?mua=2026-09",
    );
  });

  it("value ngoài [min, max] không làm vỡ", () => {
    render(<SeasonPicker value="2026-05" min="2026-08" max="2026-10" hrefBase={base} />);
    expect(screen.getByLabelText("Tháng trước").getAttribute("aria-disabled")).toBe("true");
    expect(screen.getByRole("button", { name: "Tháng 5/2026" })).toBeTruthy();
  });
});
