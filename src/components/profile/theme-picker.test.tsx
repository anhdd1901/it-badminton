// @vitest-environment jsdom
import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { ThemePicker } from "./theme-picker";

afterEach(() => {
  document.cookie = "theme=; path=/; max-age=0";
  delete document.documentElement.dataset.theme;
});

describe("ThemePicker", () => {
  it("chọn Tối: đặt data-theme và ghi cookie", () => {
    render(<ThemePicker value="system" />);
    fireEvent.click(screen.getByRole("button", { name: "Tối" }));
    expect(document.documentElement.dataset.theme).toBe("dark");
    expect(document.cookie).toContain("theme=dark");
    expect(screen.getByRole("button", { name: "Tối" }).getAttribute("aria-pressed")).toBe("true");
  });

  it("chọn Theo thiết bị: bỏ data-theme và xóa cookie", () => {
    render(<ThemePicker value="dark" />);
    document.documentElement.dataset.theme = "dark";
    document.cookie = "theme=dark; path=/";
    fireEvent.click(screen.getByRole("button", { name: "Theo thiết bị" }));
    expect(document.documentElement.dataset.theme).toBeUndefined();
    expect(document.cookie).not.toContain("theme=");
  });
});
