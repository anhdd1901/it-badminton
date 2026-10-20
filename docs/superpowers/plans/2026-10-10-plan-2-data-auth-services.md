# Kế hoạch 2/4: Database, đăng nhập và lớp nghiệp vụ

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Lưu dữ liệu ANH EM IT vào PostgreSQL và viết toàn bộ lớp nghiệp vụ (đăng nhập, quản lý mem, điểm danh, lịch nháp/chính thức, kết quả, dữ liệu cho các màn hình) dưới dạng hàm TypeScript có test tích hợp với PostgreSQL thật.

**Architecture:** `src/server/` gồm các hàm dịch vụ nhận `db`, người thực hiện (`Actor`) và `now: Date`; chúng kiểm quyền, mở giao dịch, gọi lõi quy tắc `src/domain/` và đọc/ghi qua Drizzle. Kế hoạch 3 chỉ bọc các hàm này bằng Server Action và giao diện. Mọi số liệu tổng hợp (ELO, xếp hạng, trạng thái khóa, kết thúc mùa) tính lại từ dữ liệu gốc.

**Tech Stack:** PostgreSQL 17 (Docker, cổng 5433), postgres.js, Drizzle ORM + drizzle-kit, Zod 4, `@node-rs/argon2`, `node:crypto`, Vitest (cấu hình tích hợp riêng), tsx.

**Spec:** `docs/superpowers/specs/2026-10-10-badminton-club-app-design.md` (mục 3, 4, 5, 7, 9). Đọc kèm `GLOSSARY.md`, `CLAUDE.md`, và các export của `src/domain/` (đã có từ kế hoạch 1).

**Các kế hoạch tiếp theo:** 3 Giao diện (Server Action, cookie phiên, màn hình, avatar) · 4 Vận hành (Neon, Vercel, sao lưu).

## Global Constraints

- Hàm dịch vụ nhận `now: Date`; không gọi `new Date()`/`Date.now()` trong `src/server/` (trừ script trong `scripts/`).
- Ngẫu nhiên khi tạo lịch đi qua tham số `rng?: Rng`, mặc định `cryptoRng`; test luôn truyền `seededRng(...)`.
- Không import Next.js, React hay `cookies()` trong `src/server/`.
- Lỗi nghiệp vụ là `AppError` (Task 2) với `code` và thông báo tiếng Việt cố định; không trả lỗi kiểu khác cho tình huống đã liệt kê.
- Mọi thao tác ghi đụng tới một buổi đấu chạy trong giao dịch và gọi `lockMatchDay(tx, day)` (khóa advisory theo ngày) trước khi đọc trạng thái.
- ELO lưu bằng số nguyên phần mười. Username lưu chữ thường.
- Mọi hàm đọc/ghi buổi đấu gọi `finalizeDue(db, now)` trước tiên (chốt lịch sau 12:00 thứ 7, kiểu "lười", chạy nhiều lần không sao).
- Test tích hợp nằm cạnh file (`*.int.test.ts`), chạy bằng `pnpm test:int`, tuần tự, mỗi test bắt đầu với database rỗng.
- Giờ trong test viết theo giờ Việt Nam bằng helper `vn("2026-10-14T10:00")` (Task 1). Tuần mẫu: thứ 2 12/10/2026 → thứ 7 17/10/2026.
- Commit sau mỗi task, tiền tố `feat:`, `test:`, `chore:` hoặc `fix:`. Xác minh: `pnpm test && pnpm test:int && pnpm lint && pnpm typecheck`.

## Review Focus

1. **Hai người điểm danh cùng lúc** đúng lúc đủ 5 người: chỉ được có một lịch nháp cho mỗi danh sách → test ở Task 5.
2. **Hai admin nhập cùng một trận**: người lưu sau phải nhận lỗi xung đột kèm tỷ số đã có, không ghi đè → test ở Task 6.
3. **Mem bị ngưng vẫn giữ cookie**: phiên phải bị vô hiệu ngay, kể cả phiên đang dùng → test ở Task 2 và Task 7.
4. **Sau 12:00 thứ 7 không ai mở app** rồi chủ nhật mới có người vào: lịch vẫn phải được chốt đúng theo danh sách lúc 12:00 → test ở Task 6.
5. **Username nhập hoa/thường hoặc có khoảng trắng** (`" Minh.NT "`): phải chuẩn hóa và bắt trùng → test ở Task 3.

---

## Cấu trúc file

```
docker-compose.yml                 PostgreSQL 17, cổng 5433, tạo 2 database dev/test
.env.example                       DATABASE_URL, DATABASE_URL_TEST
drizzle.config.ts                  cấu hình drizzle-kit
drizzle/                           migration sinh ra
vitest.integration.mts             cấu hình test tích hợp
scripts/admin-create.ts            tạo admin đầu tiên
scripts/admin-reset-password.ts    đặt lại mật khẩu
src/server/
  db/schema.ts                     bảng Drizzle
  db/client.ts                     createDb(url)
  db/lock.ts                       lockMatchDay
  errors.ts                        AppError, thông báo dùng chung
  actor.ts                         Actor, requireRole
  validation.ts                    Zod: username, tên, mật khẩu, ELO, LocalDate, SeasonId
  auth/password.ts                 hashPassword, verifyPassword
  auth/sessions.ts                 createSession, resolveSession, revokeSessions, logout
  auth/login.ts                    login có khóa tạm
  members/profile.ts               createMember, updateDisplayName, changeUsername, resetPassword, changeOwnPassword
  members/admin.ts                 setActive, setSubadmin, transferAdmin, adjustElo
  members/bootstrap.ts             createFirstAdmin, resetPasswordByUsername
  data/loaders.ts                  đọc dữ liệu cho lõi quy tắc (ELO, trận có kết quả)
  match-days/schedule.ts           getOrCreateMatchDay, refreshDraft, promoteDraft, finalizeDue
  match-days/attendance.ts         setAttendance
  match-days/results.ts            enterResult, updateResult, deleteResult, deleteAllResults
  views/week.ts                    getWeekView
  views/rankings.ts                getSeasonView, getEloView, getStatsView
  views/history.ts                 getHistory, getMatchDayDetail
  test/db.ts                       useTestDb, truncate, factory, vn()
  test/global-setup.ts             migrate database test
```

---

### Task 1: PostgreSQL, schema và bộ test tích hợp

**Files:**
- Create: `docker-compose.yml`, `docker/init.sql`, `.env.example`, `drizzle.config.ts`, `src/server/db/schema.ts`, `src/server/db/client.ts`, `src/server/db/lock.ts`, `vitest.integration.mts`, `src/server/test/global-setup.ts`, `src/server/test/db.ts`, `src/server/db/schema.int.test.ts`, `drizzle/*` (sinh ra)
- Modify: `package.json` (thư viện, script), `vitest.config.mts` (loại `*.int.test.ts`)

**Interfaces:**
- Produces:

