# Kế hoạch 1/4: Nền móng và lõi quy tắc

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Khởi tạo dự án Next.js và viết toàn bộ quy tắc nghiệp vụ của ANH EM IT thành các hàm TypeScript thuần, có test đầy đủ.

**Architecture:** Mọi quy tắc nằm trong `src/domain/`, không import Next.js, database hay React; mỗi file một quy tắc. Test đặt cạnh file (`*.test.ts`), chạy bằng Vitest môi trường `node`. Các kế hoạch sau (database, giao diện) chỉ gọi vào các hàm này.

**Tech Stack:** Node 22, pnpm, TypeScript strict, Next.js 16, Tailwind 4, Vitest, date-fns + `@date-fns/tz`.

**Spec:** `docs/superpowers/specs/2026-10-10-badminton-club-app-design.md` (đọc kèm `GLOSSARY.md` và `CLAUDE.md`).

**Các kế hoạch tiếp theo:** 2 Database, đăng nhập, lớp nghiệp vụ · 3 Giao diện · 4 Vận hành. Viết sau khi kế hoạch này xong.

## Global Constraints

- Mọi mốc thời gian theo `Asia/Ho_Chi_Minh`. Hàm nhận `now: Date` làm tham số, không tự gọi `new Date()` trong `src/domain/`.
- Ngày thi đấu biểu diễn bằng `LocalDate` = chuỗi `"YYYY-MM-DD"` (ngày thứ 7, giờ Việt Nam). Mùa biểu diễn bằng `SeasonId` = chuỗi `"YYYY-MM"`.
- ELO lưu và tính bằng **số nguyên phần mười** (`1000,0` → `10000`) để không lệch số thực. Hiển thị chia 10.
- Tên trong code theo `GLOSSARY.md` (tiếng Anh); thông báo cho người dùng bằng tiếng Việt, dùng dấu gạch nối dài `–` trong tỷ số.
- `src/domain/` không import gì ngoài `date-fns`, `@date-fns/tz` và file khác trong `src/domain/`.
- Commit sau mỗi task với tiền tố `feat:`, `test:` hoặc `chore:`.

## Review Focus

1. **Server chạy giờ UTC (Vercel):** 12:00 thứ 7 giờ Việt Nam là 05:00 UTC; 00:00 thứ 2 giờ Việt Nam là 17:00 UTC chủ nhật. Mọi mốc phải đúng khi `now` được tạo bằng giờ UTC → test ở Task 2.
2. **Tỷ số nhập bậy** (số âm, số lẻ thập phân, NaN, hai bên bằng nhau) phải bị từ chối có lý do, không ném lỗi → test ở Task 3.
3. **Danh sách điểm danh trùng id hoặc khác thứ tự** phải ra cùng khóa danh sách → test ở Task 6.
4. **Bằng ELO ở ranh giới top 4** phải chọn ổn định (người vào sớm hơn, rồi id) → test ở Task 6.
5. **Mem có trong trận nhưng không có ELO ban đầu** (dữ liệu hỏng) phải ném lỗi rõ ràng thay vì ra `NaN` → test ở Task 8.

---

## Cấu trúc file

```
src/domain/
  types.ts          kiểu dùng chung (LocalDate, SeasonId, MemberId, Pair, Winner, Rng)
  time.ts           tuần, cửa sổ điểm danh, mùa, thứ 7 cuối tháng, 12:00 thứ 7
  score.ts          kiểm tra tỷ số
  standings.ts      cộng dồn chỉ số, sắp hạng có đồng hạng (dùng cho mem và cặp)
  diagrams.ts       dữ liệu 16 sơ đồ (Phụ lục A) + kiểm tra + tìm sơ đồ
  seeding.ts        xếp Hạt giống 1/2
  rng.ts            bộ sinh ngẫu nhiên có seed, xáo trộn
  schedule.ts       khóa danh sách, tạo lịch từ sơ đồ
  elo.ts            ELO một trận, tính lại toàn bộ
  match-day.ts      trạng thái buổi, quyền điểm danh / nhập kết quả theo thời gian
  season.ts         thời điểm kết thúc mùa, số lần hạng 1–4
  stats.ts          thống kê theo mem, theo cặp, có bộ lọc
```

---

### Task 1: Khởi tạo dự án

**Files:**
- Create: `package.json`, `tsconfig.json`, `next.config.ts`, `eslint.config.mjs`, `postcss.config.mjs`, `src/app/layout.tsx`, `src/app/page.tsx`, `src/app/globals.css` (từ create-next-app)
- Create: `vitest.config.ts`, `.prettierrc.json`, `.gitignore`, `src/domain/types.ts`, `src/domain/smoke.test.ts`

**Interfaces:**
- Produces: script `pnpm test` (Vitest một lần), `pnpm test:watch`, `pnpm lint`, `pnpm build`; alias `@/*` → `src/*`; các kiểu trong `src/domain/types.ts`:

```ts
export type LocalDate = string;   // "YYYY-MM-DD"
export type SeasonId = string;    // "YYYY-MM"
export type MemberId = string;
export type Pair = readonly [MemberId, MemberId];
export type Winner = "A" | "B";
export type Rng = () => number;   // [0, 1)
```

- [x] **Step 1: Tạo app trong thư mục tạm** (thư mục dự án đã có file nên không tạo trực tiếp)

```bash
cd "$(mktemp -d)" && pnpm create next-app@16 app --ts --tailwind --eslint --app --src-dir --import-alias "@/*" --use-pnpm --yes
```
Expected: thư mục `app/` có `package.json`, `src/app/`.

- [x] **Step 2: Chép vào dự án mà không ghi đè file đang có**

