# Kế hoạch 6: Phong cách sân cầu — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Đổi phần nhìn của app sang phong cách sân cầu theo spec 8.1: bảng màu xanh sân/vàng chanh, font Barlow Condensed cho số và tiêu đề, thẻ trận có lưới, đầu màn Tuần này và điều hướng trên nền `--chrome`.

**Architecture:** Chỉ đổi giao diện; logic, Server Action, dữ liệu giữ nguyên. Màu đi qua token trong `src/app/globals.css` (đổi giá trị, thêm `--line`, `--chrome`, `--on-chrome`, `--chrome-active`); font hiển thị thêm thành biến `--font-display` (lớp Tailwind `font-display`). Mỗi thành phần chỉ đổi lớp CSS; lưới trong thẻ trận là một tiện ích CSS `net` trong `globals.css`.

**Tech Stack:** Next.js 16 (App Router, `next/font/local`), Tailwind 4 (`@theme inline`, `@utility`), shadcn/ui, Vitest + Testing Library, Playwright, `agent-browser`. Không thêm thư viện.

**Spec:** `docs/superpowers/specs/2026-10-10-badminton-club-app-design.md` — mục 8.1 (bảng màu, font, thẻ trận, đầu màn, điều hướng, bảng xếp hạng, đăng nhập, hình khối, avatar), 8.2 (chevron ELO lên dùng `--accent-text`; hover shadcn không dùng màu nhấn).

## Global Constraints

- Mọi màu qua token CSS ở spec 8.1; không viết màu cứng trong thành phần (trừ dải màu avatar và `manifest.ts`).
- Mọi cặp chữ/nền đạt tối thiểu 4,5:1, kiểm bằng `src/ui/tokens.test.ts`.
- Chữ trên `--chrome` dùng `--on-chrome` hoặc `--chrome-active`; không dùng `--text`, `--text-2`, `--accent-text` trên `--chrome` (theme sáng không đọc được). Viền focus trên `--chrome` dùng `ring-chrome-active`.
- Barlow Condensed (`font-display italic`, 600 hoặc 700) chỉ cho số và tiêu đề; tên mem, nhãn, nút dùng Be Vietnam Pro. Số luôn có `tabular-nums`.
- Viết hoa kiểu câu, không viết hoa toàn bộ nhãn. Không đổ bóng, không gradient trang trí, không thêm chuyển động tự chạy.
- Thẻ và khối bo 6px (`--radius: 0.375rem`); nút chính và nhóm tab bo tròn hoàn toàn.
- Vùng chạm tối thiểu 44px; không đổi tên nút, nhãn `aria-label` hay hành vi đã có (test hành vi và e2e hiện có phải xanh mà không sửa, trừ chỗ ghi rõ trong task).
- Client component chỉ được `import type` từ `@/server/*` và `@/app/_lib/*`. Không để `username` xuống client.
- Test thành phần có `// @vitest-environment jsdom` ở dòng đầu; `pnpm test`, `pnpm typecheck`, `pnpm lint`, `pnpm format:check` sạch trước mỗi commit.
- Mỗi task: chạy `graphify update .` trước commit, commit `<loại>(plan-6/task-N): …`, tích `- [x]` các bước của task trong file này, cùng commit.
- Next.js 16 khác kiến thức cũ: trước khi sửa `layout.tsx`, đọc hướng dẫn font trong `node_modules/next/dist/docs/`.

## Review Focus

1. Tên mem dài trên màn 320px: lưới không được chạy vào cột tỷ số, tên vẫn cắt bằng dấu "…", nút "Nhập tỷ số trận N" vẫn phủ đúng cột tỷ số. (Task 3 có test vị trí lưới; Task 8 kiểm bằng mắt)
2. Theme sáng: chữ và viền focus trên `--chrome` (thanh đáy, menu bên, đầu màn Tuần này, màn đăng nhập) phải đọc được và nhìn thấy được. (Task 4, 5, 7 có test lớp; Task 8 kiểm bằng mắt)
3. Nhiều mem đồng hạng 1: mọi dòng hạng 1 đều có vạch nhấn, không chỉ dòng đầu. (Task 6)
4. Dấu tiếng Việt trong Barlow Condensed ("Thứ", "Tháng", "Đăng nhập"): file font phải có đủ glyph, không rơi về font dự phòng. (Task 2 kiểm file, Task 8 kiểm bằng mắt)
5. Đổi theme bằng cookie (`data-theme`) phải đổi cả các token mới, vì chúng cũng viết bằng `light-dark()`. (Task 1: test đọc mọi token theo dạng `light-dark`)