```ts
// db/client.ts
export type Db = PostgresJsDatabase<typeof schema>;
export type Tx = Parameters<Parameters<Db["transaction"]>[0]>[0];
export function createDb(url: string): { db: Db; close: () => Promise<void> };
// db/lock.ts
export async function lockMatchDay(tx: Tx, day: LocalDate): Promise<void>; // SELECT pg_advisory_xact_lock(hashtext('match_day:' || day))
// test/db.ts
export function useTestDb(): { get db(): Db };     // beforeEach TRUNCATE mọi bảng; afterAll đóng kết nối
export function vn(local: string): Date;           // "2026-10-14T10:00" → new Date("2026-10-14T10:00:00+07:00")
export const TEST_PASSWORD = "matkhau123";
export async function makeMember(db: Db, o?: Partial<{ username: string; displayName: string; role: Role;
  active: boolean; initialEloTenths: number; createdAt: Date }>): Promise<{ id: string; username: string; role: Role }>;
// mặc định: username "mem1", "mem2"… tăng dần; displayName = username; role "member"; active true; ELO 10000;
// createdAt tăng 1 phút mỗi lần gọi từ vn("2026-01-01T00:00"); passwordHash là băm của TEST_PASSWORD, tính một lần rồi dùng lại
```

Bảng (`schema.ts`, tên cột snake_case trong DB, camelCase trong TS; id là `uuid` mặc định `gen_random_uuid()`):

| Bảng | Cột | Ràng buộc |
|---|---|---|
| `members` | id, username text, display_name text, password_hash text, role enum `member_role`(admin, subadmin, member), active bool mặc định true, initial_elo_tenths int, avatar_url text null, created_at timestamptz | username unique; **chỉ một admin**: unique index một phần trên `role` where `role = 'admin'` |
| `auth_sessions` | id, member_id → members (cascade), token_hash text, created_at, last_used_at | token_hash unique |
| `login_attempts` | username text (khóa chính), failed_count int mặc định 0, locked_until timestamptz null | |
| `match_days` | id, day date, finalized_at timestamptz null | day unique |
| `attendances` | match_day_id → match_days (cascade), member_id → members, recorded_by → members, recorded_at | khóa chính (match_day_id, member_id) |
| `draft_schedules` | id, match_day_id (cascade), attendee_key text, diagram_id text, assignments jsonb `SlotAssignment[]`, matches jsonb `{number, teamA, teamB}[]`, created_at | unique (match_day_id, attendee_key) |
| `official_schedules` | id, match_day_id (cascade), attendee_key text, diagram_id text, assignments jsonb, created_at | match_day_id unique |
| `scheduled_matches` | id, official_schedule_id (cascade), number int, a1, a2, b1, b2 → members | unique (official_schedule_id, number) |
| `match_results` | scheduled_match_id (khóa chính, cascade), score_a int, score_b int, entered_by → members, entered_at timestamptz, version int mặc định 1 | |
| `elo_adjustments` | id, member_id → members, elo_tenths int, adjusted_by → members, at timestamptz | |

- [x] **Step 1: Hạ tầng**

`pnpm add drizzle-orm postgres zod @node-rs/argon2` và `pnpm add -D drizzle-kit tsx`. `docker-compose.yml`: service `db`, image `postgres:17`, cổng `5433:5432`, `POSTGRES_PASSWORD=postgres`, mount `docker/init.sql` vào `/docker-entrypoint-initdb.d/` để tạo hai database `anh_em_it_dev` và `anh_em_it_test`, volume có tên. `.env.example`:

```
DATABASE_URL=postgres://postgres:postgres@localhost:5433/anh_em_it_dev
DATABASE_URL_TEST=postgres://postgres:postgres@localhost:5433/anh_em_it_test
```

Script `package.json`: `db:up` (`docker compose up -d db`), `db:generate` (`drizzle-kit generate`), `db:migrate` (`drizzle-kit migrate`), `test:int` (`vitest run --config vitest.integration.mts`). Script và config đọc `.env` bằng `process.loadEnvFile(".env")` khi file tồn tại. Chép `.env.example` thành `.env` ở máy (đã bị `.gitignore`).

- [x] **Step 2: Viết test thất bại** (`schema.int.test.ts`)

```ts
const t = useTestDb();
it("tạo được mem", async () => {
  const m = await makeMember(t.db, { username: "minh.nt" });
  const rows = await t.db.select().from(members).where(eq(members.id, m.id));
  expect(rows[0]).toMatchObject({ username: "minh.nt", role: "member", active: true, initialEloTenths: 10000 });
});
it("chỉ có một admin", async () => {
  await makeMember(t.db, { role: "admin" });
  await expect(makeMember(t.db, { role: "admin" })).rejects.toThrow();
});
it("username không trùng", async () => {
  await makeMember(t.db, { username: "a.b" });
  await expect(makeMember(t.db, { username: "a.b" })).rejects.toThrow();
});
it("vn() hiểu là giờ Việt Nam", () => expect(vn("2026-10-17T12:00").toISOString()).toBe("2026-10-17T05:00:00.000Z"));
```

- [x] **Step 3: Chạy để thấy thất bại** · `pnpm db:up && pnpm test:int` · FAIL (module chưa có).
- [x] **Step 4: Viết schema, client, lock, harness.** `vitest.integration.mts`: `include: ["src/server/**/*.int.test.ts"]`, `fileParallelism: false`, `globalSetup: "src/server/test/global-setup.ts"` (chạy migration của `drizzle/` lên `DATABASE_URL_TEST` bằng `drizzle-orm/postgres-js/migrator`), cùng alias `@` và `TZ` như `vitest.config.mts`. `vitest.config.mts` thêm `exclude: ["src/server/**/*.int.test.ts"]` (test unit trong `src/server/` vẫn chạy bằng `pnpm test`). Sinh migration: `pnpm db:generate`.
- [x] **Step 5: Chạy để thấy pass** · `pnpm test:int` PASS; `pnpm db:migrate` chạy được trên database dev.
- [x] **Step 6: Commit** · `git commit -m "feat: add database schema and integration test harness"`

---

### Task 2: Lỗi, mật khẩu, phiên đăng nhập và đăng nhập

**Files:**
- Create: `src/server/errors.ts`, `src/server/actor.ts`, `src/server/auth/password.ts`, `src/server/auth/sessions.ts`, `src/server/auth/login.ts`
- Test: `src/server/auth/auth.int.test.ts`

**Interfaces:**
- Consumes: `Db`, `useTestDb`, `makeMember`, `TEST_PASSWORD`, `vn` (Task 1); `Role` (`@/domain/types`)
- Produces:

```ts
// errors.ts
export type ErrorCode = "UNAUTHENTICATED" | "FORBIDDEN" | "VALIDATION" | "CONFLICT" | "LOCKED" | "NOT_FOUND";
export class AppError extends Error { constructor(readonly code: ErrorCode, message: string) }
export const HTTP_STATUS: Record<ErrorCode, number>; // 401, 403, 400, 409, 423, 404
export const MESSAGES = {
  forbidden: "Bạn không có quyền làm việc này",
  badLogin: "Sai tên đăng nhập hoặc mật khẩu",
  loginLocked: "Đăng nhập tạm khóa 15 phút do nhập sai quá nhiều lần",
  matchDayLocked: "Buổi đấu đã khóa, không thể thay đổi điểm danh",
  inactiveMember: "Mem đã ngưng hoạt động",
  noSchedule: "Buổi đấu chưa có lịch thi đấu",
  matchNotFound: "Không tìm thấy trận đấu",
  memberNotFound: "Không tìm thấy mem",
  usernameTaken: "Tên đăng nhập đã có người dùng",
  wrongPassword: "Mật khẩu không đúng",
} as const;
export function resultConflict(scoreA: number, scoreB: number): string; // "Trận này vừa được nhập 21–17, hãy tải lại" (điểm cặp A trước)
// actor.ts
export type Actor = { memberId: string; role: Role; sessionId: string };
export function requireRole(actor: Actor, ...roles: Role[]): void;   // ném AppError("FORBIDDEN", MESSAGES.forbidden)
// auth/password.ts
export function hashPassword(plain: string): Promise<string>;        // argon2id
export function verifyPassword(hash: string, plain: string): Promise<boolean>;
// auth/sessions.ts
export function createSession(db: Db, memberId: string, now: Date): Promise<{ token: string; sessionId: string }>;
// token: 32 byte ngẫu nhiên, base64url; lưu SHA-256 hex của token
export function resolveSession(db: Db, token: string, now: Date): Promise<Actor | null>; // null nếu không có hoặc mem ngưng; cập nhật last_used_at
export function revokeSessions(db: Db | Tx, memberId: string, exceptSessionId?: string): Promise<void>;
export function logout(db: Db, token: string): Promise<void>;
// auth/login.ts
export type LoginResult = { ok: true; token: string; actor: Actor } | { ok: false; message: string };
export function login(db: Db, input: { username: string; password: string }, now: Date): Promise<LoginResult>;
```