`rsync -a --ignore-existing <tmp>/app/ /home/doanducanh/Desktop/Test/` (bỏ `.git` và `node_modules` của app tạm), rồi `pnpm install` ở thư mục dự án. Đặt `"name": "anh-em-it"` trong `package.json`. Kiểm tra `tsconfig.json` có `"strict": true`.

- [x] **Step 3: Thêm Vitest, Prettier, date-fns**

`pnpm add date-fns @date-fns/tz` và `pnpm add -D vitest prettier`. `vitest.config.ts`: môi trường `node`, `include: ["src/**/*.test.ts"]`, alias `@` → `src`. Script trong `package.json`: `"test": "vitest run"`, `"test:watch": "vitest"`. `.prettierrc.json`: `{ "semi": true, "singleQuote": false, "printWidth": 100 }`. `.gitignore` có `node_modules`, `.next`, `.env*` (trừ `.env.example`).

- [x] **Step 4: Tạo `src/domain/types.ts` (như trên) và test khói**

```ts
// src/domain/smoke.test.ts
import { describe, it, expect } from "vitest";
describe("smoke", () => { it("runs", () => expect(1 + 1).toBe(2)); });
```

- [x] **Step 5: Kiểm tra**

Run: `pnpm test && pnpm lint && pnpm build`
Expected: 1 test pass; lint không lỗi; build thành công.

- [x] **Step 6: Commit**

```bash
git add -A && git commit -m "chore: scaffold Next.js app with Vitest"
```

---

### Task 2: Thời gian (`time.ts`)

**Files:**
- Create: `src/domain/time.ts`
- Test: `src/domain/time.test.ts`

**Interfaces:**
- Consumes: `LocalDate`, `SeasonId` (Task 1)
- Produces:

```ts
export const TIME_ZONE = "Asia/Ho_Chi_Minh";
export function matchDayOfWeek(now: Date): LocalDate;            // thứ 7 của tuần chứa now (tuần thứ 2 → CN)
export function weekStart(matchDay: LocalDate): Date;             // 00:00 thứ 2 của tuần đó
export function weekEnd(matchDay: LocalDate): Date;               // 00:00 thứ 2 tuần sau (mốc loại trừ)
export function matchDayStart(matchDay: LocalDate): Date;         // 00:00 thứ 7
export function checkInClosesAt(matchDay: LocalDate): Date;       // 12:00 thứ 7
export function seasonOf(matchDay: LocalDate): SeasonId;          // "YYYY-MM"
export function lastMatchDayOfSeason(season: SeasonId): LocalDate; // thứ 7 cuối của tháng
export function isPastMatchDay(matchDay: LocalDate, now: Date): boolean; // now >= weekEnd
```

- [x] **Step 1: Viết test thất bại**

Dùng instant UTC để bắt lỗi múi giờ (Review Focus 1). 2026-10-17 là thứ 7.

```ts
it("matchDayOfWeek theo giờ VN", () => {
  expect(matchDayOfWeek(new Date("2026-10-11T17:00:00Z"))).toBe("2026-10-17"); // 00:00 T2 12/10 VN
  expect(matchDayOfWeek(new Date("2026-10-11T16:59:59Z"))).toBe("2026-10-10"); // 23:59:59 CN 11/10 VN
  expect(matchDayOfWeek(new Date("2026-10-18T16:59:59Z"))).toBe("2026-10-17"); // CN cuối tuần
});
it("checkInClosesAt là 12:00 thứ 7 giờ VN", () => {
  expect(checkInClosesAt("2026-10-17").toISOString()).toBe("2026-10-17T05:00:00.000Z");
});
it("weekStart, weekEnd, matchDayStart", () => {
  expect(weekStart("2026-10-17").toISOString()).toBe("2026-10-11T17:00:00.000Z");
  expect(weekEnd("2026-10-17").toISOString()).toBe("2026-10-18T17:00:00.000Z");
  expect(matchDayStart("2026-10-17").toISOString()).toBe("2026-10-16T17:00:00.000Z");
});
it("seasonOf và lastMatchDayOfSeason", () => {
  expect(seasonOf("2026-10-31")).toBe("2026-10");
  expect(lastMatchDayOfSeason("2026-10")).toBe("2026-10-31"); // 31/10/2026 là thứ 7
  expect(lastMatchDayOfSeason("2026-11")).toBe("2026-11-28");
});
it("isPastMatchDay", () => {
  expect(isPastMatchDay("2026-10-17", new Date("2026-10-18T16:59:59Z"))).toBe(false);
  expect(isPastMatchDay("2026-10-17", new Date("2026-10-18T17:00:00Z"))).toBe(true);
});
```

- [x] **Step 2: Chạy để thấy thất bại**

Run: `pnpm test src/domain/time.test.ts` · Expected: FAIL (module chưa có).

- [x] **Step 3: Viết `time.ts`**

Dùng `TZDate` của `@date-fns/tz` với `TIME_ZONE`, và `startOfISOWeek`/`addDays` của date-fns (tuần ISO bắt đầu thứ 2). Định dạng `LocalDate` bằng `format(d, "yyyy-MM-dd")` trên `TZDate`.

- [x] **Step 4: Chạy để thấy pass** · Run: `pnpm test src/domain/time.test.ts` · Expected: PASS.

- [x] **Step 5: Commit** · `git add src/domain/time* && git commit -m "feat: add Vietnam-time week and season helpers"`

---

### Task 3: Kiểm tra tỷ số (`score.ts`)

**Files:**
- Create: `src/domain/score.ts`
- Test: `src/domain/score.test.ts`

**Interfaces:**
- Produces:

```ts
export type ScoreCheck = { ok: true; winner: Winner } | { ok: false; reason: string };
export function checkScore(scoreA: number, scoreB: number): ScoreCheck;
```