---

### Task 1: Bảng màu, bo góc, avatar, manifest

**Files:**
- Modify: `src/app/globals.css` (khối `:root`, `@theme inline`)
- Modify: `src/ui/tokens.test.ts`
- Modify: `src/ui/avatar.ts`, `src/ui/avatar.test.ts`
- Modify: `src/app/manifest.ts` (và `src/app/manifest.test.ts` nếu nó kiểm màu)

**Interfaces:**
- Produces: token CSS `--line`, `--chrome`, `--on-chrome`, `--chrome-active` và lớp Tailwind `bg-chrome`, `text-on-chrome`, `text-chrome-active`, `bg-chrome-active`, `ring-chrome-active`, `border-line`, `bg-line`, `border-chrome-active` (qua `--color-line`, `--color-chrome`, `--color-on-chrome`, `--color-chrome-active` trong `@theme inline`).

- [x] **Step 1: Sửa test token cho bảng màu mới**

Trong `tokens.test.ts`:
- `expected` thay bằng đúng bảng spec 8.1 (sáng, tối), gồm 19 token: `bg ["#F2F5F0","#0F3D2E"]`, `surface ["#FFFFFF","#164A39"]`, `surface-2 ["#E3ECE5","#1D5644"]`, `border ["#CFDDD4","#2A6450"]`, `text ["#0D2B21","#F7F3E6"]`, `text-2 ["#4A5F55","#B7C8BE"]`, `accent ["#0F3D2E","#E4F23A"]`, `on-accent ["#E4F23A","#0F3D2E"]`, `accent-text ["#0F6B47","#E4F23A"]`, `seed-1 ["#1F5BD0","#9CC8FF"]`, `seed-2 ["#B0306E","#FFA3CF"]`, `win ["#0D2B21","#F7F3E6"]`, `loss ["#5E6E66","#A9BDB2"]`, `danger ["#C62828","#FF9A90"]`, `highlight ["#F1F7CF","#2C4A1C"]`, `line ["#1A6B4B","#DCE6DF"]`, `chrome ["#0F3D2E","#0A2E22"]`, `on-chrome ["#F7F3E6","#F7F3E6"]`, `chrome-active ["#E4F23A","#E4F23A"]`.
- Bỏ dòng `expect(token("accent-text", "dark")).toBe("#FF6B00")`; `tokens.size` thành `19`.
- `PAIRS` thêm `["on-chrome","chrome"]`, `["chrome-active","chrome"]`, `["line","surface"]`.
- Đổi tên test `"select và popover không dùng token cam của --accent cho hover"` thành `"select và popover không dùng màu nhấn --accent cho hover"` (nội dung giữ nguyên).

- [x] **Step 2: Chạy test, xác nhận đỏ**

Run: `pnpm test src/ui/tokens.test.ts`
Expected: FAIL ở "giá trị khớp spec 8.1" (`Thiếu token --line` hoặc giá trị cũ).

- [x] **Step 3: Đổi `:root` và `@theme inline` trong `globals.css`**

Giá trị lấy từ Step 1, dạng `--x: light-dark(<sáng>, <tối>);` như hiện có. Thêm bốn token mới vào `:root` và bốn dòng `--color-…` vào `@theme inline`. `--radius: 0.375rem`. Sửa chú thích đầu khối nếu nhắc tới cam. Bỏ `shadow-xs` ở biến thể `outline` của `src/components/ui/button.tsx` (spec 8.1: không đổ bóng) và thêm file này vào commit.

- [x] **Step 4: Chạy test, xác nhận xanh**

Run: `pnpm test src/ui/tokens.test.ts`
Expected: PASS.

- [x] **Step 5: Test dải màu avatar**

Thêm vào `avatar.test.ts`:
```ts
it("dải màu khớp spec 8.1, không có xanh lá hay xanh ngọc", () => {
  expect(AVATAR_COLORS).toEqual([
    "#C2185B", "#7B1FA2", "#4527A0", "#1565C0", "#455A64", "#B71C1C", "#AD4A00", "#5D4037",
  ]);
});
```
Run: `pnpm test src/ui/avatar.test.ts` → FAIL.