Luật `login` (spec 5.2): chuẩn hóa username (trim, chữ thường). Nếu `locked_until > now` → `MESSAGES.loginLocked`. Đúng mật khẩu và mem đang hoạt động → xóa dòng `login_attempts`, tạo phiên. Sai (kể cả username không tồn tại hoặc mem đã ngưng) → tăng `failed_count`; đạt 5 thì đặt `locked_until = now + 15 phút`, `failed_count = 0` và trả `MESSAGES.loginLocked`; chưa đạt thì `MESSAGES.badLogin`.

- [x] **Step 1: Viết test thất bại**

```ts
const t = useTestDb();
it("đăng nhập đúng tạo phiên dùng được", async () => {
  await makeMember(t.db, { username: "minh.nt" });
  const r = await login(t.db, { username: " Minh.NT ", password: TEST_PASSWORD }, vn("2026-10-14T10:00"));
  if (!r.ok) throw new Error(r.message);
  expect((await resolveSession(t.db, r.token, vn("2026-10-14T10:01")))?.memberId).toBe(r.actor.memberId);
});
it("sai mật khẩu và khóa sau 5 lần", async () => {
  await makeMember(t.db, { username: "minh.nt" });
  const bad = { username: "minh.nt", password: "sai-mat-khau" };
  for (let i = 0; i < 4; i++) expect(await login(t.db, bad, vn("2026-10-14T10:00"))).toEqual({ ok: false, message: MESSAGES.badLogin });
  expect(await login(t.db, bad, vn("2026-10-14T10:00"))).toEqual({ ok: false, message: MESSAGES.loginLocked });
  expect(await login(t.db, { username: "minh.nt", password: TEST_PASSWORD }, vn("2026-10-14T10:14"))).toEqual({ ok: false, message: MESSAGES.loginLocked });
  expect((await login(t.db, { username: "minh.nt", password: TEST_PASSWORD }, vn("2026-10-14T10:15"))).ok).toBe(true);
});
it("mem đã ngưng không đăng nhập được và phiên cũ vô hiệu", async () => {
  const m = await makeMember(t.db, { username: "a.b" });
  const r = await login(t.db, { username: "a.b", password: TEST_PASSWORD }, vn("2026-10-14T10:00"));
  await t.db.update(members).set({ active: false }).where(eq(members.id, m.id));
  if (!r.ok) throw new Error();
  expect(await resolveSession(t.db, r.token, vn("2026-10-14T10:01"))).toBeNull();
  expect(await login(t.db, { username: "a.b", password: TEST_PASSWORD }, vn("2026-10-14T10:02"))).toEqual({ ok: false, message: MESSAGES.badLogin });
});
it("revokeSessions giữ phiên được trừ ra", async () => {
  const m = await makeMember(t.db);
  const s1 = await createSession(t.db, m.id, vn("2026-10-14T10:00"));
  const s2 = await createSession(t.db, m.id, vn("2026-10-14T10:00"));
  await revokeSessions(t.db, m.id, s1.sessionId);
  expect(await resolveSession(t.db, s1.token, vn("2026-10-14T10:01"))).not.toBeNull();
  expect(await resolveSession(t.db, s2.token, vn("2026-10-14T10:01"))).toBeNull();
});
it("token không lưu dạng rõ", async () => {
  const m = await makeMember(t.db);
  const s = await createSession(t.db, m.id, vn("2026-10-14T10:00"));
  const rows = await t.db.select().from(authSessions);
  expect(rows[0].tokenHash).not.toBe(s.token);
  expect(rows[0].tokenHash).toMatch(/^[0-9a-f]{64}$/);
});
it("resultConflict", () => expect(resultConflict(21, 17)).toBe("Trận này vừa được nhập 21–17, hãy tải lại"));
```

- [x] **Step 2: Chạy để thấy thất bại** · `pnpm test:int src/server/auth` · FAIL.
- [x] **Step 3: Viết các file** theo Interfaces.
- [x] **Step 4: Chạy để thấy pass** · PASS.
- [x] **Step 5: Commit** · `git commit -m "feat: add password hashing, sessions and login lockout"`

---

### Task 3: Kiểm tra dữ liệu vào và hồ sơ mem

**Files:**
- Create: `src/server/validation.ts`, `src/server/members/profile.ts`
- Test: `src/server/validation.test.ts` (unit, chạy bằng `pnpm test`), `src/server/members/profile.int.test.ts`

**Interfaces:**
- Consumes: Task 1, Task 2 (`AppError`, `MESSAGES`, `Actor`, `requireRole`, `hashPassword`, `verifyPassword`, `revokeSessions`)
- Produces:

```ts
// validation.ts — mỗi hàm trả giá trị đã chuẩn hóa hoặc ném AppError("VALIDATION", <thông báo>)
export function parseUsername(raw: string): string;    // trim + chữ thường; /^[a-z0-9._]{3,30}$/
  // "Tên đăng nhập gồm 3–30 ký tự: chữ thường không dấu, số, dấu chấm hoặc gạch dưới"
export function parseDisplayName(raw: string): string; // trim; 1–50 ký tự — "Tên hiển thị dài 1–50 ký tự"
export function parsePassword(raw: string): string;    // ≥ 8 ký tự — "Mật khẩu tối thiểu 8 ký tự"
export function parseEloInput(raw: string | number): number; // "1012,5" hoặc "1012.5" hoặc số → phần mười (10125);
  // 0 < x ≤ 5000, tối đa 1 chữ số thập phân — "ELO phải là số lớn hơn 0 và không quá 5000, tối đa 1 chữ số thập phân"
export function parseLocalDate(raw: string): LocalDate; // YYYY-MM-DD, ngày có thật, là thứ 7 — "Ngày thi đấu không hợp lệ"
export function parseSeasonId(raw: string): SeasonId;   // YYYY-MM, tháng 01–12 — "Tháng không hợp lệ"
// members/profile.ts
export type NewMember = { username: string; displayName: string; password: string; initialElo: string | number };
export function createMember(db: Db, actor: Actor, input: NewMember, now: Date): Promise<{ id: string }>; // chỉ admin
export function updateDisplayName(db: Db, actor: Actor, memberId: string, displayName: string): Promise<void>; // admin hoặc chính mem
export function changeUsername(db: Db, actor: Actor, memberId: string, username: string): Promise<void>; // chỉ admin
export function resetPassword(db: Db, actor: Actor, memberId: string, newPassword: string): Promise<void>; // chỉ admin; thu hồi mọi phiên của mem
export function changeOwnPassword(db: Db, actor: Actor, current: string, next: string): Promise<void>;
  // sai mật khẩu hiện tại → VALIDATION MESSAGES.wrongPassword; thu hồi mọi phiên khác actor.sessionId
```

