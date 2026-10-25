# Kế hoạch 7: Đổi người trong trận

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Admin đổi được người trong từng cặp của một trận thuộc lịch chính thức, tỷ số giữ nguyên, mọi bảng tự tính lại.

**Architecture:** Quy tắc thuần `checkLineup` ở `src/domain/lineup.ts`, dùng chung cho server và client. Hàm nghiệp vụ `changeMatchPlayers` nằm trong `src/server/match-days/results.ts` để dùng lại các hàm phụ có sẵn (`prepare`, `requireMatchDay`, `requireOfficialId`, `findMatch`) và UPDATE `scheduled_matches.a1..b2`. Không đổi schema: xung đột được phát hiện bằng cách so 4 người client đã thấy với 4 người hiện tại. Xếp hạng, ELO và thống kê đọc `scheduled_matches` nên tự đúng mà không cần sửa. Giao diện thêm phần "Người chơi" vào popup "Trận N" của `MatchCard`.

**Tech Stack:** Next.js 16 (Server Action qua `runAction`), Drizzle + PostgreSQL, React 19, shadcn `Select`, Vitest + Testing Library, Playwright.

**Spec:** `docs/superpowers/specs/2026-10-10-badminton-club-app-design.md`, mục 4.6a, 5.3 (dòng "Đổi người trong trận"), 8.2 ("Đổi người trong popup Trận N"), 9, 10.

## Global Constraints

- Chỉ admin được đổi, và chỉ khi `canEditResults(day, now, "admin")` đúng: buổi tuần hiện tại từ 00:00 thứ 7, hoặc buổi đã qua.
- Chỉ đổi trên lịch chính thức; buổi đang dùng lịch nháp thì báo NOT_FOUND `MESSAGES.noSchedule` và giao diện không có phần đổi người.
- Người được chọn phải thuộc `official_schedules.assignments` của buổi; một trận cần 4 người khác nhau; không kiểm số trận mỗi người.
- Câu thông báo, chép nguyên văn: xung đột "Trận này vừa được đổi người, hãy tải lại"; sai người "Mỗi trận cần 4 người khác nhau có tên trong lịch của buổi".
- Không gửi `username` xuống client: lựa chọn người chỉ mang `{ id, displayName }` (CLAUDE.md, spec 5.2).
- Mỗi thao tác ghi gọi `finalizeDue` trước, rồi `lockMatchDay`, rồi kiểm `scheduleKey` (CLAUDE.md, lớp nghiệp vụ).
- Id từ client đi qua `parseMemberId`.
- Client component và `src/ui/` chỉ được `import type` từ `@/server/*` và `@/app/_lib/*`.
- Nút tự viết cần `focus-visible:ring-2 focus-visible:ring-ring`; với shadcn `Select` thì dùng `bg-surface-2`/`text-text` thay cho `bg-accent`.

## Review Focus

1. Admin đổi người ở trận đã có tỷ số: tỷ số và `version` của kết quả giữ nguyên, bảng xếp hạng mùa đổi theo (Task 2, test "đổi người trận đã có tỷ số: xếp hạng tính lại").
2. Đổi người lúc còn lịch nháp (trước 12:00 thứ 7, chưa có kết quả): bị từ chối, không chốt lịch chính thức ngầm (Task 2, test "lịch nháp: NOT_FOUND, không chốt lịch").
3. Một người đã ngưng hoạt động sau khi chốt vẫn có tên trong lịch nên vẫn được chọn ở buổi đã qua (Task 2, test "mem đã ngưng vẫn chọn được").
4. Cùng người xuất hiện hai lần trong một trận, kể cả khác cặp, thì bị từ chối ở cả client lẫn server (Task 1 và Task 4).
5. Subadmin không có quyền đổi (`can.changePlayers === false`) và roster không chứa `username` (Task 3); popup lúc còn lịch nháp không có phần "Người chơi" (Task 5 e2e).

---

### Task 1: Quy tắc `checkLineup` và thông báo lỗi

**Files:**
- Create: `src/domain/lineup.ts`
- Test: `src/domain/lineup.test.ts`
- Modify: `src/server/errors.ts` (thêm vào `MESSAGES`)