- [x] **Step 6: Đổi `AVATAR_COLORS` trong `src/ui/avatar.ts`** (thay `#00695C` → `#455A64`, `#2E7D32` → `#B71C1C`, giữ thứ tự để màu của mem khác không đổi). Run lại → PASS.

- [x] **Step 7: `manifest.ts`: `background_color` và `theme_color` thành `#0F3D2E`**; nếu `manifest.test.ts` kiểm hai giá trị này thì sửa theo.

- [x] **Step 8: Chạy toàn bộ cổng kiểm tra**

Run: `pnpm test && pnpm typecheck && pnpm lint && pnpm format:check`
Expected: tất cả sạch.

- [x] **Step 9: Commit**

```bash
graphify update .
git add src/components/ui/button.tsx src/app/globals.css src/ui/tokens.test.ts src/ui/avatar.ts src/ui/avatar.test.ts src/app/manifest.ts src/app/manifest.test.ts docs/superpowers/plans/2026-10-24-plan-6-court-style.md
git commit -m "feat(plan-6/task-1): court palette, chrome tokens, 6px radius, avatar colors"
```

### Task 2: Font Barlow Condensed và tiện ích lưới

**Files:**
- Create: `src/fonts/barlow-condensed/BarlowCondensed-SemiBoldItalic.ttf`, `BarlowCondensed-BoldItalic.ttf`, `OFL.txt`
- Create: `src/ui/fonts.test.ts`
- Modify: `src/app/layout.tsx`, `src/app/globals.css`

**Interfaces:**
- Consumes: token `--line` (Task 1).
- Produces: lớp `font-display` (Barlow Condensed; luôn dùng kèm `italic` và `font-semibold` hoặc `font-bold`); tiện ích `net` (khối cao 6px: dải nét lưới 4px trên, vạch `--line` 2px dưới), dùng với `aria-hidden="true"`.

- [x] **Step 1: Test file font và khai báo**

`src/ui/fonts.test.ts` (môi trường node):
- `existsSync` cho hai file `.ttf` và `OFL.txt` trong `src/fonts/barlow-condensed/`.
- Mỗi file `.ttf` chứa glyph tiếng Việt: đọc bảng `cmap` bằng một hàm nhỏ trong test là quá sức, nên kiểm gián tiếp: kích thước file > 60 KB (bản cắt chỉ latin nhỏ hơn nhiều; bản đầy đủ của Google Fonts khoảng 90–100 KB).
- `globals.css` chứa `--font-display: var(--font-barlow-condensed)` và `@utility net`.
- `src/app/layout.tsx` chứa `variable: "--font-barlow-condensed"`.

Run: `pnpm test src/ui/fonts.test.ts` → FAIL.

- [x] **Step 2: Tải font**

Nguồn duy nhất: repo `google/fonts`, thư mục `ofl/barlowcondensed/` (bản đầy đủ, có tiếng Việt). Tải vào thư mục tạm riêng, kiểm `file *.ttf` báo "TrueType Font data", rồi chép vào `src/fonts/barlow-condensed/`:
```bash
base=https://raw.githubusercontent.com/google/fonts/main/ofl/barlowcondensed
curl -fL -o BarlowCondensed-SemiBoldItalic.ttf $base/BarlowCondensed-SemiBoldItalic.ttf
curl -fL -o BarlowCondensed-BoldItalic.ttf $base/BarlowCondensed-BoldItalic.ttf
curl -fL -o OFL.txt $base/OFL.txt
```

- [x] **Step 3: Khai báo font và tiện ích**

- `layout.tsx`: thêm `barlowCondensed = localFont({ src: [600 italic, 700 italic], variable: "--font-barlow-condensed", display: "swap" })`, thêm `barlowCondensed.variable` vào `className` của `<html>`.
- `globals.css` trong `@theme inline`: `--font-display: var(--font-barlow-condensed);`.
- `globals.css` thêm:
```css
@utility net {
  height: 6px;
  background:
    repeating-linear-gradient(90deg, color-mix(in srgb, var(--line) 55%, transparent) 0 1px, transparent 1px 5px) top / 100% 4px no-repeat,
    linear-gradient(var(--line), var(--line)) bottom / 100% 2px no-repeat;
}
```