Username trùng (kể cả khác hoa thường) → `AppError("CONFLICT", MESSAGES.usernameTaken)`. Mem không tồn tại → `NOT_FOUND MESSAGES.memberNotFound`.

- [x] **Step 1: Viết test thất bại**

```ts
// validation.test.ts
it("username chuẩn hóa", () => expect(parseUsername(" Minh.NT ")).toBe("minh.nt"));
it.each(["ab", "minh nt", "đức", "a".repeat(31)])("username sai %s", s => expect(() => parseUsername(s)).toThrow(/3–30 ký tự/));
it("ELO", () => {
  expect(parseEloInput("1012,5")).toBe(10125); expect(parseEloInput(1000)).toBe(10000);
  for (const bad of ["0", "5000,1", "1012,55", "abc", -5]) expect(() => parseEloInput(bad)).toThrow(/ELO phải là số/);
});
it("ngày thi đấu phải là thứ 7 có thật", () => {
  expect(parseLocalDate("2026-10-17")).toBe("2026-10-17");
  for (const bad of ["2026-10-16", "2026-02-30", "17/10/2026"]) expect(() => parseLocalDate(bad)).toThrow("Ngày thi đấu không hợp lệ");
});
it("tháng", () => { expect(parseSeasonId("2026-10")).toBe("2026-10"); expect(() => parseSeasonId("2026-13")).toThrow("Tháng không hợp lệ"); });
it("tên hiển thị và mật khẩu", () => {
  expect(parseDisplayName("  Đức  ")).toBe("Đức");
  expect(() => parseDisplayName("   ")).toThrow("Tên hiển thị dài 1–50 ký tự");
  expect(() => parsePassword("1234567")).toThrow("Mật khẩu tối thiểu 8 ký tự");
});

// profile.int.test.ts
const t = useTestDb();
const actorOf = (m: { id: string; role: Role }): Actor => ({ memberId: m.id, role: m.role, sessionId: "s" });
it("admin tạo mem; username trùng bị chặn không phân biệt hoa thường", async () => {
  const admin = actorOf(await makeMember(t.db, { role: "admin" }));
  await createMember(t.db, admin, { username: "Minh.NT", displayName: "Minh", password: "matkhau123", initialElo: "1012,5" }, vn("2026-10-14T10:00"));
  const row = (await t.db.select().from(members).where(eq(members.username, "minh.nt")))[0];
  expect(row).toMatchObject({ displayName: "Minh", initialEloTenths: 10125, role: "member" });
  await expect(createMember(t.db, admin, { username: " MINH.nt", displayName: "X", password: "matkhau123", initialElo: 1000 }, vn("2026-10-14T10:00")))
    .rejects.toMatchObject({ code: "CONFLICT", message: MESSAGES.usernameTaken });
});
it("subadmin và mem không tạo được mem", async () => {
  const sub = actorOf(await makeMember(t.db, { role: "subadmin" }));
  await expect(createMember(t.db, sub, { username: "x.y", displayName: "X", password: "matkhau123", initialElo: 1000 }, vn("2026-10-14T10:00")))
    .rejects.toMatchObject({ code: "FORBIDDEN" });
});
it("mem tự đổi tên hiển thị, không đổi được của người khác; chỉ admin đổi username", async () => {
  const a = await makeMember(t.db); const b = await makeMember(t.db);
  await updateDisplayName(t.db, actorOf(a), a.id, "Tuấn");
  await expect(updateDisplayName(t.db, actorOf(a), b.id, "X")).rejects.toMatchObject({ code: "FORBIDDEN" });
  await expect(changeUsername(t.db, actorOf(a), a.id, "moi.ten")).rejects.toMatchObject({ code: "FORBIDDEN" });
});
it("đổi mật khẩu của mình thu hồi phiên khác; admin đặt lại thu hồi mọi phiên", async () => {
  const m = await makeMember(t.db); const admin = actorOf(await makeMember(t.db, { role: "admin" }));
  const s1 = await createSession(t.db, m.id, vn("2026-10-14T10:00")); const s2 = await createSession(t.db, m.id, vn("2026-10-14T10:00"));
  await expect(changeOwnPassword(t.db, { memberId: m.id, role: "member", sessionId: s1.sessionId }, "sai", "matkhaumoi1"))
    .rejects.toMatchObject({ code: "VALIDATION", message: MESSAGES.wrongPassword });
  await changeOwnPassword(t.db, { memberId: m.id, role: "member", sessionId: s1.sessionId }, TEST_PASSWORD, "matkhaumoi1");
  expect(await resolveSession(t.db, s1.token, vn("2026-10-14T10:01"))).not.toBeNull();
  expect(await resolveSession(t.db, s2.token, vn("2026-10-14T10:01"))).toBeNull();
  await resetPassword(t.db, admin, m.id, "matkhaumoi2");
  expect(await resolveSession(t.db, s1.token, vn("2026-10-14T10:02"))).toBeNull();
});
```

- [x] **Step 2: Chạy để thấy thất bại** · FAIL.
- [x] **Step 3: Viết hai file** theo Interfaces (Zod cho phần kiểm tra định dạng; thông báo đúng như trên).
- [x] **Step 4: Chạy để thấy pass** · `pnpm test && pnpm test:int` PASS.
- [x] **Step 5: Commit** · `git commit -m "feat: add input validation and member profile services"`

---

### Task 4: Đọc dữ liệu cho lõi quy tắc

**Files:**
- Create: `src/server/data/loaders.ts`
- Test: `src/server/data/loaders.int.test.ts`

**Interfaces:**
- Consumes: Task 1 schema; `ResultMatch` (`@/domain/standings`), `EloInput`, `EloState`, `replayElo` (`@/domain/elo`), `computeSeeds`, `Seed` (`@/domain/seeding`)
- Produces:

```ts
export function loadResultMatches(db: Db | Tx): Promise<ResultMatch[]>;   // trận của lịch chính thức có kết quả, mọi buổi
export function loadEloInput(db: Db | Tx): Promise<EloInput>;            // initial: mọi mem (kể cả đã ngưng); adjustments: mọi mốc
export function loadEloState(db: Db | Tx): Promise<EloState>;            // replayElo(loadEloInput)
export function loadCurrentSeeds(db: Db | Tx): Promise<Map<string, Seed>>; // computeSeeds trên mem đang hoạt động, joinedAt = created_at
```

`ResultMatch.teamA = [a1, a2]`, `teamB = [b1, b2]`, `matchDay` = `match_days.day` dạng `"YYYY-MM-DD"` (đọc cột `date` dạng chuỗi, không qua `Date`).

- [x] **Step 1: Viết test thất bại**

Test chèn trực tiếp qua Drizzle một buổi `2026-10-10` với lịch chính thức 2 trận (một có kết quả 21–15, một chưa) và một mốc điều chỉnh, rồi kiểm:

```ts
it("chỉ lấy trận có kết quả, đúng định dạng", async () => {
  const ms = await loadResultMatches(t.db);
  expect(ms).toEqual([{ matchDay: "2026-10-10", number: 1, teamA: [a.id, b.id], teamB: [c.id, d.id], scoreA: 21, scoreB: 15 }]);
});
it("ELO hiện tại gồm trận và mốc điều chỉnh; mem đã ngưng vẫn có ELO", async () => {
  const s = await loadEloState(t.db);
  expect(s.current.get(a.id)).toBe(10160);
  expect(s.current.get(e.id)).toBe(12000); // e có mốc điều chỉnh 12000 lúc vn("2026-10-12T09:00")
});
it("hạt giống chỉ xét mem đang hoạt động", async () => {
  const seeds = await loadCurrentSeeds(t.db);
  expect(seeds.has(inactive.id)).toBe(false);
});
```

(`a,b,c,d,e` tạo bằng `makeMember`; `inactive` tạo với `active: false`.)

- [x] **Step 2–4:** chạy thấy FAIL → viết `loaders.ts` → chạy thấy PASS.
- [x] **Step 5: Commit** · `git commit -m "feat: add loaders feeding domain rules"`

---

### Task 5: Điểm danh và lịch nháp

**Files:**
- Create: `src/server/match-days/schedule.ts`, `src/server/match-days/attendance.ts`
- Test: `src/server/match-days/attendance.int.test.ts`

**Interfaces:**
- Consumes: Task 1 (`lockMatchDay`), Task 2 (`AppError`, `MESSAGES`, `Actor`), Task 4 (`loadCurrentSeeds`); `matchDayOfWeek`, `checkInClosesAt` (`@/domain/time`); `canChangeAttendance` (`@/domain/match-day`); `attendeeKey`, `generateSchedule` (`@/domain/schedule`); `cryptoRng` (`@/domain/rng`)
- Produces:

```ts
// schedule.ts
export function getOrCreateMatchDay(tx: Tx, day: LocalDate): Promise<{ id: string; finalizedAt: Date | null }>;
export function currentAttendeeIds(tx: Db | Tx, matchDayId: string): Promise<string[]>;
export function officialResultCount(tx: Db | Tx, matchDayId: string): Promise<number>;
export function refreshDraft(tx: Tx, matchDayId: string, rng: Rng): Promise<void>;
  // ≥ 5 người và chưa có nháp cùng khóa: tính hạt giống, generateSchedule; ok → INSERT … ON CONFLICT DO NOTHING; NO_DIAGRAM → không lưu
export function findDraft(tx: Db | Tx, matchDayId: string, key: string): Promise<DraftRow | null>;
// attendance.ts
export function setAttendance(db: Db, actor: Actor, input: { memberId: string; attending: boolean }, now: Date,
  opts?: { rng?: Rng }): Promise<void>;
```

Luật `setAttendance` (spec 4.1, 4.4): gọi `finalizeDue(db, now)` (Task 6 — trong task này gọi qua import, Task 6 thêm thân hàm; tạm để `finalizeDue` là hàm rỗng export từ `schedule.ts`); actor là chính mem đó, hoặc admin/subadmin, ngược lại FORBIDDEN; mem đích phải đang hoạt động, ngược lại `VALIDATION MESSAGES.inactiveMember`; ngày = `matchDayOfWeek(now)`; trong giao dịch: `lockMatchDay`, `getOrCreateMatchDay`, nếu `!canChangeAttendance(day, now, officialResultCount)` → `LOCKED MESSAGES.matchDayLocked`; thêm (ghi `recorded_by = actor.memberId`, `recorded_at = now`) hoặc xóa dòng điểm danh (thêm khi đã có, xóa khi không có: không lỗi); rồi `refreshDraft`.

- [x] **Step 1: Viết test thất bại**

```ts
const t = useTestDb();
const MON = vn("2026-10-12T08:00");
async function club(n: number) { return Promise.all(Array.from({ length: n }, () => makeMember(t.db))); }
const self = (m: { id: string; role: Role }): Actor => ({ memberId: m.id, role: m.role, sessionId: "s" });

it("dưới 5 người chưa có lịch; đủ 5 thì có lịch nháp", async () => {
  const ms = await club(6);
  for (const m of ms.slice(0, 4)) await setAttendance(t.db, self(m), { memberId: m.id, attending: true }, MON, { rng: seededRng(1) });
  expect(await t.db.select().from(draftSchedules)).toHaveLength(0);
  await setAttendance(t.db, self(ms[4]), { memberId: ms[4].id, attending: true }, MON, { rng: seededRng(1) });
  const drafts = await t.db.select().from(draftSchedules);
  expect(drafts).toHaveLength(1); expect(drafts[0].diagramId).toBe("5");
});
it("điểm danh lại về danh sách cũ thì dùng lại lịch cũ", async () => {
  const ms = await club(6);
  for (const m of ms) await setAttendance(t.db, self(m), { memberId: m.id, attending: true }, MON, { rng: seededRng(1) });
  const first = (await t.db.select().from(draftSchedules)).find(d => d.attendeeKey === attendeeKey(ms.map(m => m.id)))!;
  await setAttendance(t.db, self(ms[5]), { memberId: ms[5].id, attending: false }, MON, { rng: seededRng(2) });
  await setAttendance(t.db, self(ms[5]), { memberId: ms[5].id, attending: true }, MON, { rng: seededRng(3) });
  const again = (await t.db.select().from(draftSchedules)).filter(d => d.attendeeKey === first.attendeeKey);
  expect(again).toHaveLength(1); expect(again[0].id).toBe(first.id);
});
it("mem không điểm danh hộ được; subadmin thì được", async () => {
  const [a, b] = await club(2); const sub = await makeMember(t.db, { role: "subadmin" });
  await expect(setAttendance(t.db, self(a), { memberId: b.id, attending: true }, MON)).rejects.toMatchObject({ code: "FORBIDDEN" });
  await setAttendance(t.db, self(sub), { memberId: b.id, attending: true }, MON);
  const rows = await t.db.select().from(attendances);
  expect(rows[0]).toMatchObject({ memberId: b.id, recordedBy: sub.id });
});
it("sau 12:00 thứ 7 bị khóa", async () => {
  const [a] = await club(1);
  await expect(setAttendance(t.db, self(a), { memberId: a.id, attending: true }, vn("2026-10-17T12:00")))
    .rejects.toMatchObject({ code: "LOCKED", message: MESSAGES.matchDayLocked });
});
it("mem đã ngưng không điểm danh được", async () => {
  const x = await makeMember(t.db, { active: false }); const admin = await makeMember(t.db, { role: "admin" });
  await expect(setAttendance(t.db, self(admin), { memberId: x.id, attending: true }, MON)).rejects.toMatchObject({ code: "VALIDATION" });
});
it("hai người điểm danh cùng lúc lúc đủ 5 chỉ tạo một lịch nháp", async () => {
  const ms = await club(6);
  for (const m of ms.slice(0, 4)) await setAttendance(t.db, self(m), { memberId: m.id, attending: true }, MON, { rng: seededRng(1) });
  await Promise.all([ms[4], ms[5]].map(m => setAttendance(t.db, self(m), { memberId: m.id, attending: true }, MON, { rng: seededRng(9) })));
  const drafts = await t.db.select().from(draftSchedules);
  expect(new Set(drafts.map(d => d.attendeeKey)).size).toBe(drafts.length);
  expect(drafts.some(d => d.attendeeKey === attendeeKey(ms.map(m => m.id)))).toBe(true);
});
```

- [x] **Step 2–4:** FAIL → viết hai file → PASS.
- [x] **Step 5: Commit** · `git commit -m "feat: add attendance with draft schedules"`

---

### Task 6: Chốt lịch và kết quả trận

