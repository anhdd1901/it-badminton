// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/app/_lib/session", () => ({ getActor: async () => null }));
vi.mock("next/navigation", () => ({ redirect: vi.fn() }));
vi.mock("./login-form", () => ({ LoginForm: () => <form aria-label="Đăng nhập" /> }));

import LoginPage from "./page";

describe("LoginPage", () => {
  it("nằm trên nền chrome với tiêu đề font hiển thị", async () => {
    const { container } = render(await LoginPage());
    expect(container.querySelector("main")?.className).toContain("bg-chrome");
    const h1 = screen.getByRole("heading", { name: "ANH EM IT" });
    for (const c of ["font-display", "italic", "text-on-chrome"]) expect(h1.className).toContain(c);
    expect(h1.className).not.toContain("text-accent-text");
  });

  it("có lưới trang trí và form trong khối bg-surface", async () => {
    const { container } = render(await LoginPage());
    const net = container.querySelector(".net");
    expect(net?.getAttribute("aria-hidden")).toBe("true");
    const form = screen.getByRole("form", { name: "Đăng nhập" });
    expect(form.closest(".bg-surface")).not.toBeNull();
  });
});