Luật (spec 4.6), gọi W là điểm cao hơn, L là điểm thấp hơn. Thông báo chính xác:

| Trường hợp | `reason` |
|---|---|
| không phải số nguyên ≥ 0 | `Tỷ số phải là số nguyên từ 0 trở lên` |
| W = L | `Không có tỷ số hòa` |
| W < 21 | `Tỷ số W–L không hợp lệ: bên thắng phải đạt ít nhất 21 điểm` |
| W = 21, L = 20 | `Tỷ số 21–20 không hợp lệ: chưa cách 2 điểm, phải đánh tiếp` |
| 22 ≤ W ≤ 29, W − L ≠ 2 | `Tỷ số W–L không hợp lệ: từ 22 điểm trở lên phải thắng cách đúng 2` |
| W = 30, L < 28 | `Tỷ số W–L không hợp lệ: 30 điểm chỉ khi thắng 30–28 hoặc 30–29` |
| W > 30 | `Tỷ số W–L không hợp lệ: tối đa 30 điểm` |

Trong `reason`, W–L luôn ghi điểm cao trước.

- [x] **Step 1: Viết test thất bại**

```ts
it.each([[21,0],[21,19],[22,20],[25,23],[29,27],[30,28],[30,29]])("hợp lệ %i–%i", (a,b) => {
  expect(checkScore(a,b)).toEqual({ ok: true, winner: "A" });
  expect(checkScore(b,a)).toEqual({ ok: true, winner: "B" });
});
it("lý do từ chối", () => {
  expect(checkScore(23,20)).toEqual({ ok:false, reason:"Tỷ số 23–20 không hợp lệ: từ 22 điểm trở lên phải thắng cách đúng 2" });
  expect(checkScore(20,21)).toEqual({ ok:false, reason:"Tỷ số 21–20 không hợp lệ: chưa cách 2 điểm, phải đánh tiếp" });
  expect(checkScore(19,15).ok).toBe(false);
  expect(checkScore(21,21)).toEqual({ ok:false, reason:"Không có tỷ số hòa" });
  expect(checkScore(30,27).ok).toBe(false);
  expect(checkScore(31,29)).toEqual({ ok:false, reason:"Tỷ số 31–29 không hợp lệ: tối đa 30 điểm" });
  expect(checkScore(22,21).ok).toBe(false);
});
it.each([[-1,21],[21.5,19],[NaN,21],[21,Infinity]])("dữ liệu bậy %s–%s", (a,b) => {
  expect(checkScore(a,b)).toEqual({ ok:false, reason:"Tỷ số phải là số nguyên từ 0 trở lên" });
});
```

- [x] **Step 2: Chạy để thấy thất bại** · `pnpm test src/domain/score.test.ts` · FAIL.
- [x] **Step 3: Viết `checkScore`** theo bảng trên, kiểm tra theo đúng thứ tự các dòng.
- [x] **Step 4: Chạy để thấy pass** · PASS.
- [x] **Step 5: Commit** · `git commit -m "feat: add badminton score validation"`

---

### Task 4: Bảng xếp hạng (`standings.ts`)

**Files:**
- Create: `src/domain/standings.ts`
- Test: `src/domain/standings.test.ts`

**Interfaces:**
- Consumes: `MemberId`, `Pair`, `LocalDate`
- Produces:

```ts
export type ResultMatch = {
  matchDay: LocalDate; number: number;
  teamA: Pair; teamB: Pair; scoreA: number; scoreB: number;   // tỷ số đã hợp lệ
};
export type Totals = { wins: number; pointsFor: number; pointsAgainst: number; played: number };
export type Ranked<K> = { key: K; rank: number; totals: Totals; diff: number };

export function memberTotals(matches: readonly ResultMatch[]): Map<MemberId, Totals>;
export function pairKey(pair: Pair): string;                  // id sắp xếp, nối bằng "|"
export function pairTotals(matches: readonly ResultMatch[]): Map<string, Totals>;
export function rankTotals<K>(rows: ReadonlyMap<K, Totals>): Ranked<K>[];
```

`rankTotals` sắp: wins giảm → diff giảm → pointsFor giảm → pointsAgainst tăng → played tăng. Bằng nhau cả 5 thì cùng hạng, hạng sau bị bỏ qua (1, 1, 3). Thứ tự hiển thị trong nhóm đồng hạng: theo `String(key)` tăng dần (ổn định).

- [x] **Step 1: Viết test thất bại**

```ts
const m = (a: Pair, b: Pair, sa: number, sb: number, n = 1): ResultMatch =>
  ({ matchDay: "2026-10-17", number: n, teamA: a, teamB: b, scoreA: sa, scoreB: sb });

it("cộng dồn cho từng mem", () => {
  const t = memberTotals([m(["a","b"],["c","d"],21,17)]);
  expect(t.get("a")).toEqual({ wins:1, pointsFor:21, pointsAgainst:17, played:1 });
  expect(t.get("d")).toEqual({ wins:0, pointsFor:17, pointsAgainst:21, played:1 });
});
it("pairKey không phụ thuộc thứ tự", () => expect(pairKey(["b","a"])).toBe(pairKey(["a","b"])));
it("thứ tự ưu tiên và ít trận xếp trên", () => {
  const rows = new Map<string, Totals>([
    ["x", { wins:2, pointsFor:42, pointsAgainst:30, played:3 }],
    ["y", { wins:2, pointsFor:42, pointsAgainst:30, played:2 }],   // ít trận hơn → trên x
    ["z", { wins:2, pointsFor:50, pointsAgainst:38, played:3 }],   // cùng hiệu số 12, cầu thắng nhiều hơn → trên cả hai
    ["w", { wins:3, pointsFor:60, pointsAgainst:70, played:4 }],   // thắng nhiều nhất
  ]);
  expect(rankTotals(rows).map(r => [r.key, r.rank])).toEqual([["w",1],["z",2],["y",3],["x",4]]);
});
it("đồng hạng kiểu 1, 1, 3", () => {
  const same = { wins:1, pointsFor:21, pointsAgainst:17, played:1 };
  const rows = new Map([["a", same], ["b", same], ["c", { wins:0, pointsFor:17, pointsAgainst:21, played:1 }]]);
  expect(rankTotals(rows).map(r => r.rank)).toEqual([1,1,3]);
});
```