- [x] **Step 4: Chạy test, xác nhận xanh**

Run: `pnpm test src/ui/fonts.test.ts` → PASS. Sau đó `pnpm test && pnpm typecheck && pnpm lint && pnpm format:check && pnpm build` → sạch (`build` xác nhận `next/font/local` đọc được file).

- [x] **Step 5: Commit**

```bash
graphify update .
git add src/fonts/barlow-condensed src/ui/fonts.test.ts src/app/layout.tsx src/app/globals.css docs/superpowers/plans/2026-10-24-plan-6-court-style.md
git commit -m "feat(plan-6/task-2): self-hosted Barlow Condensed display font and net utility"
```

### Task 3: Thẻ trận có lưới

**Files:**
- Modify: `src/components/match/match-card.tsx`
- Test: `src/components/match/match-card.test.tsx`

**Interfaces:**
- Consumes: `font-display`, `net` (Task 2); `border-line`, `text-accent-text` (Task 1).
- Produces: không đổi props của `MatchCard`. Trong DOM: `data-testid="net"` (lưới), `data-testid="score-a"`, `data-testid="score-b"` (ô tỷ số), `data-testid="match-number"`.

- [x] **Step 1: Test**

Thêm vào `match-card.test.tsx`:
- `"có lưới giữa hai cặp, ẩn với trình đọc màn hình"`: `screen.getByTestId("net")` có `aria-hidden="true"`; trong DOM, `team-a` đứng trước `net`, `net` đứng trước `team-b` (`compareDocumentPosition`).
- `"lưới không chạy vào cột tỷ số"`: render với `editable` true và false; `net` không chứa `score-a`/`score-b`, và `net.className` chứa đúng lớp lề phải tương ứng (`mr-12` khi sửa được, `mr-10` khi chỉ xem).
- `"điểm cặp thắng màu nhấn, điểm cặp thua màu loss"`: kết quả 21–15 → `score-a` có `text-accent-text`, `font-display`, `italic`, `tabular-nums`; `score-b` có `text-loss`.
- `"số trận dùng font hiển thị, ngăn bằng vạch sân"`: `match-number` có `font-display` và `border-line`.
- Test cũ `"cặp thắng text-win, cặp thua text-loss"` giữ nguyên (tên cặp vẫn `text-win`/`text-loss` trên `team-a`/`team-b`).

Run: `pnpm test src/components/match/match-card.test.tsx` → FAIL.

- [x] **Step 2: Sửa `MatchCard`**

- Cột số trận: `data-testid="match-number"`, `font-display italic font-semibold text-lg text-text-2`, `border-r-2 border-line`, rộng cố định đủ 2 chữ số, căn giữa.
- Cột cặp: `TeamA`, rồi `<div data-testid="net" aria-hidden="true" className="net mr-…" />`, rồi `TeamB`. Lề phải của lưới = độ rộng ô tỷ số + khoảng cách `gap-2`: sửa được thì ô tỷ số `w-10` → `mr-12`; chỉ xem `w-8` → `mr-10`.
- Ô tỷ số: `data-testid` theo cặp, `font-display italic font-semibold text-[28px] leading-none tabular-nums text-right`; thắng `text-accent-text`, thua `text-loss`, chưa có kết quả `text-text-2` và hiện "–".
- Thẻ: giữ `rounded-lg` (giờ là 6px), `border-border bg-surface`; nút phủ tỷ số giữ `w-14` và `aria-label`.

- [x] **Step 3: Chạy test, xác nhận xanh**

Run: `pnpm test src/components/match/match-card.test.tsx` → PASS (cả test cũ, gồm "không có nút lồng trong nút" với 5 nút).

- [x] **Step 4: Cổng kiểm tra và commit**

```bash
pnpm test && pnpm typecheck && pnpm lint && pnpm format:check
graphify update .
git add src/components/match/match-card.tsx src/components/match/match-card.test.tsx docs/superpowers/plans/2026-10-24-plan-6-court-style.md
git commit -m "feat(plan-6/task-3): match card with net divider and display-font scores"
```

### Task 4: Đầu màn Tuần này trên nền `--chrome`

**Files:**
- Modify: `src/ui/format.ts`, `src/ui/format.test.ts`
- Modify: `src/components/week/week-header.tsx`
- Modify: `src/components/week/roster-dialog.tsx` (chỉ lớp của nút mở danh sách)
- Create: `src/components/week/week-header.test.tsx`