**Interfaces:**
- Produces:
  - `type Lineup = { teamA: Pair; teamB: Pair }` (dùng `Pair` từ `src/domain/types.ts`).
  - `function checkLineup(lineup: Lineup, roster: ReadonlySet<MemberId>): boolean`: trả `true` khi 4 id khác nhau và đều thuộc `roster`.
  - `const LINEUP_INVALID = "Mỗi trận cần 4 người khác nhau có tên trong lịch của buổi"`, export từ `src/domain/lineup.ts` để client hiện lỗi tại chỗ.
  - `MESSAGES.badLineup = LINEUP_INVALID` và `MESSAGES.lineupChanged = "Trận này vừa được đổi người, hãy tải lại"` trong `src/server/errors.ts`.

- [x] **Step 1: Viết test hỏng** `src/domain/lineup.test.ts`

```ts
const roster = new Set(["a", "b", "c", "d", "e"]);
it("4 người khác nhau trong lịch: hợp lệ", () =>
  expect(checkLineup({ teamA: ["a", "b"], teamB: ["c", "e"] }, roster)).toBe(true));
it("trùng người trong cùng cặp", () =>
  expect(checkLineup({ teamA: ["a", "a"], teamB: ["c", "d"] }, roster)).toBe(false));
it("trùng người khác cặp", () =>
  expect(checkLineup({ teamA: ["a", "b"], teamB: ["b", "d"] }, roster)).toBe(false));
it("người ngoài lịch", () =>
  expect(checkLineup({ teamA: ["a", "b"], teamB: ["c", "x"] }, roster)).toBe(false));
```

- [x] **Step 2: Chạy và thấy hỏng.** Run: `pnpm test src/domain/lineup.test.ts`. Expected: FAIL (không tìm thấy module).
- [x] **Step 3: Viết `src/domain/lineup.ts`** với các export ở trên, rồi thêm hai mục vào `MESSAGES`. `badLineup` import `LINEUP_INVALID` để chỉ có một chuỗi gốc.
- [x] **Step 4: Chạy lại test.** Run: `pnpm test src/domain/lineup.test.ts && pnpm typecheck`. Expected: PASS.
- [x] **Step 5: Commit**

```bash
graphify update .
git add src/domain/lineup.ts src/domain/lineup.test.ts src/server/errors.ts docs/superpowers/plans/2026-10-25-plan-7-change-match-players.md
git commit -m "feat(plan-7/task-1): checkLineup rule and messages"
```

### Task 2: `changeMatchPlayers` ở lớp nghiệp vụ

**Files:**
- Modify: `src/server/match-days/results.ts`
- Test: `src/server/match-days/results.int.test.ts` (thêm `describe("đổi người trong trận")`, dùng lại `setup()`, `as()`, `SAT()` có sẵn)

**Interfaces:**
- Consumes: `checkLineup`, `Lineup` (Task 1); `MESSAGES.badLineup`, `MESSAGES.lineupChanged`.
- Produces:

```ts
export type ChangePlayersInput = {
  day: string;
  scheduleKey: string;
  matchNumber: number;
  expected: { teamA: [string, string]; teamB: [string, string] }; // 4 người client đã thấy
  next: { teamA: [string, string]; teamB: [string, string] };
};
export async function changeMatchPlayers(db: Db, actor: Actor, input: ChangePlayersInput, now: Date): Promise<void>;
```

Thứ tự xử lý:
1. `prepare` (đã gồm `finalizeDue` và `canEditResults`), rồi `actor.role !== "admin"` thì FORBIDDEN.
2. `parseMemberId` cho cả 8 id.
3. Mở transaction: `lockMatchDay` → `requireMatchDay` → `requireOfficialId(tx, id, scheduleKey)`. Bước này không bao giờ gọi `promoteDraft`.
4. Đọc `a1..b2` của trận (mở rộng `findMatch` để trả thêm `a1, a2, b1, b2`). Không có trận thì NOT_FOUND `matchNotFound`. Lệch `expected` theo đúng vị trí thì CONFLICT `lineupChanged`.
5. Đọc `assignments` của lịch chính thức. `checkLineup(next, roster)` sai thì VALIDATION `badLineup`.
6. UPDATE `scheduledMatches` set `a1, a2, b1, b2` theo `next`. Không đụng `match_results`.

