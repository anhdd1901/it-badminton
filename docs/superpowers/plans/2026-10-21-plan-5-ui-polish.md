# Kế hoạch 5: Hoàn thiện giao diện — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Thêm các tương tác dùng chung của spec 8.2: menu bên thẳng hàng, select/chọn tháng bằng shadcn, đổi mùa bằng bộ chọn tháng, highlight mem khi hover, popup thông tin mem.

**Architecture:** Hai thành phần dùng chung mới: `MonthPicker` (lưới tháng trong popover shadcn) và `MemberDialog` (popup lấy dữ liệu bằng một Server Action chỉ đọc, `getMemberProfileView` ở lớp views). `PlayerName` = nút mở `MemberDialog` + đọc `PlayerFocusProvider` để highlight. Các bảng và thẻ trận chỉ đổi cách hiển thị tên mem.

**Tech Stack:** Next.js 16 (App Router), React 19, Tailwind 4, shadcn/ui (`select`, `popover` thêm bằng CLI, dựa trên gói `radix-ui` đã có), Vitest + Testing Library, Playwright. Không thêm thư viện nào khác.

**Spec:** `docs/superpowers/specs/2026-10-10-badminton-club-app-design.md` — mục 8.1 (token màu), 8.2 (tương tác dùng chung, bố cục popup mem và `MonthPicker`), 4.7, 4.9, 4.10.

## Global Constraints

- Mọi màu qua token CSS ở spec 8.1; không viết màu cứng trong thành phần (trừ màu avatar chữ cái đã có).
- Cặp chữ/nền đạt tối thiểu 4,5:1, kiểm bằng `src/ui/tokens.test.ts`.
- Chữ giao diện là tiếng Việt, viết hoa kiểu câu; dùng thuật ngữ trong `GLOSSARY.md`.
- Vùng chạm tối thiểu 44px (`min-h-11`); số dùng `tabular-nums`; ELO hiển thị bằng `formatElo`, hiệu số bằng `formatDiff` (`src/ui/format.ts`).
- Client component và `src/ui/` chỉ được `import type` từ `@/server/*` và `@/app/_lib/*`.
- Server Action đi qua `runAction`; action chỉ đọc truyền `{ revalidate: false }`; id mem từ client đi qua `parseMemberId`, mùa qua `parseSeasonId` (`src/server/validation.ts`).
- Next.js 16 khác kiến thức cũ: trước khi viết code Next, đọc `node_modules/next/dist/docs/`.
- Test thành phần có `// @vitest-environment jsdom` ở dòng đầu; `pnpm test`, `pnpm typecheck`, `pnpm lint` phải sạch trước mỗi commit; test tích hợp `pnpm test:int`.
- Mỗi task: chạy `graphify update .` trước commit, commit `<loại>(plan-5/task-N): …`, tích `- [x]` các bước của task trong file này, cùng commit.
- Trong spec, "mùa" = tháng (`SeasonId` dạng `"2026-10"`); `season` truyền xuống thành phần luôn là `SeasonId`.

## Review Focus

1. Mở popup mem rồi đóng ngay (hoặc mở mem khác) khi kết quả của lần gọi cũ về sau → không được hiện dữ liệu của mem cũ. (Task 7)
2. Popup của mem đã ngưng hoặc mem chưa có trận nào → không lỗi; mùa hiện số 0 và hạng "–"; Hạt giống "–" cho mem đã ngưng. (Task 6, 7)
3. URL `?mua=` sớm hơn mùa có dữ liệu đầu tiên hoặc sau mùa hiện tại → bộ chọn không vỡ, nút ◀ vô hiệu. (Task 4)
4. `?mem=` trỏ tới mem không có trận → ô chọn mem vẫn hiện đúng mem đó, không hiện "Tất cả mem". (Task 5)
5. Phiên hết hạn khi popup mở (`UNAUTHENTICATED`) → chuyển về đăng nhập, không kẹt "Đang tải". (Task 7)

---

## File Structure