**Interfaces:**
- Consumes: `bg-chrome`, `text-on-chrome`, `text-chrome-active`, `border-chrome-active`, `ring-chrome-active` (Task 1); `font-display` (Task 2).
- Produces: `formatDayShort(day: LocalDate): string` trong `src/ui/format.ts`, trả "Thứ 7, 17/10" (không có năm; cùng tên thứ như `formatDay`).

- [ ] **Step 1: Test `formatDayShort`**

Trong `format.test.ts`: `formatDayShort("2026-10-17" as LocalDate)` → `"Thứ 7, 17/10"`; `formatDayShort("2026-10-18" as LocalDate)` → `"Chủ nhật, 18/10"` (theo bảng `WEEKDAYS` hiện có; sửa chuỗi mong đợi cho khớp bảng đó nếu khác). Run → FAIL.

- [ ] **Step 2: Viết `formatDayShort`** dùng chung phần tách ngày với `formatDay`. Run → PASS.

- [ ] **Step 3: Test `WeekHeader`**

`week-header.test.tsx`: render `<WeekHeader day="2026-10-17" status="open"><button>8/10</button></WeekHeader>`:
- `container.querySelector("header")` có `bg-chrome`, `text-on-chrome`, `border-chrome-active`.
- `getByText("Thứ 7, 17/10")` có `font-display` và `italic`.
- `getByText("Đang mở điểm danh")` có `text-chrome-active`.
- Không phần tử nào trong header có `text-accent-text` hoặc `text-text-2`.
Run → FAIL.

- [ ] **Step 4: Sửa `WeekHeader`**

- `header`: `-mx-4 -mt-4 bg-chrome text-on-chrome border-b-[3px] border-chrome-active px-4 pt-4 pb-3`, giữ `flex flex-col gap-1`.
- `h1` "Tuần này": `text-sm font-medium`.
- Ngày: `formatDayShort(day)`, `font-display italic font-bold text-[40px] leading-none`.
- Trạng thái: `text-sm text-chrome-active`.
- `roster-dialog.tsx`: nút mở danh sách đổi `text-text-2` → `text-on-chrome`, thêm `outline-none focus-visible:ring-2 focus-visible:ring-chrome-active rounded-sm`. Nút này chỉ xuất hiện trong `WeekHeader`; nếu `graphify query` cho thấy chỗ dùng khác thì báo lại thay vì đổi.

- [ ] **Step 5: Chạy test, xác nhận xanh**

Run: `pnpm test src/components/week src/ui/format.test.ts` → PASS (gồm `roster-dialog.test.tsx` cũ).

- [ ] **Step 6: Cổng kiểm tra và commit**

```bash
pnpm test && pnpm typecheck && pnpm lint && pnpm format:check
graphify update .
git add src/ui/format.ts src/ui/format.test.ts src/components/week docs/superpowers/plans/2026-10-24-plan-6-court-style.md
git commit -m "feat(plan-6/task-4): this-week header band on chrome with display date"
```

### Task 5: Điều hướng trên nền `--chrome`

**Files:**
- Modify: `src/components/app-nav.tsx`
- Test: `src/components/app-nav.test.tsx`

**Interfaces:**
- Consumes: token `--chrome*` (Task 1).
- Produces: link đang chọn có `data-active` và một phần tử con `data-slot="nav-mark"` (vạch nhấn).

- [ ] **Step 1: Test**

Thêm vào `app-nav.test.tsx` (giữ test cũ về thẳng hàng và `aria-current`):
- `"thanh đáy và menu bên nền chrome"`: cả hai `nav`/`aside` có `bg-chrome`.
- `"mục đang chọn màu chrome-active, có vạch nhấn"`: link `aria-current="page"` có `text-chrome-active` và chứa `[data-slot="nav-mark"]`; link khác có `text-on-chrome`, không chứa vạch.
- `"viền focus nhìn thấy trên nền chrome"`: mọi link có `focus-visible:ring-chrome-active`, không có `focus-visible:ring-ring`.
Run → FAIL.

- [ ] **Step 2: Sửa `AppNav`**