- [x] **Step 2: Chạy để thấy thất bại** · FAIL.
- [x] **Step 3: Viết các hàm** theo Interfaces.
- [x] **Step 4: Chạy để thấy pass** · PASS.
- [x] **Step 5: Commit** · `git commit -m "feat: add standings with tie-aware ranking"`

---

### Task 5: Sơ đồ (`diagrams.ts`)

**Files:**
- Create: `src/domain/diagrams.ts`
- Test: `src/domain/diagrams.test.ts`

**Interfaces:**
- Produces:

```ts
export type Slot = number;
export type DiagramMatch = readonly [readonly [Slot, Slot], readonly [Slot, Slot]];
export type Diagram = { id: string; seed1: number | null; seed2: number | null; matches: readonly DiagramMatch[] };
// id: "5" cho sơ đồ 5 người (seed1 = seed2 = null); "6-2-4" = 6 người, 2 Hạt giống 1, 4 Hạt giống 2
export const DIAGRAMS: readonly Diagram[];
export function diagramSlots(d: Diagram): Slot[];   // 5 người: 1..5; khác: 1..seed1 và 5..4+seed2
export function validateDiagram(d: Diagram): string[];   // rỗng nếu hợp lệ
export function findDiagram(playerCount: number, seed1: number, seed2: number): Diagram | null;
```

- [x] **Step 1: Viết test thất bại**

```ts
it("có đúng 16 sơ đồ", () => expect(DIAGRAMS).toHaveLength(16));
it.each(DIAGRAMS.map(d => [d.id, d]))("sơ đồ %s hợp lệ", (_id, d) => expect(validateDiagram(d)).toEqual([]));
it("validateDiagram bắt lỗi", () => {
  const bad: Diagram = { id: "x", seed1: null, seed2: null, matches: [[[1,1],[2,3]]] };
  expect(validateDiagram(bad).length).toBeGreaterThan(0);
});
it("findDiagram", () => {
  expect(findDiagram(5, 3, 2)?.id).toBe("5");            // 5 người: bỏ qua hạt giống
  expect(findDiagram(7, 3, 4)?.id).toBe("7-3-4");
  expect(findDiagram(7, 0, 7)).toBeNull();
  expect(findDiagram(4, 2, 2)).toBeNull();
});
it("trận 1 của 10-4-6 là 1+3 / 2+4", () =>
  expect(findDiagram(10,4,6)?.matches[0]).toEqual([[1,3],[2,4]]));
```

- [x] **Step 2: Chạy để thấy thất bại** · FAIL.
- [x] **Step 3: Viết `diagrams.ts`**

Chép **chính xác** 16 sơ đồ từ Phụ lục A của spec, giữ đúng thứ tự trận. `validateDiagram` kiểm: số trận = số người; mỗi trận 4 vị trí khác nhau; mỗi vị trí trong `diagramSlots(d)` xuất hiện đúng 4 lần; không dùng vị trí ngoài tập đó.

- [x] **Step 4: Chạy để thấy pass** · PASS.
- [x] **Step 5: Commit** · `git commit -m "feat: add match diagrams with validation"`

---

### Task 6: Hạt giống, ngẫu nhiên và tạo lịch (`seeding.ts`, `rng.ts`, `schedule.ts`)

**Files:**
- Create: `src/domain/seeding.ts`, `src/domain/rng.ts`, `src/domain/schedule.ts`
- Test: `src/domain/seeding.test.ts`, `src/domain/schedule.test.ts`

**Interfaces:**
- Consumes: `findDiagram`, `diagramSlots`, `Diagram` (Task 5); `Rng`, `MemberId`, `Pair` (Task 1)
- Produces:

```ts
// seeding.ts
export type Seed = 1 | 2;
export type SeedCandidate = { id: MemberId; eloTenths: number; joinedAt: Date };
export function computeSeeds(activeMembers: readonly SeedCandidate[]): Map<MemberId, Seed>;
// rng.ts
export function seededRng(seed: number): Rng;          // mulberry32
export const cryptoRng: Rng;                           // dùng crypto.getRandomValues
export function shuffle<T>(items: readonly T[], rng: Rng): T[];   // Fisher–Yates, không sửa mảng gốc
// schedule.ts
export type Attendee = { id: MemberId; seed: Seed };
export type SlotAssignment = { memberId: MemberId; slot: number; seed: Seed };
export type GeneratedSchedule = { diagramId: string; assignments: SlotAssignment[];
  matches: { number: number; teamA: Pair; teamB: Pair }[] };
export type ScheduleResult =
  | { ok: true; schedule: GeneratedSchedule }
  | { ok: false; error: "NOT_ENOUGH"; count: number }
  | { ok: false; error: "NO_DIAGRAM"; seed1: number; seed2: number };
export function attendeeKey(ids: readonly MemberId[]): string;   // bỏ trùng, sắp xếp, nối bằng ","
export function generateSchedule(attendees: readonly Attendee[], rng: Rng): ScheduleResult;
export function noDiagramMessage(seed1: number, seed2: number): string;
// "Chưa có sơ đồ cho {seed1} Hạt giống 1 + {seed2} Hạt giống 2, liên hệ admin"
```