**Files:**
- Modify: `src/server/match-days/schedule.ts` (thêm `promoteDraft`, thân `finalizeDue`)
- Create: `src/server/match-days/results.ts`
- Test: `src/server/match-days/results.int.test.ts`

**Interfaces:**
- Consumes: Task 5; `checkScore` (`@/domain/score`); `canEditResults`, `matchDayStatus` (`@/domain/match-day`); `checkInClosesAt` (`@/domain/time`); `parseLocalDate` (Task 3)
- Produces:

```ts
// schedule.ts
export function promoteDraft(tx: Tx, matchDayId: string, draft: DraftRow, now: Date): Promise<string>; // id lịch chính thức
export function finalizeDue(db: Db, now: Date): Promise<void>;
  // mọi match_days có finalized_at null và checkInClosesAt(day) ≤ now: khóa ngày; nếu chưa có lịch chính thức và có nháp
  // khớp danh sách điểm danh hiện tại → promoteDraft; xóa mọi nháp của buổi; finalized_at = checkInClosesAt(day)
// results.ts
export type ResultInput = { day: string; matchNumber: number; scoreA: number; scoreB: number };
export function enterResult(db: Db, actor: Actor, input: ResultInput, now: Date): Promise<void>;
export function updateResult(db: Db, actor: Actor, input: ResultInput & { expectedVersion: number }, now: Date): Promise<void>;
export function deleteResult(db: Db, actor: Actor, input: { day: string; matchNumber: number }, now: Date): Promise<void>;
export function deleteAllResults(db: Db, actor: Actor, input: { day: string }, now: Date): Promise<void>;
```

Luật (spec 4.5, 4.6): mọi hàm gọi `finalizeDue` trước, `parseLocalDate(day)`, kiểm `canEditResults(day, now, actor.role)` (sai → FORBIDDEN), rồi trong giao dịch có `lockMatchDay`.
- `enterResult`: `checkScore` (sai → VALIDATION với `reason`); nếu buổi chưa có lịch chính thức và `now < checkInClosesAt(day)` → `promoteDraft` từ nháp khớp danh sách hiện tại (không có → `NOT_FOUND MESSAGES.noSchedule`); không tìm thấy trận → `NOT_FOUND MESSAGES.matchNotFound`; trận đã có kết quả → `CONFLICT resultConflict(scoreA cũ, scoreB cũ)`; lưu `entered_by`, `entered_at = now`, `version = 1`.
- `updateResult`: như trên nhưng trận phải có kết quả; `version` khác `expectedVersion` → `CONFLICT resultConflict(cũ)`; lưu và tăng `version`.
- `deleteResult` / `deleteAllResults`: xóa; nếu `now < checkInClosesAt(day)` và lịch chính thức không còn kết quả nào → xóa lịch chính thức (nháp vẫn còn, buổi mở lại).

- [x] **Step 1: Viết test thất bại**

Helper trong test: `setup()` tạo 6 mem, admin là `ms[0]`, subadmin là `ms[1]`, cả 6 điểm danh lúc `vn("2026-10-12T08:00")` với `seededRng(1)`; trả `{ ms, admin, sub, mem }`.

```ts
const SAT = (h: string) => vn(`2026-10-17T${h}`);
it("không nhập được trước 00:00 thứ 7", async () => {
  const { admin } = await setup();
  await expect(enterResult(t.db, admin, { day: "2026-10-17", matchNumber: 1, scoreA: 21, scoreB: 15 }, vn("2026-10-16T23:59")))
    .rejects.toMatchObject({ code: "FORBIDDEN" });
});
it("kết quả đầu tiên chốt lịch và khóa điểm danh; xóa hết thì mở lại", async () => {
  const { sub, ms } = await setup();
  await enterResult(t.db, sub, { day: "2026-10-17", matchNumber: 1, scoreA: 21, scoreB: 15 }, SAT("09:00"));
  expect(await t.db.select().from(officialSchedules)).toHaveLength(1);
  await expect(setAttendance(t.db, { memberId: ms[5].id, role: "member", sessionId: "s" }, { memberId: ms[5].id, attending: false }, SAT("09:05")))
    .rejects.toMatchObject({ code: "LOCKED" });
  await deleteAllResults(t.db, sub, { day: "2026-10-17" }, SAT("09:10"));
  expect(await t.db.select().from(officialSchedules)).toHaveLength(0);
  await setAttendance(t.db, { memberId: ms[5].id, role: "member", sessionId: "s" }, { memberId: ms[5].id, attending: false }, SAT("09:15"));
});
it("tỷ số sai bị từ chối với lý do", async () => {
  const { admin } = await setup();
  await expect(enterResult(t.db, admin, { day: "2026-10-17", matchNumber: 1, scoreA: 23, scoreB: 20 }, SAT("09:00")))
    .rejects.toMatchObject({ code: "VALIDATION", message: "Tỷ số 23–20 không hợp lệ: từ 22 điểm trở lên phải thắng cách đúng 2" });
});
it("hai người nhập cùng trận: người sau bị xung đột", async () => {
  const { admin, sub } = await setup();
  const results = await Promise.allSettled([
    enterResult(t.db, admin, { day: "2026-10-17", matchNumber: 2, scoreA: 21, scoreB: 17 }, SAT("09:00")),
    enterResult(t.db, sub, { day: "2026-10-17", matchNumber: 2, scoreA: 21, scoreB: 18 }, SAT("09:00")),
  ]);
  expect(results.filter(r => r.status === "fulfilled")).toHaveLength(1);
  const rejected = results.find(r => r.status === "rejected") as PromiseRejectedResult;
  expect(rejected.reason).toMatchObject({ code: "CONFLICT" });
  expect(rejected.reason.message).toMatch(/^Trận này vừa được nhập 21–1[78], hãy tải lại$/);
});
it("sửa với phiên bản cũ bị xung đột", async () => {
  const { admin } = await setup();
  await enterResult(t.db, admin, { day: "2026-10-17", matchNumber: 1, scoreA: 21, scoreB: 15 }, SAT("09:00"));
  await updateResult(t.db, admin, { day: "2026-10-17", matchNumber: 1, scoreA: 21, scoreB: 16, expectedVersion: 1 }, SAT("09:05"));
  await expect(updateResult(t.db, admin, { day: "2026-10-17", matchNumber: 1, scoreA: 21, scoreB: 19, expectedVersion: 1 }, SAT("09:06")))
    .rejects.toMatchObject({ code: "CONFLICT", message: "Trận này vừa được nhập 21–16, hãy tải lại" });
});
it("không ai mở app lúc 12:00: chủ nhật vẫn chốt đúng danh sách lúc 12:00", async () => {
  const { admin, ms } = await setup();
  await finalizeDue(t.db, vn("2026-10-18T09:00"));
  const off = await t.db.select().from(officialSchedules);
  expect(off).toHaveLength(1);
  expect(off[0].attendeeKey).toBe(attendeeKey(ms.map(m => m.id)));
  expect(await t.db.select().from(draftSchedules)).toHaveLength(0);
  await enterResult(t.db, admin, { day: "2026-10-17", matchNumber: 1, scoreA: 21, scoreB: 15 }, vn("2026-10-18T09:00"));
});
it("buổi đã qua: chỉ admin sửa", async () => {
  const { admin, sub } = await setup();
  await enterResult(t.db, sub, { day: "2026-10-17", matchNumber: 1, scoreA: 21, scoreB: 15 }, SAT("09:00"));
  const MON2 = vn("2026-10-19T08:00");
  await expect(updateResult(t.db, sub, { day: "2026-10-17", matchNumber: 1, scoreA: 21, scoreB: 10, expectedVersion: 1 }, MON2))
    .rejects.toMatchObject({ code: "FORBIDDEN" });
  await updateResult(t.db, admin, { day: "2026-10-17", matchNumber: 1, scoreA: 21, scoreB: 10, expectedVersion: 1 }, MON2);
});
it("xóa hết sau 12:00 không xóa lịch chính thức", async () => {
  const { admin } = await setup();
  await enterResult(t.db, admin, { day: "2026-10-17", matchNumber: 1, scoreA: 21, scoreB: 15 }, SAT("09:00"));
  await deleteAllResults(t.db, admin, { day: "2026-10-17" }, SAT("13:00"));
  expect(await t.db.select().from(officialSchedules)).toHaveLength(1);
});
```