| File | Trách nhiệm |
|---|---|
| `src/components/app-nav.tsx` | menu bên thẳng hàng (Task 1) |
| `src/app/globals.css`, `src/ui/tokens.test.ts` | token `--highlight` (Task 2) |
| `src/components/ui/select.tsx`, `popover.tsx` | shadcn, sinh bằng CLI, sửa hover khỏi màu cam (Task 2) |
| `src/components/month-picker.tsx` | `MonthPicker` (lưới tháng) và `MonthPopover` (popover + nút mở) (Task 3) |
| `src/components/season-picker.tsx` | chọn mùa ở Xếp hạng (Task 4) |
| `src/server/views/rankings.ts` | `firstSeasonWithResults`, `withSelectedMember` (Task 4, 5) |
| `src/components/stats/stats-filter.tsx` | bộ lọc Thống kê bằng Select + MonthPopover (Task 5) |
| `src/server/views/member-profile.ts`, `src/app/_actions/member-profile.ts` | dữ liệu và action của popup mem (Task 6) |
| `src/components/member/member-dialog.tsx` | popup mem (Task 7) |
| `src/components/player-focus.tsx`, `src/components/player-name.tsx` | highlight và nút tên mem (Task 8) |
| `src/components/match/match-card.tsx` | thẻ trận dùng `PlayerName` (Task 9) |
| `src/components/ranking/*`, `src/components/stats/*-table.tsx` | bảng dùng `PlayerName` (Task 10) |
| `e2e/member-popup.spec.ts` | luồng chính (Task 11) |

---

### Task 1: Menu bên thẳng hàng

**Files:**
- Modify: `src/components/app-nav.tsx`
- Test: `src/components/app-nav.test.tsx`

**Interfaces:**
- Consumes: `AppNav({ me: Me })` hiện có.
- Produces: không đổi chữ ký. Ở layout `side`, mỗi link có `justify-start px-1 gap-2` và icon nằm trong `<span data-slot="nav-icon" class="… size-10 …">` căn giữa; khối user dùng cùng `px-1` và `gap-2`.

- [x] **Step 1: Write the failing test** — trong `app-nav.test.tsx`, test `"menu bên: ô icon cùng cỡ avatar, link căn trái cùng lề khối user"`: lấy `aside`; mọi link trong `aside` có class `justify-start` và `px-1`, không có `justify-center`; phần tử `[data-slot="nav-icon"]` của từng link có class `size-10`; khối user (cha của avatar) có `px-1` và `gap-2`. Test `"thanh đáy giữ nguyên"`: link trong `nav` đầu tiên (đáy) vẫn có `flex-col`.
- [x] **Step 2: Run** `pnpm vitest run src/components/app-nav.test.tsx` → FAIL (chưa có `nav-icon`).
- [x] **Step 3: Implement** trong `link()` của `app-nav.tsx`: layout `side` bỏ `justify-center`, dùng `justify-start gap-2 px-1`; bọc `item.Icon` bằng span `data-slot="nav-icon"` `size-10 shrink-0 items-center justify-center` (layout bottom giữ icon trần như cũ). Khối user: `gap-2 px-1`.
- [x] **Step 4: Run** lại test → PASS; `pnpm typecheck`.
- [x] **Step 5: Commit** `feat(plan-5/task-1): align side menu icons and labels with the user block`

---

### Task 2: Nền tảng theme — `--highlight`, shadcn select/popover

**Files:**
- Modify: `src/app/globals.css`, `src/ui/tokens.test.ts`, spec 8.1 (bảng token)
- Create (CLI): `src/components/ui/select.tsx`, `src/components/ui/popover.tsx`

**Interfaces:**
- Produces: token `--highlight` và `--color-highlight` (class `bg-highlight`); `Select, SelectTrigger, SelectValue, SelectContent, SelectItem` và `Popover, PopoverTrigger, PopoverContent` từ `@/components/ui/*`.

