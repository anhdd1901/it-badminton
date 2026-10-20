import { expect, test, type Page } from "@playwright/test";
import { createDb } from "../src/server/db/client";
import { PASSWORD, resetAndSeed } from "./seed";

// This spec changes roles and active state, so it restores the seeded state around itself.
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

async function login(page: Page, username: string) {
  await page.goto("/dang-nhap");
  await page.getByLabel("Tên đăng nhập").fill(username);
  await page.getByLabel("Mật khẩu").fill(PASSWORD);
  await page.getByRole("button", { name: "Đăng nhập" }).click();
  await expect(page.getByText("Thứ 7, 17/10/2026")).toBeVisible();
}

test("admin thêm mem giang, giang đăng nhập được", async ({ page, browser }) => {
  await login(page, "admin");
  await page.goto("/toi/quan-ly-mem");
  await page.getByRole("button", { name: "Thêm mem", exact: true }).click();
  const dialog = page.getByRole("dialog");
  await dialog.getByLabel("Tên hiển thị").fill("Giang");
  await dialog.getByLabel("Tên đăng nhập").fill("giang");
  await dialog.getByLabel("Mật khẩu").fill(PASSWORD);
  await expect(dialog.getByLabel("ELO ban đầu")).toHaveValue("1000");
  await dialog.getByRole("button", { name: "Thêm mem" }).click();
  await expect(dialog).toBeHidden();
  await expect(page.getByRole("button", { name: /Giang \(@giang\)/ })).toBeVisible();

  const other = await browser.newContext();
  const page2 = await other.newPage();
  await login(page2, "giang");
  await other.close();
});

test("phiên bị vô hiệu khi admin ngưng mem: thao tác tiếp theo về /dang-nhap", async ({
  browser,
}) => {
  const ctxB = await browser.newContext();
  const b = await ctxB.newPage();
  await login(b, "emm");

  const ctxA = await browser.newContext();
  const a = await ctxA.newPage();
  await login(a, "admin");
  await a.goto("/toi/quan-ly-mem");
  await a.getByRole("button", { name: /Em \(@emm\)/ }).click();
  await a.getByRole("button", { name: "Ngưng hoạt động" }).click();
  await a.getByRole("button", { name: "Ngưng hoạt động" }).last().click();
  await expect(a.getByRole("dialog")).toBeHidden();
  await expect(a.getByRole("button", { name: /Em \(@emm\)/ })).toBeHidden();

  await b.getByRole("button", { name: "Điểm danh", exact: true }).click();
  await expect(b).toHaveURL(/\/dang-nhap/);
  await ctxA.close();
  await ctxB.close();
});

test("subadmin mở quản lý mem: không có quyền", async ({ page }) => {
  await login(page, "phu");
  await page.goto("/toi/quan-ly-mem");
  await expect(page.getByText("Bạn không có quyền làm việc này")).toBeVisible();
});

// Chạy cuối file vì đổi dữ liệu seed.
test("admin chuyển quyền cho phu", async ({ page, browser }) => {
  await login(page, "admin");
  await page.goto("/toi/quan-ly-mem");
  await page.getByRole("button", { name: /Phú \(@phu\)/ }).click();
  await page.getByRole("button", { name: "Chuyển quyền admin" }).click();
  await page.getByLabel("Mật khẩu của bạn").fill(PASSWORD);
  await page.getByRole("button", { name: "Chuyển quyền" }).click();
  await expect(page).toHaveURL(/\/toi$/);
  await expect(page.getByRole("link", { name: "Quản lý mem" })).toBeHidden();

  const other = await browser.newContext();
  const page2 = await other.newPage();
  await login(page2, "phu");
  await page2.goto("/toi");
  await expect(page2.getByRole("link", { name: "Quản lý mem" })).toBeVisible();
  await other.close();
});