- [x] **Step 2–4:** FAIL → viết → PASS.
- [x] **Step 5: Commit** · `git commit -m "feat: add schedule finalization and match results"`

---

### Task 7: Quản trị mem

**Files:**
- Create: `src/server/members/admin.ts`
- Test: `src/server/members/admin.int.test.ts`

**Interfaces:**
- Consumes: Task 2, Task 3, Task 5 (`refreshDraft`, `currentAttendeeIds`, `getOrCreateMatchDay`, `officialResultCount`), `canChangeAttendance`, `matchDayOfWeek`
- Produces:

```ts
export function setActive(db: Db, actor: Actor, memberId: string, active: boolean, now: Date, opts?: { rng?: Rng }): Promise<void>;
export function setSubadmin(db: Db, actor: Actor, memberId: string, isSubadmin: boolean): Promise<void>;
export function transferAdmin(db: Db, actor: Actor, input: { memberId: string; password: string }): Promise<void>;
export function adjustElo(db: Db, actor: Actor, input: { memberId: string; elo: string | number }, now: Date): Promise<void>;
```

Luật (spec 5.3, 4.1, 4.9), mọi hàm chỉ admin:
- `setActive(false)`: mục tiêu là admin → `VALIDATION "Không thể ngưng hoạt động admin"`; đặt `active=false`, subadmin → member, thu hồi mọi phiên; nếu buổi tuần này `canChangeAttendance` và mem có điểm danh → xóa điểm danh rồi `refreshDraft`. `setActive(true)`: chỉ đặt `active=true` (vai trò giữ member).
- `setSubadmin`: mục tiêu phải đang hoạt động và không phải admin (`VALIDATION "Chỉ đặt subadmin cho mem đang hoạt động, không phải admin"`).
- `transferAdmin`: `verifyPassword` của actor, sai → `VALIDATION MESSAGES.wrongPassword`; mục tiêu đang hoạt động và khác actor (`VALIDATION "Chỉ chuyển quyền cho mem khác đang hoạt động"`); trong giao dịch: actor → member trước, rồi mục tiêu → admin (để không vi phạm index một admin).
- `adjustElo`: `parseEloInput`; chèn `elo_adjustments` với `at = now`, `adjusted_by = actor.memberId`.

- [x] **Step 1: Viết test thất bại**

```ts
it("ngưng mem: thu hồi phiên, mất subadmin, rời điểm danh tuần này", async () => {
  const admin = await makeMember(t.db, { role: "admin" }); const sub = await makeMember(t.db, { role: "subadmin" });
  const s = await createSession(t.db, sub.id, vn("2026-10-12T08:00"));
  await setAttendance(t.db, actorOf(sub), { memberId: sub.id, attending: true }, vn("2026-10-12T08:00"));
  await setActive(t.db, actorOf(admin), sub.id, false, vn("2026-10-13T08:00"));
  expect(await resolveSession(t.db, s.token, vn("2026-10-13T08:01"))).toBeNull();
  expect((await t.db.select().from(members).where(eq(members.id, sub.id)))[0]).toMatchObject({ active: false, role: "member" });
  expect(await t.db.select().from(attendances)).toHaveLength(0);
});
it("không ngưng được admin", async () => {
  const admin = await makeMember(t.db, { role: "admin" });
  await expect(setActive(t.db, actorOf(admin), admin.id, false, vn("2026-10-13T08:00"))).rejects.toMatchObject({ code: "VALIDATION", message: "Không thể ngưng hoạt động admin" });
});
it("chuyển quyền admin", async () => {
  const admin = await makeMember(t.db, { role: "admin" }); const m = await makeMember(t.db);
  await expect(transferAdmin(t.db, actorOf(admin), { memberId: m.id, password: "sai" })).rejects.toMatchObject({ message: MESSAGES.wrongPassword });
  await transferAdmin(t.db, actorOf(admin), { memberId: m.id, password: TEST_PASSWORD });
  const rows = await t.db.select().from(members);
  expect(rows.find(r => r.id === admin.id)?.role).toBe("member");
  expect(rows.find(r => r.id === m.id)?.role).toBe("admin");
});
it("subadmin không làm được việc quản trị", async () => {
  const sub = await makeMember(t.db, { role: "subadmin" }); const m = await makeMember(t.db);
  for (const p of [setActive(t.db, actorOf(sub), m.id, false, vn("2026-10-13T08:00")), setSubadmin(t.db, actorOf(sub), m.id, true),
    adjustElo(t.db, actorOf(sub), { memberId: m.id, elo: 1100 }, vn("2026-10-13T08:00"))])
    await expect(p).rejects.toMatchObject({ code: "FORBIDDEN" });
});
it("mốc điều chỉnh ELO", async () => {
  const admin = await makeMember(t.db, { role: "admin" }); const m = await makeMember(t.db);
  await adjustElo(t.db, actorOf(admin), { memberId: m.id, elo: "1050,5" }, vn("2026-10-13T08:00"));
  expect((await loadEloState(t.db)).current.get(m.id)).toBe(10505);
});
```

- [x] **Step 2–4:** FAIL → viết → PASS.
- [x] **Step 5: Commit** · `git commit -m "feat: add member administration services"`

---

### Task 8: Dữ liệu màn "Tuần này"

**Files:**
- Create: `src/server/views/week.ts`
- Test: `src/server/views/week.int.test.ts`

**Interfaces:**
- Consumes: Task 4, 5, 6; `matchDayStatus`, `canChangeAttendance`, `canEditResults`; `checkInClosesAt`; `generateSchedule` không dùng — thiếu sơ đồ suy từ đếm hạt giống
- Produces:

```ts
export type PlayerRef = { id: string; displayName: string; avatarUrl: string | null; seed: 1 | 2 | null };
export type WeekMatch = { number: number; teamA: [PlayerRef, PlayerRef]; teamB: [PlayerRef, PlayerRef];
  result: { scoreA: number; scoreB: number; version: number } | null };
export type WeekView = {
  day: LocalDate; status: MatchDayStatus; closesAt: Date;
  attendees: { member: PlayerRef; recordedBySelf: boolean }[];
  activeMemberCount: number; actorAttending: boolean;
  schedule: { source: "draft" | "official"; matches: WeekMatch[] } | null;
  notice: { kind: "NOT_ENOUGH"; count: number } | { kind: "NO_DIAGRAM"; seed1: number; seed2: number } | null;
  can: { changeOwnAttendance: boolean; manageAttendance: boolean; editResults: boolean };
};
export function getWeekView(db: Db, actor: Actor, now: Date): Promise<WeekView>;
```