Thứ tự này cố ý kiểm xung đột trước khi kiểm hợp lệ: khi ai đó vừa đổi trận, client cần được báo tải lại chứ không phải nhận lỗi dữ liệu.

- [x] **Step 1: Viết test hỏng.** Chốt lịch chính thức bằng `enterResult` trận 1 lúc `SAT("09:00")` (6 người trong `setup()`). Đọc lineup hiện tại bằng `getWeekView(t.db, admin, now)` (`schedule.matches[i].teamA/teamB` → id). Các test:
  - `"subadmin: FORBIDDEN"`: `changeMatchPlayers` với `sub` → `rejects.toMatchObject({ code: "FORBIDDEN" })`.
  - `"lịch nháp: NOT_FOUND, không chốt lịch"`: chưa nhập kết quả, admin gọi lúc `SAT("09:00")` → `{ code: "NOT_FOUND", message: MESSAGES.noSchedule }`; sau đó `officialSchedules` vẫn rỗng.
  - `"đổi người trận đã có tỷ số: xếp hạng tính lại"`: chọn một người `x` thuộc lịch nhưng không có trong trận 1, thay vào `teamA[0]` của trận 1. Sau đó `getWeekView` trả trận 1 có `teamA[0].id === x` và `result` giữ `{ scoreA: 21, scoreB: 15, version: 1 }`. `getSeasonView(t.db, "2026-10", now)` có dòng của `x` với `wins` tăng 1 so với trước khi đổi; người bị thay ra giảm 1.
  - `"trùng người hoặc người ngoài lịch: VALIDATION"`: `next.teamB[1] = next.teamA[0]` → `{ code: "VALIDATION", message: MESSAGES.badLineup }`; một mem mới tạo bằng `makeMember` không điểm danh → cùng lỗi.
  - `"expected lệch: CONFLICT"`: đổi một lần thành công, gọi lại với `expected` cũ → `{ code: "CONFLICT", message: MESSAGES.lineupChanged }`.
  - `"scheduleKey sai: CONFLICT scheduleChanged"`.
  - `"mem đã ngưng vẫn chọn được"`: buổi 2026-10-10 đã qua có lịch chính thức (điểm danh giữa tuần, nhập kết quả ngày 10/10 như `setup()`), rồi ngưng một mem bằng cách cập nhật `members.active = false` trực tiếp. Admin đổi mem đó vào một trận lúc `SAT("09:00")` của 17/10 → thành công.
- [x] **Step 2: Chạy và thấy hỏng.** Run: `pnpm test:int`. Expected: các test mới FAIL vì `changeMatchPlayers` chưa có.
- [x] **Step 3: Viết `changeMatchPlayers`** trong `src/server/match-days/results.ts` theo thứ tự xử lý ở trên.
- [x] **Step 4: Chạy lại.** Run: `pnpm test:int && pnpm typecheck`. Expected: PASS, test cũ không hỏng.
- [x] **Step 5: Commit** `feat(plan-7/task-2): changeMatchPlayers service`. Trước commit chạy `graphify update .`; commit cùng việc đánh `[x]` trong file kế hoạch.

### Task 3: Dữ liệu cho màn: roster và quyền đổi người

**Files:**
- Modify: `src/server/views/week.ts`, `src/server/views/history.ts`, `src/app/(app)/lich-su/page.tsx`, `src/components/history/history-days.tsx` (chỉ type `HistoryDayItem`)
- Test: `src/server/views/week.int.test.ts`, `src/server/views/history.int.test.ts`

**Interfaces:**
- Produces:
  - `export type PlayerOption = { id: string; displayName: string }` trong `src/server/views/week.ts`.
  - `WeekView.schedule` thêm `roster: PlayerOption[]`: người trong `assignments` của lịch chính thức, sắp theo `displayName` (`localeCompare(…, "vi")`); là `[]` khi `source === "draft"`.
  - `WeekView.can` thêm `changePlayers: boolean`, bằng `actor.role === "admin" && editResults && schedule?.source === "official"`.
  - `getMatchDayDetail` trả thêm `roster: PlayerOption[]`, cùng thứ tự sắp như trên. Giữ `participants` cho chỗ khác đang dùng.
  - `HistoryDayItem` thêm `roster: PlayerOption[]` và `canChangePlayers: boolean`. Trang `lich-su` gán `canChangePlayers = actor.role === "admin" && canEditResults(d.day, at, actor.role)`.