- [x] **Step 1: Write the failing tests** trong `tokens.test.ts`: (a) thêm vào `PAIRS`: `["text","highlight"]`, `["text-2","highlight"]`, `["win","highlight"]`, `["loss","highlight"]` (cả hai theme ≥ 4,5:1); (b) thêm `highlight` vào bảng "giá trị khớp spec 8.1" với giá trị khởi điểm sáng `#FFF0E0`, tối `#2E1D10`; (c) test `"select và popover không dùng token cam của --accent cho hover"`: đọc `src/components/ui/select.tsx` và `popover.tsx`, khẳng định không chứa `bg-accent` hay `text-accent-foreground`.
- [x] **Step 2: Run** `pnpm vitest run src/ui/tokens.test.ts` → FAIL.
- [x] **Step 3: Implement**: (1) thêm `--highlight: light-dark(#fff0e0, #2e1d10);` vào `:root` và `--color-highlight: var(--highlight);` vào `@theme inline` (giá trị chỉnh nếu cặp nào dưới 4,5:1, cập nhật cả test và bảng spec); (2) `pnpm dlx shadcn@latest add select popover`; (3) trong hai file sinh ra, thay mọi `bg-accent`/`focus:bg-accent`/`text-accent-foreground` bằng `bg-surface-2` và `text-text`; (4) thêm hàng `--highlight` vào bảng token ở spec 8.1 ("tên mem được tô khi hover; nền cam nhạt").
- [x] **Step 4: Run** `pnpm test && pnpm typecheck && pnpm lint` → sạch.
- [x] **Step 5: Commit** `feat(plan-5/task-2): add highlight token and shadcn select/popover without orange hover`

---

### Task 3: `MonthPicker` và `MonthPopover`

**Files:**
- Create: `src/components/month-picker.tsx`
- Test: `src/components/month-picker.test.tsx`

**Interfaces:**
- Consumes: `Popover*` (Task 2), `SeasonId` (`@/domain/types`).
- Produces (client):
  - `MonthPicker({ value: SeasonId | null, onChange: (s: SeasonId | null) => void, max: SeasonId, min?: SeasonId, clearable?: boolean })`: hàng năm có nút `aria-label="Năm trước"` / `"Năm sau"` và lưới 4×3. Mỗi ô là `<button aria-label="Tháng M/YYYY" aria-pressed>` hiện "TM", cao 44px, `disabled` khi ngoài `[min, max]`. Năm hiển thị ban đầu là năm của `value ?? max`; nút năm bị vô hiệu ở năm của `min` / `max`. Có `clearable` thì thêm nút "Xóa" gọi `onChange(null)`.
  - `MonthPopover(props: MonthPickerProps & { children: ReactNode; id?: string; triggerClassName?: string; "aria-label"?: string })`: `PopoverTrigger asChild` bọc `<button type="button">` chứa `children`; chọn tháng hoặc xóa thì đóng popover.

- [x] **Step 1: Write the failing tests** (`month-picker.test.tsx`): `"tháng ngoài khoảng bị vô hiệu"` (min `2026-03`, max `2026-10`: "Tháng 2/2026" và "Tháng 11/2026" có `disabled`, "Tháng 3/2026" không); `"chọn tháng gọi onChange với SeasonId"` (click "Tháng 5/2026" → `onChange("2026-05")`); `"tháng đang chọn có aria-pressed"`; `"nút năm dừng ở năm của min và max"` (min `2025-11`, max `2026-10`: "Năm trước" bấm được một lần rồi `disabled`; "Năm sau" `disabled` khi đang ở 2026); `"Xóa chỉ có khi clearable và gọi onChange(null)"`; `"mũi tên phải/xuống chuyển focus sang ô kế (+1 / +4)"`; `"MonthPopover đóng sau khi chọn"` (mở bằng nút, chọn, `queryByRole("dialog")` null).
- [x] **Step 2: Run** `pnpm vitest run src/components/month-picker.test.tsx` → FAIL.
- [x] **Step 3: Implement** theo Interfaces; rộng popover `w-64`; ô đang chọn `bg-accent text-on-accent rounded-full`, ô khác `bg-surface-2`, ô disabled `opacity-40`; điều hướng mũi tên bằng handler `onKeyDown` trên lưới, nhảy qua ô disabled. Radix lo Esc.
- [x] **Step 4: Run** test → PASS; `pnpm typecheck`.
- [x] **Step 5: Commit** `feat(plan-5/task-3): add MonthPicker and MonthPopover`

---

### Task 4: Chọn mùa ở Xếp hạng bằng `MonthPicker`

**Files:**
- Modify: `src/server/views/rankings.ts`, `src/components/season-picker.tsx`, `src/app/(app)/xep-hang/page.tsx`
- Test: `src/server/views/rankings.int.test.ts`, `src/components/season-picker.test.tsx` (tạo mới)