`computeSeeds`: sắp `eloTenths` giảm → `joinedAt` tăng → `id` tăng; 4 người đầu là 1, còn lại 2. `generateSchedule`: dưới 5 → `NOT_ENOUGH`; đúng 5 → sơ đồ "5", xáo cả 5 vào vị trí 1–5; còn lại đếm seed, `findDiagram`, xáo Hạt giống 1 vào 1..k và Hạt giống 2 vào 5..4+n, rồi thay vị trí bằng id mem; `number` bắt đầu từ 1.

- [x] **Step 1: Viết test thất bại**

```ts
// seeding.test.ts
const c = (id: string, elo: number, day: number): SeedCandidate =>
  ({ id, eloTenths: elo, joinedAt: new Date(Date.UTC(2026, 0, day)) });
it("top 4 là Hạt giống 1", () => {
  const s = computeSeeds([c("a",11000,1),c("b",10500,1),c("c",10400,1),c("d",10300,1),c("e",10200,1)]);
  expect([...s].filter(([,v]) => v === 1).map(([k]) => k).sort()).toEqual(["a","b","c","d"]);
  expect(s.get("e")).toBe(2);
});
it("bằng ELO ở hạng 4: người vào sớm hơn thắng, rồi tới id", () => {
  const s = computeSeeds([c("a",11000,1),c("b",11000,1),c("c",11000,1),c("e",10000,5),c("d",10000,2),c("f",10000,2)]);
  expect(s.get("d")).toBe(1); expect(s.get("e")).toBe(2); expect(s.get("f")).toBe(2);
});
// schedule.test.ts
it("attendeeKey bỏ trùng và không phụ thuộc thứ tự", () =>
  expect(attendeeKey(["c","a","b","a"])).toBe(attendeeKey(["a","b","c"])));
it("dưới 5 người", () =>
  expect(generateSchedule([{id:"a",seed:1}], seededRng(1))).toEqual({ ok:false, error:"NOT_ENOUGH", count:1 }));
it("thiếu sơ đồ", () => {
  const seven = ["a","b","c","d","e","f","g"].map(id => ({ id, seed: 2 as const }));
  expect(generateSchedule(seven, seededRng(1))).toEqual({ ok:false, error:"NO_DIAGRAM", seed1:0, seed2:7 });
  expect(noDiagramMessage(0,7)).toBe("Chưa có sơ đồ cho 0 Hạt giống 1 + 7 Hạt giống 2, liên hệ admin");
});
it("7 người 3+4: Hạt giống 1 ở vị trí 1–3, mỗi người 4 trận, lặp lại được với cùng seed", () => {
  const att = [...["a","b","c"].map(id => ({id, seed:1 as const})), ...["d","e","f","g"].map(id => ({id, seed:2 as const}))];
  const r1 = generateSchedule(att, seededRng(42)); const r2 = generateSchedule(att, seededRng(42));
  expect(r1).toEqual(r2);
  if (!r1.ok) throw new Error();
  expect(r1.schedule.diagramId).toBe("7-3-4");
  for (const a of r1.schedule.assignments) expect(a.seed === 1 ? a.slot <= 3 : a.slot >= 5 && a.slot <= 8).toBe(true);
  const counts = new Map<string, number>();
  r1.schedule.matches.forEach(mt => [...mt.teamA, ...mt.teamB].forEach(id => counts.set(id, (counts.get(id) ?? 0) + 1)));
  expect([...counts.values()]).toEqual(Array(7).fill(4));
});
it("5 người bỏ qua hạt giống", () => {
  const five = ["a","b","c","d","e"].map((id, i) => ({ id, seed: (i < 4 ? 1 : 2) as 1 | 2 }));
  const r = generateSchedule(five, seededRng(7));
  expect(r.ok && r.schedule.diagramId).toBe("5");
});
```

- [x] **Step 2: Chạy để thấy thất bại** · FAIL.
- [x] **Step 3: Viết ba file** theo Interfaces. `seededRng`: mulberry32.

```ts
export function seededRng(seed: number): Rng {
  let t = seed >>> 0;
  return () => { t = (t + 0x6d2b79f5) >>> 0; let r = Math.imul(t ^ (t >>> 15), 1 | t);
    r = (r + Math.imul(r ^ (r >>> 7), 61 | r)) ^ r; return ((r ^ (r >>> 14)) >>> 0) / 4294967296; };
}
```

- [x] **Step 4: Chạy để thấy pass** · PASS.
- [x] **Step 5: Commit** · `git commit -m "feat: add seeding and schedule generation"`

---

### Task 7: ELO một trận (`elo.ts`, phần 1)

**Files:**
- Create: `src/domain/elo.ts`
- Test: `src/domain/elo.test.ts`

**Interfaces:**
- Consumes: `Winner`
- Produces:

```ts
export type FourRatings = { a1: number; a2: number; b1: number; b2: number };  // phần mười
export function eloMatchDeltas(r: FourRatings, winner: Winner): FourRatings;     // phần mười, tổng = 0
```

Thuật toán (spec 4.9), tính bằng số thực rồi làm tròn theo phần mười:

```
E(x,y) = 1 / (1 + 10^((y − x)/400))            // x, y theo điểm ELO (chia 10 từ phần mười)
T_win, T_loss = trung bình 2 người mỗi đội
total = 2 × 32 × (1 − E(T_win, T_loss))
totalT = round(total × 10)
mỗi đội: m = min(|R1 − R2| / 2000, 1)
  mức_i = đội thắng: 1 − E(R_i, T_đối) ; đội thua: E(R_i, T_đối)
  p_i = mức_i / (mức_1 + mức_2)
  share_i = total × ((1 − m) × 0.5 + m × p_i)
  người share lớn hơn (bằng nhau thì người thứ nhất): roundedT = round(share × 10);
  người còn lại: totalT − roundedT
đội thắng nhận +, đội thua nhận −
```