- `seed` của người trong lịch lấy từ `assignments` của lịch (hạt giống đã chụp); người trong danh sách điểm danh lấy từ hạt giống hiện tại; với lịch 5 người vẫn hiện hạt giống đã chụp.
- `schedule`: lịch chính thức nếu có, không thì nháp khớp danh sách hiện tại, không thì `null`.
- `notice`: dưới 5 → `NOT_ENOUGH`; từ 5 mà không có lịch → `NO_DIAGRAM` với số Hạt giống 1/2 hiện tại trong danh sách; còn lại `null`.
- `can.manageAttendance` = admin/subadmin và `canChangeAttendance`; `can.changeOwnAttendance` = `canChangeAttendance`; `can.editResults` = `canEditResults(day, now, role)`.

- [x] **Step 1: Viết test thất bại** — kiểm: 3 người → `notice NOT_ENOUGH count 3`, `schedule null`; 6 người → `schedule.source "draft"`, 6 trận, mỗi trận đủ 4 `PlayerRef` có tên; sau khi nhập trận 1 → `status "locked"`, `source "official"`, `matches[0].result` = `{ scoreA: 21, scoreB: 15, version: 1 }`; `activeMemberCount` không tính mem đã ngưng; `actorAttending` đúng; 7 người đều Hạt giống 2 (đặt 4 người ELO cao nhất ngưng hoạt động… hoặc tạo 7 mem cùng ELO với 4 mem có ELO cao hơn không điểm danh) → `NO_DIAGRAM { seed1: 0, seed2: 7 }`.
- [x] **Step 2–4:** FAIL → viết → PASS.
- [x] **Step 5: Commit** · `git commit -m "feat: add this-week view data"`

---

### Task 9: Dữ liệu xếp hạng, ELO, thống kê, lịch sử

**Files:**
- Create: `src/server/views/rankings.ts`, `src/server/views/history.ts`
- Test: `src/server/views/rankings.int.test.ts`, `src/server/views/history.int.test.ts`

**Interfaces:**
- Consumes: Task 4; `seasonStandings`, `memberStats`, `pairStats`, `StatsFilter` (`@/domain/stats`); `isSeasonEnded`, `LastDayResults` (`@/domain/season`); `lastMatchDayOfSeason`, `seasonOf` (`@/domain/time`); `pairMembers` (`@/domain/standings`); `parseSeasonId`
- Produces:

```ts
export type MemberRef = { id: string; displayName: string; username: string; avatarUrl: string | null; active: boolean };
export function getSeasonView(db: Db, season: string, now: Date): Promise<{ season: SeasonId; ended: boolean;
  rows: (Ranked<string> & { member: MemberRef })[] }>;
export function getEloView(db: Db, now: Date): Promise<{ rows: { member: MemberRef; eloTenths: number; seed: 1 | 2;
  lastMatchDayDelta: number | null }[] }>;   // chỉ mem đang hoạt động; sắp ELO giảm → vào câu lạc bộ sớm hơn → id
export function getStatsView(db: Db, filter: StatsFilter, now: Date): Promise<{
  members: (MemberStatRow & { member: MemberRef })[]; pairs: (Ranked<string> & { members: [MemberRef, MemberRef] })[] }>;
export function endedSeasons(db: Db, now: Date): Promise<Set<SeasonId>>;
  // mọi tháng có trận có kết quả, isSeasonEnded với LastDayResults lấy từ lịch chính thức của thứ 7 cuối tháng
  // (officialMatchCount = số trận của lịch đó, resultEnteredAts = entered_at của các trận có kết quả trong lịch đó)
// history.ts
export function getHistory(db: Db, now: Date): Promise<{ season: SeasonId; days: { day: LocalDate; playerCount: number;
  matchCount: number; resultCount: number }[] }[]>; // chỉ buổi có lịch chính thức, mới nhất trước
export function getMatchDayDetail(db: Db, day: string, now: Date): Promise<{ day: LocalDate;
  participants: MemberRef[]; matches: WeekMatch[] } | null>;
```

Mọi hàm gọi `finalizeDue(db, now)` trước. `season`/`day` đi qua `parseSeasonId`/`parseLocalDate`.

- [x] **Step 1: Viết test thất bại** — dựng 2 buổi (`2026-09-26`, `2026-10-03`) bằng `setAttendance` + `enterResult` với 6 mem và `seededRng`; kiểm: `getSeasonView("2026-09")` có `ended: true` lúc `vn("2026-10-01T08:00")`, `getSeasonView("2026-10")` có `ended: false` lúc `vn("2026-10-04T08:00")`; hạng 1 khớp `seasonStandings` gọi trực tiếp trên `loadResultMatches`; `getEloView` không có mem đã ngưng và `lastMatchDayDelta` của mem không đánh là `null`; `getStatsView({ memberId })` chỉ trả dòng của mem đó và `members[0].podium` khớp; `getHistory` trả tháng 10 trước tháng 9; `getMatchDayDetail("2026-10-16")` ném `VALIDATION "Ngày thi đấu không hợp lệ"`; ngày không có lịch → `null`.
- [x] **Step 2–4:** FAIL → viết → PASS.
- [x] **Step 5: Commit** · `git commit -m "feat: add rankings, stats and history view data"`

---

### Task 10: Tạo admin đầu tiên và đặt lại mật khẩu bằng lệnh

**Files:**
- Create: `src/server/members/bootstrap.ts`, `scripts/admin-create.ts`, `scripts/admin-reset-password.ts`
- Test: `src/server/members/bootstrap.int.test.ts`
- Modify: `package.json` (script `admin:create`, `admin:reset-password` chạy bằng `tsx`)

**Interfaces:**
- Produces:

```ts
export function createFirstAdmin(db: Db, input: NewMember, now: Date): Promise<{ id: string }>;
  // đã có admin → VALIDATION "Đã có admin, dùng chức năng chuyển quyền trong app"
export function resetPasswordByUsername(db: Db, username: string, newPassword: string): Promise<void>;
  // không có → NOT_FOUND MESSAGES.memberNotFound; thu hồi mọi phiên
```

Script đọc `DATABASE_URL` từ `.env`, hỏi thông tin bằng `node:readline/promises` (mật khẩu hỏi hai lần, không in ra), gọi hàm trên, in kết quả tiếng Việt, đóng kết nối, thoát mã 1 khi lỗi. `admin:reset-password` nhận username làm tham số: `pnpm admin:reset-password minh.nt`.

- [x] **Step 1: Viết test thất bại** — `createFirstAdmin` tạo admin với ELO đã nhập; gọi lần hai → VALIDATION đúng thông báo; `resetPasswordByUsername` đổi được mật khẩu (đăng nhập bằng mật khẩu mới thành công) và thu hồi phiên cũ.
- [x] **Step 2–4:** FAIL → viết → PASS. Chạy thử script thật trên database dev: `pnpm db:migrate && pnpm admin:create`.
- [x] **Step 5: Kiểm tra toàn bộ** · `pnpm test && pnpm test:int && pnpm lint && pnpm typecheck` PASS.
- [x] **Step 6: Ghi trong báo cáo** đoạn cần thêm vào `CLAUDE.md` (Trạng thái; Lệnh: `db:up`, `db:migrate`, `db:generate`, `test:int`, `admin:create`, `admin:reset-password`; cấu trúc `src/server/`). Subagent không sửa `CLAUDE.md`.
- [x] **Step 7: Commit** · `git commit -m "feat: add admin bootstrap commands"`