**Interfaces:**
- Consumes: `MonthPopover` (Task 3).
- Produces:
  - `firstSeasonWithResults(db: Db, now: Date): Promise<SeasonId | null>` (`rankings.ts`): mùa sớm nhất có trận có kết quả; `finalizeDue` chạy trước.
  - `SeasonPicker({ value, min, max, hrefBase }: { value: SeasonId; min: SeasonId; max: SeasonId; hrefBase: string })` thành client component (`"use client"`, dùng `useRouter().push`). Đường dẫn của một mùa là `${hrefBase}${season}`; trang truyền `hrefBase="/xep-hang?mua="` (không truyền hàm từ server xuống client).

- [ ] **Step 1: Write the failing tests**: int test `firstSeasonWithResults` — database rỗng → `null`; sau khi nhập kết quả ở hai buổi thuộc hai tháng → trả tháng sớm hơn. `season-picker.test.tsx` (mock `next/navigation`): `"bấm tháng/năm mở bộ chọn, chọn tháng gọi push(hrefBase + mùa)"` (hrefBase `/xep-hang?mua=`, value `2026-10`, min `2026-08`, click nút "Tháng 10/2026", click "Tháng 9/2026" → `push("/xep-hang?mua=2026-09")`); `"◀ vô hiệu khi value <= min"` (hiện dạng không phải link, có `aria-disabled`); `"▶ vô hiệu khi value >= max"`; `"value ngoài [min, max] không làm vỡ"` (value `2026-05`, min `2026-08` → render, ◀ vô hiệu).
- [ ] **Step 2: Run** `pnpm vitest run src/components/season-picker.test.tsx` và `pnpm test:int -- rankings` → FAIL.
- [ ] **Step 3: Implement** `firstSeasonWithResults` bằng `loadResultMatches` + `seasonOf`; viết lại `SeasonPicker` theo Interfaces (giữ hai nút ◀ ▶ là `Link` khi còn đi được, chữ giữa là `MonthPopover` kèm icon `ChevronDown` nhỏ); trang Xếp hạng truyền `hrefBase="/xep-hang?mua="`, `min={(await firstSeasonWithResults(db, at)) ?? current}` và `max={current}`.
- [ ] **Step 4: Run** cả hai lệnh trên → PASS; `pnpm typecheck`.
- [ ] **Step 5: Commit** `feat(plan-5/task-4): pick ranking season from a month picker`

---

### Task 5: Bộ lọc Thống kê bằng Select + `MonthPopover`

**Files:**
- Modify: `src/components/stats/stats-filter.tsx`, `src/components/stats/stats-filter.test.tsx`, `src/server/views/rankings.ts`, `src/app/(app)/thong-ke/page.tsx`
- Test: `src/server/views/rankings.int.test.ts`

**Interfaces:**
- Consumes: `MonthPopover` (Task 3), `Select*` (Task 2), `firstSeasonWithResults` (Task 4).
- Produces:
  - `withSelectedMember(db: Db, options: MemberRef[], memberId: string | undefined): Promise<MemberRef[]>` (`rankings.ts`): thêm mem được chọn vào cuối `options` nếu thiếu và tồn tại; ngược lại trả `options`.
  - `StatsFilter({ value: StatsFilterValue, members: MemberRef[], bounds: { min: SeasonId; max: SeasonId } })` (client). Form vẫn `method="get"`, gửi `xem`, `tu`, `den`, `mem` như cũ: `tu`/`den`/`mem` là `<input type="hidden">` theo state ("" khi để trống); giá trị "Tất cả mem" nội bộ là `"all"` và gửi `mem=""`.

