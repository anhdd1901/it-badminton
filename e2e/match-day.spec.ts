import { expect, test, type Page } from "@playwright/test";
import { createDb } from "../src/server/db/client";
import { PASSWORD, resetAndSeed } from "./seed";

// A ranking rowheader is the name plus the top-4 medal ("Hạng N").
const rankedName = (name: string) => new RegExp(`^${name}( Hạng \\d)?$`);

// This spec mutates the match day, so it restores the seeded state around itself
// (resetAndSeed refuses any database that is not the e2e one).
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

async function enter(page: Page, number: number, a: string, b: string) {
  await page.getByRole("button", { name: `Nhập tỷ số trận ${number}` }).click();
  const dialog = page.getByRole("dialog");
  const inputs = dialog.getByRole("textbox");
  await inputs.nth(0).fill(a);
  await inputs.nth(1).fill(b);
  await dialog.getByRole("button", { name: "Lưu tỷ số" }).click();
}

test("buổi đấu: điểm danh, lịch, nhập tỷ số, khóa buổi", async ({ page }) => {
  await login(page, "admin");

  // Admin tự điểm danh, rồi điểm danh hộ 4 mem.
  await page.getByRole("button", { name: "Điểm danh", exact: true }).click();
  await page.getByRole("button", { name: /đã điểm danh \/ \d+ mem/ }).click();
  const roster = page.getByRole("dialog");
  for (const name of ["An", "Bình", "Chi", "Dũng"]) {
    await roster.getByRole("button", { name: `Điểm danh ${name}`, exact: true }).click();
    await expect(
      roster.getByRole("button", { name: `Hủy điểm danh ${name}`, exact: true }),
    ).toBeVisible();
  }
  await page.keyboard.press("Escape");
  await expect(page.getByRole("button", { name: /^5 đã điểm danh/ })).toBeVisible();

  const cards = page.getByRole("button", { name: /^Nhập tỷ số trận \d+$/ });
  await expect(cards.first()).toBeVisible();
  const total = await cards.count();
  expect(total).toBeGreaterThan(1);
  await expect(page.getByText("Lịch nháp")).toBeVisible();

  // Tỷ số không hợp lệ: hiện lỗi, không lưu.
  await enter(page, 1, "21", "20");
  await expect(
    page.getByRole("alert").filter({ hasText: "Tỷ số 21–20 không hợp lệ" }),
  ).toBeVisible();
  // Lịch nháp: popup không có phần đổi người.
  await expect(page.getByRole("dialog").getByRole("heading", { name: "Người chơi" })).toHaveCount(
    0,
  );
  await page.keyboard.press("Escape");
  await expect(page.getByText("Đã khóa", { exact: true })).toHaveCount(0);

  // Kết quả đầu tiên chốt lịch và khóa buổi.
  await enter(page, 1, "21", "15");
  await expect(page.getByText("Đã khóa", { exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Hủy điểm danh", exact: true })).toBeDisabled();
  await expect(page.getByText("Lịch nháp")).toHaveCount(0);

  // Lịch chính thức: admin thấy phần đổi người ở popup trận khác.
  await page.getByRole("button", { name: "Nhập tỷ số trận 2" }).click();
  await expect(page.getByRole("dialog").getByRole("heading", { name: "Người chơi" })).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toHaveCount(0);

  for (let n = 2; n <= total; n++) {
    await enter(page, n, "22", "20");
    await expect(page.getByRole("dialog")).toHaveCount(0);
  }
  await expect(page.getByText("22").first()).toBeVisible();
  await expect(page.getByRole("button", { name: "Xóa hết kết quả buổi này" })).toBeVisible();

  // Xếp hạng (Task 9): 5 mem có mặt trong bảng mùa và bảng ELO.
  await page.goto("/xep-hang");
  const table = page.getByRole("table");
  for (const name of ["Quản trị", "An", "Bình", "Chi", "Dũng"]) {
    await expect(table.getByRole("rowheader", { name: rankedName(name) })).toBeVisible();
  }
  expect(await table.getByRole("row").count()).toBeGreaterThanOrEqual(6);
  await page.goto("/xep-hang?bang=elo");
  // Tổng thay đổi ELO bằng 0, nên sau khi có kết quả phải có cả ▲ lẫn ▼ (không phụ thuộc lịch ngẫu nhiên).
  const eloTable = page.getByRole("table");
  await expect(eloTable.getByText(/▲/).first()).toBeVisible();
  await expect(eloTable.getByText(/▼/).first()).toBeVisible();
  await page.goto("/xep-hang?mua=abc");
  await expect(page.getByText("Tháng 10/2026")).toBeVisible();

  // Thống kê (Task 10): tham số lạ bị bỏ qua, trang vẫn hiện bình thường.
  await page.goto("/thong-ke?tu=2026-13");
  await expect(page.getByRole("heading", { name: "Thống kê" })).toBeVisible();
  await expect(page.getByRole("rowheader", { name: rankedName("An") })).toBeVisible();
  await page.getByRole("link", { name: "Theo cặp" }).click();
  // Mỗi dòng cặp có hai tên mem, mỗi tên là một nút mở popup mem (plan 5).
  await expect(page).toHaveURL(/xem=cap/);
  await expect(page.getByRole("rowheader").first().getByRole("button")).toHaveCount(2);
});
