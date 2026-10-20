import { expect, test } from "@playwright/test";
import { PASSWORD } from "./seed";

test("Tuần này: ngày, trạng thái và số người điểm danh", async ({ page }) => {
  await page.goto("/dang-nhap");
  await page.getByLabel("Tên đăng nhập").fill("anh");
  await page.getByLabel("Mật khẩu").fill(PASSWORD);
  await page.getByRole("button", { name: "Đăng nhập" }).click();
  await expect(page.getByText("Thứ 7, 17/10/2026")).toBeVisible();
  await expect(page.getByText("Đang mở điểm danh")).toBeVisible();
  await page.getByRole("button", { name: /đã điểm danh \/ \d+ mem/ }).click();
  await expect(page.getByRole("heading", { name: "Danh sách điểm danh" })).toBeVisible();
});