- [ ] **Step 1: Write the failing tests**: int test `withSelectedMember` — mem chưa có trận được thêm vào cuối; mem đã có trong `options` không bị lặp; `undefined` hoặc id không tồn tại → trả nguyên `options`. Cập nhật `stats-filter.test.tsx`: hidden `tu`/`den` mang giá trị `value.from`/`value.to`; `"nút Xóa đưa ô từ tháng về trống"` (hidden `tu` thành ""); Select hiện "Tất cả mem" khi không có `memberId`, hiện tên (kèm "(đã ngưng)") khi có; hidden `mem` mang id (hoặc "" khi tất cả); "Bỏ lọc" vẫn trỏ `/thong-ke?xem=<view>`; không còn `input[type="month"]` hay `<select>` gốc.
- [ ] **Step 2: Run** `pnpm vitest run src/components/stats/stats-filter.test.tsx` và `pnpm test:int -- rankings` → FAIL.
- [ ] **Step 3: Implement** theo Interfaces. Mỗi `MonthPopover` có `clearable`, `triggerClassName` giống chiều cao/viền của `Input`, nội dung nút là "Tháng M/YYYY" (`formatSeason`) hoặc "Toàn bộ" khi trống, `<Label htmlFor>` trỏ id nút. Trang Thống kê: `options = await withSelectedMember(db, all.members.map(r => r.member), params.memberId)` và `bounds = { min: (await firstSeasonWithResults(db, at)) ?? current, max: current }` (`current = seasonOf(matchDayOfWeek(at))`).
- [ ] **Step 4: Run** hai lệnh trên → PASS; `pnpm typecheck && pnpm lint`.
- [ ] **Step 5: Commit** `feat(plan-5/task-5): stats filter with shadcn select and month picker`

---

### Task 6: Dữ liệu popup mem

**Files:**
- Create: `src/server/views/member-profile.ts`, `src/app/_actions/member-profile.ts`
- Test: `src/server/views/member-profile.int.test.ts`

**Interfaces:**
- Consumes: `loadMemberRefs`, `endedSeasons`, `MemberRef` (`rankings.ts`); `loadResultMatches`, `loadEloState`, `loadCurrentSeeds` (`../data/loaders`); `seasonStandings`, `memberStats` (`@/domain/stats`); `parseMemberId`, `parseSeasonId`.
- Produces:
  ```ts
  export type MemberProfileView = {
    member: MemberRef;
    eloTenths: number;
    seed: 1 | 2 | null; // null khi mem đã ngưng
    lastMatchDayDelta: number | null;
    season: { id: SeasonId; rank: number | null; totals: Totals; diff: number };
    allTime: { totals: Totals; diff: number; podium: Podium };
  };
  getMemberProfileView(db: Db, memberId: string, season: string, now: Date): Promise<MemberProfileView>
  // action: getMemberProfileAction(memberId: string, season: string): Promise<ActionResult<MemberProfileView>>
  ```

- [ ] **Step 1: Write the failing tests** (`member-profile.int.test.ts`, cùng cách dựng dữ liệu như `rankings.int.test.ts`): `"khớp getSeasonView và getStatsView"` (mem có trận: `season.rank/totals/diff` bằng dòng của `getSeasonView`, `allTime` bằng dòng của `getStatsView({})`, `eloTenths/seed/lastMatchDayDelta` bằng dòng của `getEloView`); `"mem chưa có trận: tổng bằng 0, hạng null, podium toàn 0, ELO là ELO ban đầu"`; `"mem đã ngưng: seed null, ELO vẫn có"`; `"id không phải uuid → AppError VALIDATION"`; `"uuid không tồn tại → AppError NOT_FOUND với MESSAGES.memberNotFound"`; `"mùa sai định dạng → VALIDATION"`.
- [ ] **Step 2: Run** `pnpm test:int -- member-profile` → FAIL.
- [ ] **Step 3: Implement** `getMemberProfileView` (validate → `finalizeDue` → tải trận một lần cho phần mùa; `endedSeasons` + `memberStats(matches, ended, { memberId })` cho `allTime`; thiếu dòng thì dùng số 0) và action (file có `"use server"`, `runAction(({ db, now }) => getMemberProfileView(db, memberId, season, now), { revalidate: false })`; action tự có kiểm phiên nhờ `runAction`).
- [ ] **Step 4: Run** `pnpm test:int -- member-profile` → PASS; `pnpm typecheck`.
- [ ] **Step 5: Commit** `feat(plan-5/task-6): member profile view and read-only action`

---

### Task 7: `MemberDialog`

**Files:**
- Create: `src/components/member/member-dialog.tsx`
- Modify: `src/ui/format.ts` (thêm `formatSeasonShort`), `src/ui/format.test.ts`
- Test: `src/components/member/member-dialog.test.tsx`

