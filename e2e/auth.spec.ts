import { expect, test } from "@playwright/test";
import sharp from "sharp";
import { createDb } from "../src/server/db/client";
import { PASSWORD, resetAndSeed } from "./seed";

async function login(page: import("@playwright/test").Page, username: string, password: string) {
  await page.goto("/dang-nhap");
  await page.getByLabel("Tên đăng nhập").fill(username);
  await page.getByLabel("Mật khẩu").fill(password);
  await page.getByRole("button", { name: "Đăng nhập" }).click();
}

test("chưa đăng nhập: vào / bị chuyển về /dang-nhap", async ({ page }) => {
  await page.goto("/");
  await expect(page).toHaveURL(/\/dang-nhap$/);
  await expect(page.getByRole("heading", { name: "ANH EM IT" })).toBeVisible();
});

test("sai mật khẩu hiện lỗi dưới form", async ({ page }) => {
  await login(page, "anh", "saimatkhau");
  await expect(page.locator("form [role=alert]")).toHaveText("Sai tên đăng nhập hoặc mật khẩu");
  await expect(page).toHaveURL(/\/dang-nhap$/);
});

test("đăng nhập, CSP có nonce, đăng xuất xóa cookie", async ({ page, context }) => {
  const responses: string[] = [];
  page.on("response", (r) => {
    if (r.request().resourceType() === "document") {
      const csp = r.headers()["content-security-policy"];
      if (csp) responses.push(csp);
    }
  });

  await login(page, "anh", PASSWORD);
  await expect(page).toHaveURL(/\/$/);
  await expect(page).toHaveTitle("ANH EM IT");
  const nav = page.getByRole("navigation", { name: "Điều hướng chính" });
  await expect(nav).toBeVisible();
  await expect(nav.getByRole("link", { name: "Tuần này" })).toHaveAttribute("aria-current", "page");
  expect(responses.some((c) => c.includes("nonce-"))).toBe(true);
  expect((await context.cookies()).some((c) => c.name === "aei_session")).toBe(true);

  await nav.getByRole("link", { name: "Tôi" }).click();
  await page.getByRole("button", { name: "Đăng xuất" }).click();
  await expect(page).toHaveURL(/\/dang-nhap$/);
  expect((await context.cookies()).some((c) => c.name === "aei_session")).toBe(false);

  await page.goto("/");
  await expect(page).toHaveURL(/\/dang-nhap$/);
});

test("đăng nhập khi đang giữ cookie phiên cũ vẫn thành công", async ({ page, context }) => {
  await context.addCookies([
    { name: "aei_session", value: "stale-invalid-token", url: "http://localhost:3100" },
  ]);
  await login(page, "binh", PASSWORD);
  await expect(page).toHaveURL(/\/$/);
  await expect(page.getByRole("heading", { name: "Tuần này" })).toBeVisible();
});

test.describe("màn Tôi", () => {
  async function reset() {
    const url = process.env.DATABASE_URL_E2E;
    if (!url) throw new Error("DATABASE_URL_E2E is not set");
    const { db, close } = createDb(url);
    try {
      await resetAndSeed(db);
    } finally {
      await close();
    }
  }
  test.beforeAll(reset);
  test.afterAll(reset);

  test("đổi tên hiển thị và tải ảnh đại diện", async ({ page }) => {
    await login(page, "anh", PASSWORD);
    await expect(page).toHaveURL(/\/$/);
    await page.goto("/toi");
    await page.getByLabel("Tên hiển thị").fill("An Mới");
    await page.getByRole("button", { name: "Lưu tên" }).click();
    await expect(page.getByRole("status")).toHaveText("Đã lưu tên");
    await expect(page.locator("main").getByText("An Mới", { exact: true })).toBeVisible();

    const png = await sharp({
      create: { width: 64, height: 64, channels: 3, background: "#3366cc" },
    })
      .png()
      .toBuffer();
    await page
      .locator('input[type="file"]')
      .setInputFiles({ name: "a.png", mimeType: "image/png", buffer: png });
    await expect(page.getByAltText("Ảnh xem trước")).toBeVisible();
    await page.getByRole("button", { name: "Lưu ảnh" }).click();
    await expect(page.getByRole("button", { name: "Xóa ảnh" })).toBeVisible();
    await expect(page.locator("main img").first()).toHaveAttribute("src", /^\/anh-dai-dien\//);
  });
});