- [ ] **Step 1: Viết test hỏng.**
  - `week.int.test.ts`, trong test "6 người: nháp 6 trận; …": lúc còn lịch nháp thì `schedule.roster` là `[]` và `can.changePlayers === false`. Sau khi nhập trận 1, admin thấy `roster` có 6 phần tử, mỗi phần tử chỉ có đúng các key `["displayName", "id"]` (`Object.keys(..).sort()`), và `can.changePlayers === true`; view của subadmin cho `can.changePlayers === false`.
  - `history.int.test.ts`: `getMatchDayDetail` trả `roster` có cùng tập id với `participants` và không có key `username`.
- [ ] **Step 2: Chạy và thấy hỏng.** Run: `pnpm test:int`. Expected: FAIL ở các assertion mới.
- [ ] **Step 3: Thêm các trường ở trên** vào hai view và trang `lich-su`.
- [ ] **Step 4: Chạy lại.** Run: `pnpm test:int && pnpm typecheck`. Expected: PASS.
- [ ] **Step 5: Commit** `feat(plan-7/task-3): roster and changePlayers in views` (kèm `graphify update .` và `[x]`).

### Task 4: Giao diện: phần "Người chơi" trong popup Trận N

**Files:**
- Create: `src/components/match/players-input.tsx`, `src/components/match/players-input.test.tsx`, `src/ui/lineup.ts`, `src/ui/lineup.test.ts`
- Modify: `src/app/_actions/results.ts`, `src/components/match/match-card.tsx`, `src/components/match/match-card.test.tsx`, `src/app/(app)/page.tsx`, `src/components/history/history-days.tsx`

**Interfaces:**
- Consumes: `PlayerOption` (Task 3, `import type`); `checkLineup`, `LINEUP_INVALID` (Task 1); `ChangePlayersInput` (Task 2).
- Produces:
  - `src/ui/lineup.ts`: `function matchCounts(matches: { teamA: readonly { id: string }[]; teamB: readonly { id: string }[] }[]): Map<string, number>`.
  - `src/app/_actions/results.ts`: `changePlayersAction(input: ChangePlayersInput): Promise<ActionResult>` gọi `changeMatchPlayers` qua `runAction`.
  - Component `PlayersInput`:

    ```ts
    props: {
      roster: PlayerOption[];
      counts: Map<string, number>;
      initial: { teamA: [string, string]; teamB: [string, string] };
      onSave: (next: { teamA: [string, string]; teamB: [string, string] }) => Promise<ActionResult>;
    }
    ```

  - `MatchCard` thêm prop tùy chọn `lineup?: { roster: PlayerOption[]; counts: Map<string, number> }`. Có prop này (và `editable`) thì popup hiện `PlayersInput` dưới `ScoreInput`; không có thì giữ nguyên như cũ.

Giao diện theo spec 8.2:
- Tiêu đề phần "Người chơi", ngăn với phần tỷ số bằng `border-t border-border`.
- Hai nhóm "Cặp A" và "Cặp B", mỗi nhóm 2 `Select` shadcn có `aria-label` "Cặp A, người 1" / "Cặp A, người 2" / "Cặp B, người 1" / "Cặp B, người 2". Lựa chọn hiển thị dạng `"{displayName} · {n} trận"`.
- Chọn trùng người thì hiện `role="alert"` với `LINEUP_INVALID` và vô hiệu nút.
- Nút "Lưu người chơi" chỉ bật khi lineup khác `initial`. Lưu xong (`ok`) thì đóng popup. Lỗi `CONFLICT` thì hiện thông báo và `router.refresh()`, giống `ScoreInput`.