**Interfaces:**
- Consumes: `getMemberProfileAction` và `MemberProfileView` (Task 6, chỉ `import type` cho kiểu), `useAppAction`, `Dialog*`, `MemberAvatar` (cần kích thước 56: thêm `56` vào `size` và `TEXT_SIZE` của `member-avatar.tsx`), `formatElo`, `formatDiff`, `formatSeasonShort`.
- Produces:
  - `formatSeasonShort(season: SeasonId): string` — `"2026-10"` → `"10/2026"`.
  - `MemberDialog({ memberId: string, season: SeasonId, children: ReactNode, triggerClassName?: string, triggerProps?: React.ComponentProps<"button"> })` (client): trigger là `<button type="button">` chứa `children`. Khi mở, gọi action một lần; trạng thái `loading | error | ready`.

- [ ] **Step 1: Write the failing tests** (mock `@/app/_actions/member-profile`, `next/navigation`, `sonner`): `format.test.ts`: `formatSeasonShort("2026-10") === "10/2026"`. `member-dialog.test.tsx`: `"mở popup gọi action đúng một lần với (memberId, season)"`; `"hiện khung xương khi đang tải"` (`role="status"`); `"hiện tên, ELO bằng formatElo, Hạt giống, hai nhóm số liệu"` (tiêu đề "Mùa 10/2026" và "Toàn thời gian"; nhãn Thắng, Hiệu số, Cầu thắng, Cầu thua, Số trận, Hạng; số lần hạng 1–4); `"chevron: delta > 0 có aria-label 'Tăng 12,3 điểm ở buổi gần nhất', < 0 'Giảm …', null hoặc 0 không có"`; `"mem đã ngưng: nhãn 'Đã ngưng', Hạt giống hiện '–'"`; `"hạng mùa null hiện '–'"`; `"lỗi: hiện thông báo và nút 'Thử lại' gọi lại action"`; `"đóng popup trước khi kết quả về thì không hiện dữ liệu khi mở lại mem khác"` (action trả promise điều khiển được: mở A, đóng, mở lại, resolve A muộn → không thấy tên A); `"UNAUTHENTICATED → router.replace('/dang-nhap')"`; `"popup luôn thoát trạng thái tải khi action ném lỗi"`.
- [ ] **Step 2: Run** `pnpm vitest run src/components/member src/ui/format.test.ts` → FAIL.
- [ ] **Step 3: Implement** theo bố cục spec 8.2: `DialogContent` với `className` giúp điện thoại là sheet dưới (`max-sm:top-auto max-sm:bottom-0 max-sm:translate-y-0 max-sm:max-w-full max-sm:rounded-b-none`) và `sm:max-w-sm`; `DialogTitle` là tên mem (cần có cho a11y, dùng `sr-only` nếu tiêu đề hiển thị khác); ELO cỡ lớn `text-3xl font-semibold tabular-nums` kèm chevron `ChevronUp` (`text-seed-2`) / `ChevronDown` (`text-danger`) của lucide với `aria-label`; ô số liệu nền `bg-surface-2`, nhãn `text-text-2`, lưới `grid-cols-3`. Tải dữ liệu bằng `useRef` đếm lượt gọi: chỉ nhận kết quả của lượt mới nhất và chỉ khi popup còn mở; dùng `try/finally` để luôn tắt trạng thái tải; đóng popup thì đặt lại trạng thái.
- [ ] **Step 4: Run** test → PASS; `pnpm typecheck && pnpm lint`.
- [ ] **Step 5: Commit** `feat(plan-5/task-7): member popup`

---

### Task 8: Highlight khi hover và nút tên mem

**Files:**
- Create: `src/components/player-focus.tsx`, `src/components/player-name.tsx`
- Test: `src/components/player-name.test.tsx`