- [x] **Step 1: Viết test thất bại** (bảng ví dụ kiểm chứng của spec, đơn vị phần mười)

```ts
it("hai đội ngang nhau", () =>
  expect(eloMatchDeltas({a1:10000,a2:10000,b1:10000,b2:10000}, "A")).toEqual({a1:160,a2:160,b1:-160,b2:-160}));
it("đội mạnh hơn thắng", () =>
  expect(eloMatchDeltas({a1:11000,a2:11000,b1:10000,b2:10000}, "A")).toEqual({a1:115,a2:115,b1:-115,b2:-115}));
it("đồng đội lệch trình, A+B thắng", () =>
  expect(eloMatchDeltas({a1:7500,a2:12000,b1:11000,b2:9800}, "A")).toEqual({a1:211,a2:168,b1:-191,b2:-188}));
it("đồng đội lệch trình, A+B thua", () =>
  expect(eloMatchDeltas({a1:7500,a2:12000,b1:11000,b2:9800}, "B")).toEqual({a1:-112,a2:-149,b1:129,b2:132}));
it("tổng luôn bằng 0", () => {
  const d = eloMatchDeltas({a1:9137,a2:10421,b1:11888,b2:8765}, "B");
  expect(d.a1 + d.a2 + d.b1 + d.b2).toBe(0);
});
it("chênh ≥ 2000 thì m = 1", () => {
  const d = eloMatchDeltas({a1:5000,a2:30000,b1:10000,b2:10000}, "A");
  expect(d.a1 + d.a2 + d.b1 + d.b2).toBe(0);
});
```

- [x] **Step 2: Chạy để thấy thất bại** · FAIL.
- [x] **Step 3: Viết `eloMatchDeltas`** theo thuật toán trên.
- [x] **Step 4: Chạy để thấy pass** · PASS. Nếu một ví dụ lệch 0,1, sửa code chứ không sửa số mong đợi (CLAUDE.md, mục Lưu ý).
- [x] **Step 5: Commit** · `git commit -m "feat: add doubles ELO calculation"`

---

### Task 8: Tính lại ELO (`elo.ts`, phần 2)

**Files:**
- Modify: `src/domain/elo.ts`
- Test: `src/domain/elo-replay.test.ts`

**Interfaces:**
- Consumes: `eloMatchDeltas` (Task 7), `checkInClosesAt` (Task 2), `ResultMatch` (Task 4)
- Produces:

```ts
export type EloAdjustment = { memberId: MemberId; eloTenths: number; at: Date };
export type EloInput = {
  initial: ReadonlyMap<MemberId, number>;        // ELO ban đầu, phần mười
  matches: readonly ResultMatch[];
  adjustments: readonly EloAdjustment[];
};
export type EloState = {
  current: Map<MemberId, number>;
  lastMatchDayDelta: Map<MemberId, number>;      // tổng thay đổi do trận ở buổi gần nhất người đó có trận
};
export function replayElo(input: EloInput): EloState;
```

Thứ tự sự kiện: trận đặt tại `checkInClosesAt(matchDay)`; điều chỉnh tại `at`. Sắp theo thời điểm; cùng thời điểm thì điều chỉnh trước; các trận cùng buổi theo `number`. Điều chỉnh đặt ELO = giá trị mới (không tính vào `lastMatchDayDelta`). Người thắng của trận suy ra từ `scoreA > scoreB`.

- [x] **Step 1: Viết test thất bại**

```ts
const init = new Map([["a",10000],["b",10000],["c",10000],["d",10000]]);
const mt = (day: string, n: number, sa: number, sb: number): ResultMatch =>
  ({ matchDay: day, number: n, teamA: ["a","b"], teamB: ["c","d"], scoreA: sa, scoreB: sb });

it("một trận", () => {
  const s = replayElo({ initial: init, matches: [mt("2026-10-17",1,21,15)], adjustments: [] });
  expect(s.current.get("a")).toBe(10160); expect(s.current.get("c")).toBe(9840);
  expect(s.lastMatchDayDelta.get("a")).toBe(160);
});
it("thứ tự theo ngày rồi số trận, không theo thứ tự mảng", () => {
  const ms = [mt("2026-10-17",2,15,21), mt("2026-10-10",1,21,15), mt("2026-10-17",1,21,15)];
  const shuffled = replayElo({ initial: init, matches: ms, adjustments: [] });
  const sorted = replayElo({ initial: init, matches: [ms[1], ms[2], ms[0]], adjustments: [] });
  expect(shuffled.current).toEqual(sorted.current);
});
it("điều chỉnh trước 12:00 thứ 7 áp trước trận hôm đó; sau thì áp sau", () => {
  const before = { memberId: "a", eloTenths: 12000, at: new Date("2026-10-17T04:00:00Z") };
  const after  = { memberId: "a", eloTenths: 12000, at: new Date("2026-10-17T06:00:00Z") };
  expect(replayElo({ initial: init, matches: [mt("2026-10-17",1,21,15)], adjustments: [after] }).current.get("a")).toBe(12000);
  expect(replayElo({ initial: init, matches: [mt("2026-10-17",1,21,15)], adjustments: [before] }).current.get("a")).not.toBe(12000);
});
it("điều chỉnh đúng 12:00 thứ 7 áp trước trận", () => {
  const at = { memberId: "a", eloTenths: 12000, at: new Date("2026-10-17T05:00:00Z") };
  expect(replayElo({ initial: init, matches: [mt("2026-10-17",1,21,15)], adjustments: [at] }).current.get("a")).not.toBe(12000);
});
it("mem trong trận không có ELO ban đầu thì ném lỗi", () => {
  expect(() => replayElo({ initial: new Map([["a",10000]]), matches: [mt("2026-10-17",1,21,15)], adjustments: [] }))
    .toThrow(/ELO ban đầu/);
});
```