- [ ] **Step 1: Viết test hỏng.**
  - `src/ui/lineup.test.ts`: 2 trận `[a,b] vs [c,d]`, `[a,c] vs [b,e]` → `a:2, b:2, c:2, d:1, e:1`.
  - `players-input.test.tsx` (jsdom, mock `next/navigation` như `score-input.test.tsx`):
    - `"chưa đổi gì: nút Lưu người chơi bị vô hiệu"`.
    - `"hiện số trận trong lựa chọn"`: mở Select "Cặp A, người 1" thấy option "Chi · 4 trận".
    - `"chọn trùng người: báo lỗi, không gọi onSave"`: alert có `textContent === LINEUP_INVALID`, nút disabled.
    - `"đổi một người: gọi onSave với lineup mới"`: `onSave` nhận `{ teamA: ["e", "b"], teamB: ["c", "d"] }`.
  - `match-card.test.tsx`: có `lineup` và `editable` → mở popup thấy heading "Người chơi"; `editable` mà không có `lineup` → không có "Người chơi".
- [ ] **Step 2: Chạy và thấy hỏng.** Run: `pnpm test src/ui/lineup.test.ts src/components/match`. Expected: FAIL.
- [ ] **Step 3: Viết `matchCounts`, `PlayersInput`, `changePlayersAction`; nối `MatchCard`.** Trang Tuần này truyền `lineup={can.changePlayers ? { roster: schedule.roster, counts } : undefined}`, trong đó `counts = matchCounts(schedule.matches)` tính một lần. `HistoryDays` làm tương tự với `d.canChangePlayers`/`d.roster`. `onSave` của popup gọi `changePlayersAction({ day, scheduleKey, matchNumber, expected: id hiện tại của match.teamA/teamB, next })`.
- [ ] **Step 4: Chạy lại.** Run: `pnpm test && pnpm typecheck && pnpm lint`. Expected: PASS.
- [ ] **Step 5: Commit** `feat(plan-7/task-4): players section in match dialog` (kèm `graphify update .` và `[x]`).

### Task 5: E2E và đóng kế hoạch

**Files:**
- Modify: `e2e/history.spec.ts`, `docs/backlog.md` (nếu có minor deferred)

- [ ] **Step 1: Viết test e2e** trong `e2e/history.spec.ts`. Dùng buổi 10/10 đã seed (5 người, 5 trận, mọi trận 21–15), nên mỗi người đánh 4 trận và đứng ngoài 1 trận.
  - `"admin đổi người trận đã có tỷ số, bảng xếp hạng đổi theo"`:
    1. Admin vào `/lich-su/2026-10-10` và bấm "Nhập tỷ số trận 1".
    2. Trong dialog, đổi "Cặp A, người 1" sang người không có trong trận 1 (đọc tên từ option không thuộc 4 tên trận 1), bấm "Lưu người chơi"; dialog đóng.
    3. Thẻ trận 1 `team-a` chứa tên mới.
    4. `/xep-hang` có dòng của người mới khác với trước khi đổi (cách đo như test sửa kết quả có sẵn).
  - Trong test `"buổi đấu: điểm danh, lịch, nhập tỷ số, khóa buổi"` của `e2e/match-day.spec.ts` (admin): lần mở popup đầu tiên (lịch nháp) thì `expect(dialog.getByText("Người chơi")).toHaveCount(0)`; sau khi đã lưu tỷ số đầu tiên, mở popup trận khác thì thấy heading "Người chơi". Quyền subadmin đã được Task 2 và Task 3 kiểm ở server.
- [ ] **Step 2: Chạy.** Run: `pnpm db:up && pnpm test:e2e`. Expected: PASS toàn bộ.
- [ ] **Step 3: Kiểm tra bằng mắt** với `agent-browser`: popup trận ở điện thoại (375px) và máy tính, cả hai theme. Select không tràn ngang, nhãn đọc được trên `--surface`.
- [ ] **Step 4: Chạy toàn bộ kiểm tra.** Run: `pnpm typecheck && pnpm lint && pnpm format:check && pnpm test && pnpm test:int`. Expected: PASS.
- [ ] **Step 5: Commit** `test(plan-7/task-5): e2e change match players`, ghi các minor deferred của reviewer vào `docs/backlog.md` và đánh `[x]`.