**Interfaces:**
- Consumes: `MemberDialog` (Task 7), token `bg-highlight` (Task 2).
- Produces:
  - `PlayerFocusProvider({ children })` và hook `usePlayerFocus(): { focusedId: string | null; setFocusedId: (id: string | null) => void }` (ngoài provider trả `{ focusedId: null, setFocusedId: () => {} }`).
  - `PlayerName({ player: { id: string; displayName: string }, season: SeasonId, className?: string, children?: ReactNode })`: render `MemberDialog` với `children ?? player.displayName`; trigger có `data-focused` khi `focusedId === player.id`, class `rounded-sm data-focused:bg-highlight`; chuột vào/ra (`onPointerEnter/Leave`, chỉ khi `pointerType === "mouse"`) và focus bàn phím (`onFocus` chỉ khi `:focus-visible`, `onBlur`) đặt/bỏ `focusedId`.

- [ ] **Step 1: Write the failing tests**: `"rê vào một tên thì mọi tên cùng id trong provider có data-focused, rời thì bỏ"` (hai `PlayerName` cùng id, một id khác; `fireEvent.pointerEnter(el, { pointerType: "mouse" })`); `"pointerType touch không highlight"`; `"id khác không highlight"`; `"không có provider vẫn render và bấm được (không lỗi)"`; `"bấm tên mở popup"` (mock action, `findByRole("dialog")`); `"blur bỏ highlight"`.
- [ ] **Step 2: Run** `pnpm vitest run src/components/player-name.test.tsx` → FAIL.
- [ ] **Step 3: Implement** theo Interfaces; truyền handler qua `triggerProps` của `MemberDialog`.
- [ ] **Step 4: Run** test → PASS; `pnpm typecheck`.
- [ ] **Step 5: Commit** `feat(plan-5/task-8): player focus highlight and PlayerName`

---

### Task 9: Thẻ trận và trang dùng `PlayerName`

**Files:**
- Modify: `src/components/match/match-card.tsx`, `src/components/match/match-card.test.tsx`, `src/app/(app)/page.tsx`, `src/app/(app)/lich-su/[ngay]/page.tsx`

**Interfaces:**
- Consumes: `PlayerName`, `PlayerFocusProvider`; `seasonOf` (`@/domain/time`).
- Produces: `MatchCard` thêm prop `season: SeasonId`. Thẻ chỉ xem giữ nguyên bố cục, tên là `PlayerName`. Thẻ sửa được là `div` có `relative`; nút "Nhập tỷ số trận N" (`DialogTrigger`) là phần tử `absolute inset-y-0 right-0 w-14` phủ cột tỷ số, trong suốt, có viền focus rõ; `data-testid="team-a"/"team-b"` và `tone` giữ nguyên. Trang Tuần này bọc `<section>` lịch bằng `PlayerFocusProvider` và truyền `season={seasonOf(view.day)}`. Trang chi tiết Lịch sử bọc cả danh sách người tham gia và lịch bằng một provider, người tham gia dùng `PlayerName`, `season={seasonOf(detail.day)}`.

- [ ] **Step 1: Write the failing tests** (cập nhật `match-card.test.tsx`; mock thêm `@/app/_actions/member-profile`): `"tên mem trong thẻ là nút mở popup, kể cả khi thẻ sửa được"`; `"thẻ sửa được: không có nút lồng trong nút"` (không `button` nào chứa `button` khác); `"nút Nhập tỷ số trận N vẫn mở popup nhập tỷ số"`; `"hover tên một mem tô mọi vị trí của mem đó trong các thẻ cùng provider"` (hai thẻ, cùng mem ở hai trận); các test cũ về `text-win`/`text-loss`/hạt giống vẫn qua.
- [ ] **Step 2: Run** `pnpm vitest run src/components/match` → FAIL.
- [ ] **Step 3: Implement** theo Interfaces; hạt giống `●` giữ nguyên bên cạnh tên.
- [ ] **Step 4: Run** `pnpm test && pnpm typecheck && pnpm lint` → sạch.
- [ ] **Step 5: Commit** `feat(plan-5/task-9): match cards use PlayerName with hover highlight and popup`

---

### Task 10: Bảng xếp hạng và thống kê dùng `PlayerName`

**Files:**
- Modify: `src/components/ranking/season-table.tsx`, `src/components/ranking/elo-table.tsx`, `src/components/stats/member-stats-table.tsx`, `src/components/stats/pair-stats-table.tsx`, `src/app/(app)/xep-hang/page.tsx`, `src/app/(app)/thong-ke/page.tsx`, `src/components/ranking/elo-table.test.tsx`