- [x] **Step 2: Chạy để thấy thất bại** · FAIL.
- [x] **Step 3: Viết `replayElo`.** Lỗi thiếu ELO ban đầu: `throw new Error(\`Thiếu ELO ban đầu của mem ${id}\`)`.
- [x] **Step 4: Chạy để thấy pass** · PASS.
- [x] **Step 5: Commit** · `git commit -m "feat: add ELO replay with adjustments"`

---

### Task 9: Trạng thái buổi và quyền theo thời gian (`match-day.ts`)

**Files:**
- Create: `src/domain/match-day.ts`
- Test: `src/domain/match-day.test.ts`

**Interfaces:**
- Consumes: `matchDayOfWeek`, `weekStart`, `matchDayStart`, `checkInClosesAt`, `isPastMatchDay` (Task 2)
- Produces:

```ts
export type Role = "admin" | "subadmin" | "member";
export type MatchDayStatus = "open" | "locked" | "closed";
// closed: now ≥ 12:00 thứ 7. locked: trước đó và lịch chính thức có ≥ 1 kết quả. open: còn lại.
export function matchDayStatus(matchDay: LocalDate, now: Date, officialResultCount: number): MatchDayStatus;
// được đổi điểm danh: buổi của tuần hiện tại, now ≥ 00:00 thứ 2, trạng thái "open"
export function canChangeAttendance(matchDay: LocalDate, now: Date, officialResultCount: number): boolean;
// nhập/sửa/xóa kết quả: buổi tuần hiện tại và now ≥ 00:00 thứ 7 → admin, subadmin; buổi đã qua → admin; còn lại → không
export function canEditResults(matchDay: LocalDate, now: Date, role: Role): boolean;
```

- [x] **Step 1: Viết test thất bại**

```ts
const day = "2026-10-17";
const at = (iso: string) => new Date(iso);
it("matchDayStatus", () => {
  expect(matchDayStatus(day, at("2026-10-17T04:59:59Z"), 0)).toBe("open");
  expect(matchDayStatus(day, at("2026-10-17T04:59:59Z"), 1)).toBe("locked");
  expect(matchDayStatus(day, at("2026-10-17T05:00:00Z"), 0)).toBe("closed");
});
it("canChangeAttendance", () => {
  expect(canChangeAttendance(day, at("2026-10-11T17:00:00Z"), 0)).toBe(true);   // 00:00 T2
  expect(canChangeAttendance(day, at("2026-10-11T16:59:59Z"), 0)).toBe(false);  // tuần trước
  expect(canChangeAttendance(day, at("2026-10-16T10:00:00Z"), 1)).toBe(false);  // đã khóa
});
it("canEditResults", () => {
  expect(canEditResults(day, at("2026-10-16T16:59:59Z"), "admin")).toBe(false);    // trước 00:00 T7
  expect(canEditResults(day, at("2026-10-16T17:00:00Z"), "subadmin")).toBe(true);
  expect(canEditResults(day, at("2026-10-18T16:00:00Z"), "subadmin")).toBe(true);  // CN cùng tuần
  expect(canEditResults(day, at("2026-10-18T17:00:00Z"), "subadmin")).toBe(false); // buổi đã qua
  expect(canEditResults(day, at("2026-10-18T17:00:00Z"), "admin")).toBe(true);
  expect(canEditResults(day, at("2026-10-17T03:00:00Z"), "member")).toBe(false);
});
```

- [x] **Step 2: Chạy để thấy thất bại** · FAIL.
- [x] **Step 3: Viết ba hàm** theo Interfaces.
- [x] **Step 4: Chạy để thấy pass** · PASS.
- [x] **Step 5: Commit** · `git commit -m "feat: add match day status and time-based permissions"`

---

### Task 10: Kết thúc mùa và số lần hạng 1–4 (`season.ts`)

**Files:**
- Create: `src/domain/season.ts`
- Test: `src/domain/season.test.ts`

**Interfaces:**
- Consumes: `lastMatchDayOfSeason`, `checkInClosesAt` (Task 2); `Ranked` (Task 4)
- Produces:

```ts
export type LastDayResults = { officialMatchCount: number; resultEnteredAts: readonly Date[] };
export function seasonEndsAt(season: SeasonId, lastDay: LastDayResults): Date;
// = min(12:00 thứ 7 cuối tháng, thời điểm nhập muộn nhất) nếu officialMatchCount > 0 và mọi trận có kết quả;
//   ngược lại = 12:00 thứ 7 cuối tháng
export function isSeasonEnded(season: SeasonId, lastDay: LastDayResults, now: Date): boolean;
export type Podium = { first: number; second: number; third: number; fourth: number };
export function podiumCounts(endedSeasonStandings: readonly Ranked<MemberId>[][]): Map<MemberId, Podium>;
```

- [x] **Step 1: Viết test thất bại**

