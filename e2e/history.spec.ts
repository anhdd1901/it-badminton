import { expect, test, type Page } from "@playwright/test";
import { createDb } from "../src/server/db/client";
import { PASSWORD, resetAndSeed, seedPastMatchDay } from "./seed";

// A ranking rowheader is the name plus the top-4 medal ("Hạng N").
const rankedName = (name: string) => new RegExp(`^${name}( Hạng \\d)?$`);

// Seeds a finished match day (2026-10-10) and restores the seeded state around the spec.
async function reset(withPastDay: boolean) {
  const url = process.env.DATABASE_URL_E2E;
  if (!url) throw new Error("DATABASE_URL_E2E is not set");
  const { db, close } = createDb(url);
  try {
    await resetAndSeed(db);
    if (withPastDay) {
      await seedPastMatchDay(
        db,
        "2026-10-10",
        ["admin", "anh", "binh", "chi", "dung"],
        Array.from({ length: 5 }, () => [21, 15] as [number, number]),
      );
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

test("admin sửa kết quả buổi đã qua, bảng xếp hạng đổi theo", async ({ page }) => {
  await login(page, "admin");
  await page.goto("/lich-su");
  await expect(page.getByText("Tháng 10/2026")).toBeVisible();
  const row = page.getByRole("button", { name: /Thứ 7, 10\/10\/2026/ });
  await expect(row).toContainText("5 người · đã nhập 5/5 trận");
  await expect(row).toHaveAttribute("aria-expanded", "false");
  await expect(page.getByTestId("team-a")).toHaveCount(0);
  await row.click();
  await expect(row).toHaveAttribute("aria-expanded", "true");
  await expect(page.getByTestId("team-a")).toHaveCount(5);

  const firstWinner = (
    await page.getByTestId("team-a").first().locator(".truncate").first().innerText()
  ).trim();
  await page.goto("/xep-hang");
  const rowOf = (name: string) =>
    page
      .getByRole("table")
      .getByRole("row")
      .filter({
        has: page.getByRole("rowheader", { name: rankedName(name) }),
      });
  const before = await rowOf(firstWinner).innerText();

  await page.goto("/lich-su/2026-10-10");
  await page.getByRole("button", { name: "Nhập tỷ số trận 1" }).click();
  const dialog = page.getByRole("dialog");
  const inputs = dialog.getByRole("textbox");
  await inputs.nth(0).fill("21");
  await inputs.nth(1).fill("10");
  await dialog.getByRole("button", { name: "Lưu tỷ số" }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);

  await page.goto("/xep-hang");
  await expect(rowOf(firstWinner)).not.toHaveText(before);
});

test("admin đổi người trận đã có tỷ số, bảng xếp hạng đổi theo", async ({ page }) => {
  await login(page, "admin");
  await page.goto("/lich-su/2026-10-10");
  await expect(page.getByTestId("team-a").first()).toBeVisible();
  const rowOf = (name: string) =>
    page
      .getByRole("table")
      .getByRole("row")
      .filter({ has: page.getByRole("rowheader", { name: rankedName(name) }) });

  await page.getByRole("button", { name: "Nhập tỷ số trận 1" }).click();
  const dialog = page.getByRole("dialog");
  await expect(dialog.getByRole("heading", { name: "Người chơi" })).toBeVisible();
  const slot = dialog.getByRole("combobox", { name: "Cặp A, người 1" });
  const oldName = (await slot.innerText()).split(" · ")[0].trim();
  const others: string[] = [];
  for (const label of ["Cặp A, người 2", "Cặp B, người 1", "Cặp B, người 2"]) {
    others.push(
      (await dialog.getByRole("combobox", { name: label }).innerText()).split(" · ")[0].trim(),
    );
  }
  await slot.click();
  const options = await page.getByRole("option").allInnerTexts();
  const names = options.map((o) => o.split(" · ")[0].trim());
  const newName = names.find((n) => n !== oldName && !others.includes(n));
  if (!newName) throw new Error("không có người ngoài trận 1");
  await page.keyboard.press("Escape"); // đóng danh sách chọn
  await page.keyboard.press("Escape"); // đóng popup

  await page.goto("/xep-hang");
  const before = await rowOf(newName).innerText();

  await page.goto("/lich-su/2026-10-10");
  await page.getByRole("button", { name: "Nhập tỷ số trận 1" }).click();
  await dialog.getByRole("combobox", { name: "Cặp A, người 1" }).click();
  await page.getByRole("option", { name: new RegExp(`^${newName} · `) }).click();
  await dialog.getByRole("button", { name: "Lưu người chơi" }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);

  await expect(page.getByTestId("team-a").first()).toContainText(newName);

  await page.goto("/xep-hang");
  await expect(rowOf(newName)).not.toHaveText(before);
});

test("subadmin không sửa được buổi đã qua", async ({ page }) => {
  await login(page, "phu");
  // The old per-day link redirects to the month with that day expanded.
  await page.goto("/lich-su/2026-10-10");
  await expect(page).toHaveURL(/\/lich-su\?mua=2026-10&ngay=2026-10-10$/);
  await expect(page.getByTestId("team-a").first()).toBeVisible();
  await expect(page.getByRole("button", { name: /^Nhập tỷ số trận/ })).toHaveCount(0);
});

test("ngày sai hoặc không có lịch chính thức: 404", async ({ page }) => {
  await login(page, "admin");
  for (const day of ["2026-02-30", "2026-10-14", "2026-09-26"]) {
    // loading.tsx streams the shell first, so the status is already 200; assert on the content.
    await page.goto(`/lich-su/${day}`);
    await expect(page.getByText("Không tìm thấy trang")).toBeVisible();
  }
});