**Interfaces:**
- Consumes: `PlayerName` (Task 8). Mỗi bảng thêm prop `season: SeasonId`; trang Xếp hạng truyền `view.season` cho bảng mùa và `current` cho bảng ELO; trang Thống kê truyền `current` (`seasonOf(matchDayOfWeek(at))`).
- Produces: tên mem trong cả bốn bảng là `PlayerName` (không bọc provider nên không highlight). Bảng cặp: hai `PlayerName` cách nhau " & ", mỗi tên là nút riêng. Cột Hạng, avatar và `title` rút gọn giữ nguyên. Danh sách điểm danh (`RosterDialog`) **không** đổi.

- [ ] **Step 1: Write the failing tests**: `elo-table.test.tsx` thêm `"tên mem là nút mở popup"` (mock action; click tên → `findByRole("dialog")`); thêm `season-table.test.tsx`, `member-stats-table.test.tsx`, `pair-stats-table.test.tsx` mỗi file một test tương tự (bảng cặp: hai nút, click nút thứ hai mở popup của mem thứ hai: kiểm `getMemberProfileAction` gọi với id mem thứ hai và `season` truyền vào).
- [ ] **Step 2: Run** `pnpm vitest run src/components/ranking src/components/stats` → FAIL.
- [ ] **Step 3: Implement** theo Interfaces.
- [ ] **Step 4: Run** `pnpm test && pnpm typecheck && pnpm lint` → sạch.
- [ ] **Step 5: Commit** `feat(plan-5/task-10): rankings and stats tables open the member popup`

---

### Task 11: Kiểm tra đầu cuối, kiểm tra thị giác, tài liệu

**Files:**
- Create: `e2e/member-popup.spec.ts`
- Modify: `docs/backlog.md`, `CLAUDE.md`, spec nếu lệch

**Interfaces:**
- Consumes: mọi thứ ở Task 1–10; seed và `login()` trong `e2e/`.
- Produces: không.

- [ ] **Step 1: Write the e2e spec** (theo cách `e2e/week.spec.ts`/`history.spec.ts` đang làm): `"Xếp hạng: bấm tên mem mở popup có 'Toàn thời gian'"`; `"Xếp hạng: bấm tháng/năm, chọn tháng khác đổi URL ?mua="`; `"Thống kê: chọn mem bằng Select và lọc, URL có mem="`; `"Lịch sử chi tiết: rê vào tên một mem thì mọi chỗ của mem đó có data-focused"`; `"Tuần này (admin): nút Nhập tỷ số vẫn mở, bấm tên mem mở popup mem"`.
- [ ] **Step 2: Run** `pnpm test:e2e` (cần `pnpm db:up`) → PASS; sửa lỗi thật nếu có.
- [ ] **Step 3: Kiểm tra thị giác** bằng skill `agent-browser`: chụp Tuần này, Xếp hạng (mở bộ chọn tháng), Thống kê (mở Select), popup mem ở 1280px và 390px, theme sáng và tối; xác nhận bằng số đo (`getBoundingClientRect`) tâm icon menu trùng tâm avatar và mép trái label trùng mép trái tên user; popup điện thoại là sheet dưới; không có nền hover màu cam trong Select. Sửa lệch nhìn thấy, chạy lại e2e.
- [ ] **Step 4: Cập nhật tài liệu** (agent điều phối): xóa khỏi `docs/backlog.md` các mục plan 5 đã xử lý (`--accent` trùng tên token cam; nút ◀ không có giới hạn dưới; ô select lặp class `Input`; `?mem=` trỏ mem chưa có trận); `CLAUDE.md`: mục Tài liệu thành 5 kế hoạch (5 Hoàn thiện giao diện), Cấu trúc thư mục thêm `src/components/member/`, mục Lưu ý thêm "component shadcn thêm sau: thay `bg-accent`/`text-accent-foreground` bằng `bg-surface-2`/`text-text` (token `--accent` là màu cam)"; đối chiếu spec 8.2 với bản làm ra.
- [ ] **Step 5: Run** `pnpm test && pnpm test:int && pnpm typecheck && pnpm lint && pnpm build` → sạch; `graphify update .`.
- [ ] **Step 6: Commit** `docs(plan-5/task-11): e2e for shared interactions and update docs`