```ts
const noon = new Date("2026-10-31T05:00:00Z");
it("nhập đủ lúc 10:30 thì kết thúc lúc 10:30", () => {
  const t = new Date("2026-10-31T03:30:00Z");
  expect(seasonEndsAt("2026-10", { officialMatchCount: 2, resultEnteredAts: [new Date("2026-10-31T02:00:00Z"), t] })).toEqual(t);
});
it("chưa đủ kết quả hoặc không có lịch thì kết thúc lúc 12:00", () => {
  expect(seasonEndsAt("2026-10", { officialMatchCount: 2, resultEnteredAts: [new Date("2026-10-31T02:00:00Z")] })).toEqual(noon);
  expect(seasonEndsAt("2026-10", { officialMatchCount: 0, resultEnteredAts: [] })).toEqual(noon);
});
it("nhập đủ sau 12:00 thì vẫn là 12:00", () =>
  expect(seasonEndsAt("2026-10", { officialMatchCount: 1, resultEnteredAts: [new Date("2026-10-31T09:00:00Z")] })).toEqual(noon));
it("podiumCounts tính cả đồng hạng", () => {
  const r = (key: string, rank: number): Ranked<string> => ({ key, rank, diff: 0, totals: { wins:0, pointsFor:0, pointsAgainst:0, played:1 } });
  const p = podiumCounts([[r("a",1), r("b",1), r("c",3), r("d",4)], [r("a",2)]]);
  expect(p.get("a")).toEqual({ first:1, second:1, third:0, fourth:0 });
  expect(p.get("b")?.first).toBe(1); expect(p.get("c")?.third).toBe(1); expect(p.get("d")?.fourth).toBe(1);
});
```

- [x] **Step 2: Chạy để thấy thất bại** · FAIL.
- [x] **Step 3: Viết các hàm** theo Interfaces.
- [x] **Step 4: Chạy để thấy pass** · PASS.
- [x] **Step 5: Commit** · `git commit -m "feat: add season end and podium counts"`

---

### Task 11: Thống kê có bộ lọc (`stats.ts`)

**Files:**
- Create: `src/domain/stats.ts`
- Test: `src/domain/stats.test.ts`

**Interfaces:**
- Consumes: `ResultMatch`, `memberTotals`, `pairTotals`, `pairKey`, `rankTotals`, `Ranked`, `Totals` (Task 4); `seasonOf` (Task 2); `podiumCounts`, `Podium` (Task 10)
- Produces:

```ts
export type StatsFilter = { fromSeason?: SeasonId; toSeason?: SeasonId; memberId?: MemberId };
export type MemberStatRow = Ranked<MemberId> & { podium: Podium };
export function seasonStandings(matches: readonly ResultMatch[], season: SeasonId): Ranked<MemberId>[];
export function memberStats(matches: readonly ResultMatch[], endedSeasons: ReadonlySet<SeasonId>, filter: StatsFilter): MemberStatRow[];
export function pairStats(matches: readonly ResultMatch[], filter: StatsFilter): Ranked<string>[];
```

- Lọc thời gian theo `seasonOf(match.matchDay)` nằm trong `[fromSeason, toSeason]` (bỏ trống = không giới hạn; so sánh chuỗi `"YYYY-MM"`).
- `memberStats`: cột chỉ số từ các trận trong khoảng; `podium` từ `seasonStandings` của các mùa thuộc `endedSeasons` **và** nằm trong khoảng. Mem không có podium thì `{0,0,0,0}`. Lọc `memberId`: chỉ trả dòng của mem đó (giữ hạng tính trên toàn bộ).
- `pairStats`: lọc `memberId` giữ các cặp có mem đó (giữ hạng tính trên toàn bộ).

- [x] **Step 1: Viết test thất bại**

```ts
const M = (day: string, a: Pair, b: Pair, sa: number, sb: number): ResultMatch =>
  ({ matchDay: day, number: 1, teamA: a, teamB: b, scoreA: sa, scoreB: sb });
const ms = [M("2026-09-26",["a","b"],["c","d"],21,10), M("2026-10-03",["a","c"],["b","d"],21,19), M("2026-10-10",["b","c"],["a","d"],21,5)];

it("seasonStandings chỉ lấy trận trong tháng", () =>
  expect(seasonStandings(ms, "2026-09").find(r => r.key === "a")?.totals.played).toBe(1));
it("lọc khoảng thời gian", () => {
  const rows = memberStats(ms, new Set(), { fromSeason: "2026-10" });
  expect(rows.find(r => r.key === "a")?.totals).toEqual({ wins:1, pointsFor:26, pointsAgainst:40, played:2 });
});
it("podium chỉ tính mùa đã kết thúc trong khoảng", () => {
  const all = memberStats(ms, new Set(["2026-09"]), {});
  expect(all.find(r => r.key === "a")?.podium.first).toBe(1);
  const oct = memberStats(ms, new Set(["2026-09"]), { fromSeason: "2026-10" });
  expect(oct.find(r => r.key === "a")?.podium.first).toBe(0);
});
it("lọc mem", () => {
  expect(memberStats(ms, new Set(), { memberId: "d" }).map(r => r.key)).toEqual(["d"]);
  expect(pairStats(ms, { memberId: "d" }).every(r => r.key.split("|").includes("d"))).toBe(true);
});
it("pairStats gộp cặp không phân thứ tự", () => {
  const p = pairStats([M("2026-10-03",["a","b"],["c","d"],21,10), M("2026-10-10",["b","a"],["c","d"],15,21)], {});
  expect(p.find(r => r.key === pairKey(["a","b"]))?.totals.played).toBe(2);
});
```

- [x] **Step 2: Chạy để thấy thất bại** · FAIL.
- [x] **Step 3: Viết ba hàm** theo Interfaces.
- [x] **Step 4: Chạy toàn bộ test** · Run: `pnpm test && pnpm lint` · Expected: mọi test PASS, lint sạch.
- [x] **Step 5: Cập nhật `CLAUDE.md`** mục Trạng thái (Kế hoạch 1 xong) và Lệnh (`pnpm test`, `pnpm test:watch`, `pnpm lint`, `pnpm build`, `pnpm dev`). Nếu là subagent: ghi các thay đổi cần cập nhật vào báo cáo thay vì sửa file.
- [x] **Step 6: Commit** · `git commit -m "feat: add filtered member and pair statistics"`