- `nav` đáy và `aside`: `bg-chrome text-on-chrome`, viền `border-chrome` (bỏ `border-border`).
- Link: `text-on-chrome`, đang chọn `text-chrome-active`; bỏ `bg-surface-2` của mục đang chọn ở menu bên. Focus: `focus-visible:ring-2 focus-visible:ring-chrome-active`.
- Vạch nhấn `<span data-slot="nav-mark" aria-hidden="true">` nền `bg-chrome-active`: thanh đáy ở mép trên link (`absolute inset-x-3 top-0 h-[3px]`), menu bên ở mép trái (`absolute inset-y-2 left-0 w-[3px]`); link thêm `relative`.
- Chữ "ANH EM IT" dưới tên ở menu bên: `text-on-chrome`. Ô icon 40px và căn thẳng hàng (spec 8.2) giữ nguyên.

- [ ] **Step 3: Chạy test, xác nhận xanh**

Run: `pnpm test src/components/app-nav.test.tsx` → PASS.

- [ ] **Step 4: Cổng kiểm tra và commit**

```bash
pnpm test && pnpm typecheck && pnpm lint && pnpm format:check
graphify update .
git add src/components/app-nav.tsx src/components/app-nav.test.tsx docs/superpowers/plans/2026-10-24-plan-6-court-style.md
git commit -m "feat(plan-6/task-5): chrome navigation with lime active mark"
```

### Task 6: Bảng xếp hạng, ELO và popup mem

**Files:**
- Modify: `src/components/ranking/season-table.tsx`, `src/components/ranking/elo-table.tsx`, `src/components/member/member-dialog.tsx`
- Test: `src/components/ranking/season-table.test.tsx`, `src/components/ranking/elo-table.test.tsx`, `src/components/member/member-dialog.test.tsx`

**Interfaces:**
- Consumes: `font-display` (Task 2), `text-accent-text`, `border-accent-text` (Task 1).
- Produces: dòng hạng 1 ở bảng mùa có `data-leader`.

- [ ] **Step 1: Test**

- `season-table.test.tsx`: `"mọi dòng hạng 1 có vạch nhấn, kể cả đồng hạng"`: dữ liệu hai mem cùng hạng 1 và một mem hạng 3 → đúng hai `tr[data-leader]`; ô hạng của chúng có `border-accent-text`; ô hạng mọi dòng có `font-display` và `italic`.
- `elo-table.test.tsx`: test cũ dòng 25 đổi mong đợi `"text-seed-2"` → `"text-accent-text"` (spec 8.2: ELO lên dùng `--accent-text`); thêm ô ELO có `font-display`.
- `member-dialog.test.tsx`: chevron lên (`aria-label` thay đổi ELO dương) có `text-accent-text`; số ELO lớn có `font-display`.
Run: `pnpm test src/components/ranking src/components/member` → FAIL.

- [ ] **Step 2: Sửa ba thành phần**

- `season-table.tsx`: ô hạng `font-display italic font-bold text-xl leading-none tabular-nums`; dòng `r.rank === 1` có `data-leader` và ô hạng `border-l-[3px] border-accent-text`; các ô số (`Thắng`…`Số trận`) thêm `font-display italic font-semibold text-base`. Tên mem giữ nguyên.
- `elo-table.tsx`: ô ELO `font-display italic font-semibold text-base`; thay đổi dương `text-accent-text` (thay `text-seed-2`). Chấm hạt giống `bg-seed-2` giữ nguyên.
- `member-dialog.tsx`: số ELO `font-display italic font-bold text-4xl`; `ChevronUp` đổi `text-seed-2` → `text-accent-text`. Ô số liệu trong lưới thêm `font-display italic font-semibold` cho số (nhãn giữ Be Vietnam Pro).

- [ ] **Step 3: Chạy test, xác nhận xanh**

Run: `pnpm test src/components/ranking src/components/member` → PASS.

- [ ] **Step 4: Cổng kiểm tra và commit**

```bash
pnpm test && pnpm typecheck && pnpm lint && pnpm format:check
graphify update .
git add src/components/ranking src/components/member docs/superpowers/plans/2026-10-24-plan-6-court-style.md
git commit -m "feat(plan-6/task-6): display-font numbers in rankings, ELO and member popup"
```

### Task 7: Màn đăng nhập

**Files:**
- Modify: `src/app/dang-nhap/page.tsx`
- Create: `src/app/dang-nhap/page.test.tsx`

