import { expect, test, type Page } from "@playwright/test";
import { createDb } from "../src/server/db/client";
import { PASSWORD, resetAndSeed, seedPastMatchDay } from "./seed";

const FIVE = ["admin", "anh", "binh", "chi", "dung"];
const WINS = Array.from({ length: 5 }, () => [21, 15] as [number, number]);

// Two finished match days in two seasons, plus attendance (draft schedule) for this week.
async function reset(withData: boolean) {
  const url = process.env.DATABASE_URL_E2E;
  if (!url) throw new Error("DATABASE_URL_E2E is not set");
  const { db, close } = createDb(url);
  try {
    await resetAndSeed(db);
    if (withData) {
      await seedPastMatchDay(db, "2026-09-26", FIVE, WINS);
      await seedPastMatchDay(db, "2026-10-10", FIVE, WINS);
      await seedPastMatchDay(db, "2026-10-17", FIVE, []);
    }
  } finally {
    await close();
  }
}
test.beforeAll(() => reset(true));
test.afterAll(() => reset(false));

async function login(page: Page, username: string) {
  await page.goto("/dang-nhap");
  await page.getByLabel("Tên đăng nhập").fill(username);
  await page.getByLabel("Mật khẩu").fill(PASSWORD);
  await page.getByRole("button", { name: "Đăng nhập" }).click();
  await expect(page.getByText("Thứ 7, 17/10/2026")).toBeVisible();
}

async function expectMemberPopup(page: Page, name: string) {
  const dialog = page.getByRole("dialog");
  await expect(dialog.getByText("Toàn thời gian")).toBeVisible();
  await expect(dialog.getByText("Mùa 10/2026")).toBeVisible();
  await expect(dialog.getByRole("heading", { name, exact: true })).toBeVisible();
}

test("Xếp hạng: bấm tên mem mở popup có 'Toàn thời gian'", async ({ page }) => {
  await login(page, "anh");
  await page.goto("/xep-hang");
  await page
    .getByRole("table")
    .getByRole("rowheader", { name: "Bình", exact: true })
    .getByRole("button", { name: "Bình", exact: true })
    .click();
  await expectMemberPopup(page, "Bình");
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toHaveCount(0);
});

test("Xếp hạng: bấm tháng/năm, chọn tháng khác đổi URL ?mua=", async ({ page }) => {
  await login(page, "anh");
  await page.goto("/xep-hang");
  await page.getByRole("button", { name: "Tháng 10/2026" }).click();
  await page.getByRole("button", { name: "Tháng 9/2026" }).click();
  await expect(page).toHaveURL(/\/xep-hang\?mua=2026-09$/);
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Tháng 9/2026" })).toBeVisible();
  await expect(page.getByText("Đã kết thúc")).toBeVisible();
});

test("Thống kê: chọn mem bằng Select và lọc, URL có mem=", async ({ page }) => {
  await login(page, "anh");
  await page.goto("/thong-ke");
  await page.getByRole("combobox", { name: "Mem" }).click();
  await page.getByRole("option", { name: "Chi", exact: true }).click();
  await expect(page.getByRole("combobox", { name: "Mem" })).toHaveText("Chi");
  await page.getByRole("button", { name: "Lọc" }).click();
  await expect(page).toHaveURL(/[?&]mem=[^&]+/);
  await expect(page.getByRole("combobox", { name: "Mem" })).toHaveText("Chi");
});

test("Lịch sử chi tiết: rê vào tên một mem thì mọi chỗ của mem đó có data-focused", async ({
  page,
}) => {
  await login(page, "anh");
  await page.goto("/lich-su/2026-10-10");
  await expect(page.getByRole("heading", { name: "Thứ 7, 10/10/2026" })).toBeVisible();
  const all = page.getByRole("button", { name: "Chi", exact: true });
  const count = await all.count();
  expect(count).toBeGreaterThan(1);
  await expect(page.locator("button[data-focused]")).toHaveCount(0);

  await page.getByTestId("team-a").first().scrollIntoViewIfNeeded();
  await all.first().hover();
  for (let i = 0; i < count; i++) await expect(all.nth(i)).toHaveAttribute("data-focused", "");
  await expect(page.locator("button[data-focused]")).toHaveCount(count);

  await page.getByRole("heading", { name: "Thứ 7, 10/10/2026" }).hover();
  await expect(page.locator("button[data-focused]")).toHaveCount(0);
});

test("Tuần này (admin): nút Nhập tỷ số vẫn mở, bấm tên mem mở popup mem", async ({ page }) => {
  await login(page, "admin");
  await page.getByRole("button", { name: "Nhập tỷ số trận 1" }).click();
  const dialog = page.getByRole("dialog");
  await expect(dialog.getByRole("heading", { name: "Trận 1" })).toBeVisible();
  await expect(dialog.getByRole("button", { name: "Lưu tỷ số" })).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toHaveCount(0);

  const firstName = page.getByTestId("team-a").first().getByRole("button").first();
  const name = (await firstName.innerText()).trim();
  await firstName.click();
  await expectMemberPopup(page, name);
});