**Interfaces:**
- Consumes: `bg-chrome`, `text-on-chrome` (Task 1); `font-display`, `net` (Task 2).

- [ ] **Step 1: Test**

`page.test.tsx` (jsdom; mock `@/app/_lib/session` cho `getActor` trả `null`, mock `next/navigation`, mock `./login-form` thành `<form aria-label="Đăng nhập" />`): render `await LoginPage()`:
- `main` (hoặc phần tử bọc ngoài) có `bg-chrome`.
- Heading "ANH EM IT" có `font-display`, `italic`, `text-on-chrome`; không có `text-accent-text`.
- Có một phần tử `.net` với `aria-hidden="true"`.
- Form nằm trong một khối `bg-surface` (chữ của form dùng token thường, đọc được trên nền trắng/xanh thẻ ở cả hai theme).
Run → FAIL.

- [ ] **Step 2: Sửa trang**

Bọc ngoài `flex flex-1 bg-chrome`; trong là cột `max-w-sm` như cũ. Heading `font-display italic font-bold text-5xl text-on-chrome text-center`, dưới là `<div aria-hidden="true" className="net" />` (lưới dùng `--line`; trên nền `--chrome` chỉ là trang trí). Form bọc trong `rounded-lg bg-surface p-4`. `LoginForm` không đổi.

- [ ] **Step 3: Chạy test, xác nhận xanh**

Run: `pnpm test src/app/dang-nhap` → PASS.

- [ ] **Step 4: Cổng kiểm tra và commit**

```bash
pnpm test && pnpm typecheck && pnpm lint && pnpm format:check
graphify update .
git add src/app/dang-nhap docs/superpowers/plans/2026-10-24-plan-6-court-style.md
git commit -m "feat(plan-6/task-7): login screen on chrome with display wordmark"
```

### Task 8: Kiểm tra bằng mắt, cổng đầy đủ, tài liệu

**Files:**
- Modify: `CLAUDE.md` (mục Tài liệu → dòng "Giao diện"; mục Lưu ý → "Component shadcn thêm bằng CLI" và "Font")
- Modify: `docs/backlog.md` (nếu có mục deferred)

- [ ] **Step 1: Cổng đầy đủ**

Run: `pnpm test && pnpm typecheck && pnpm lint && pnpm format:check && pnpm build`, rồi `pnpm db:up && pnpm test:int && pnpm test:e2e`.
Expected: tất cả xanh, không sửa test e2e nào.

- [ ] **Step 2: Kiểm tra bằng mắt bằng `agent-browser`**

Chạy app như e2e (đồng hồ giả thứ 7 17/10/2026, seed e2e). Chụp màn hình ở 375×812 và 1280×800, theme sáng và tối (cookie `theme`), cho: Đăng nhập, Tuần này (admin, có lịch và kết quả), Xếp hạng (Mùa và ELO), Thống kê, Lịch sử chi tiết, popup mem, Tôi. Kiểm theo Review Focus 1, 2, 4: lưới không chạm tỷ số với tên dài ở 320px; chữ và viền focus (Tab bằng bàn phím) nhìn rõ trên `--chrome` ở theme sáng; dấu tiếng Việt trong Barlow đúng font. Lỗi tìm thấy thì sửa trong task này kèm test lớp tương ứng.

- [ ] **Step 3: Cập nhật `CLAUDE.md`**

- Dòng "Giao diện": "phong cách sân cầu (xanh sân, vàng chanh), hai theme sáng/tối, font Barlow Condensed cho số và tiêu đề, Be Vietnam Pro cho nội dung (spec 8.1)".
- Lưu ý shadcn: "token `--accent` của dự án là màu nhấn (vàng chanh/xanh sân)" thay cho "màu cam".
- Lưu ý font: thêm Barlow Condensed 600/700 nghiêng ở `src/fonts/barlow-condensed/`; thêm "chữ trên `--chrome` chỉ dùng `--on-chrome`/`--chrome-active`, focus `ring-chrome-active`".
- Cấu trúc thư mục: dòng `src/fonts/` ghi cả hai font.

- [ ] **Step 4: Commit**

```bash
graphify update .
git add CLAUDE.md docs/backlog.md docs/superpowers/plans/2026-10-24-plan-6-court-style.md
git commit -m "docs(plan-6/task-8): update CLAUDE.md for court style"
```
