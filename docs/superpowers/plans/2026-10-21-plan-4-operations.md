# Kế hoạch 4/4: Vận hành (Neon, Vercel, sao lưu)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Đưa ANH EM IT lên production (Vercel + Neon + Vercel Blob) và có sao lưu tự động hằng tuần vào một repo GitHub riêng tư, khôi phục được bằng `pnpm db:restore <file>`.

**Architecture:** Code chỉ thay đổi ít: cấu hình kết nối cho Neon (chuỗi pooled cho app, unpooled cho migration/sao lưu/khôi phục), migration tự chạy khi deploy production, icon PWA, script sao lưu và khôi phục dùng image Docker `postgres:17`. Phần lớn còn lại là các bước người dùng làm trên Neon/Vercel/GitHub theo runbook `docs/ops/runbook.md`, xen kẽ với bước agent kiểm tra. Workflow sao lưu nằm **trong repo sao lưu riêng tư** (log và secret không lộ ra repo code công khai); bản gốc của workflow và script được giữ ở `ops/backup/` trong repo code.

**Tech Stack:** Neon (PostgreSQL 17, AWS ap-southeast-1 Singapore) qua Vercel Marketplace, Vercel (Hobby, region `sin1`), Vercel Blob, GitHub Actions, Docker `postgres:17` (`pg_dump`, `psql`), tsx, Vitest.

**Spec:** `docs/superpowers/specs/2026-10-10-badminton-club-app-design.md` (mục 5.4, 6.1, 6.2, 6.5). Đọc kèm `CLAUDE.md`, `docs/backlog.md`.

## Global Constraints

- Không commit secret. Chuỗi kết nối Neon, `BLOB_READ_WRITE_TOKEN` chỉ nằm ở biến môi trường Vercel, GitHub Secrets của repo sao lưu, hoặc file `.env*` local (đã bị `.gitignore`). Không in chúng ra log, kể cả log GitHub Actions.
- App dùng `DATABASE_URL` (pooled). Migration, sao lưu, khôi phục và lệnh quản trị trên production dùng `DATABASE_URL_UNPOOLED` (kết nối trực tiếp).
- Kết nối postgres.js: `prepare: false` (bắt buộc với pooler chế độ transaction), `max: 5`, `connect_timeout: 15` (Neon ngủ thì lần đầu mất vài giây), `idle_timeout: 20`.
- Migration chỉ chạy khi `VERCEL_ENV === "production"`; preview deployment không đụng database production.
- Vercel function region `sin1`; Neon region AWS `ap-southeast-1`.
- `pg_dump` và `psql` chạy bằng `docker run --rm postgres:17 …` cho khớp phiên bản server 17.
- Sao lưu: cron `0 16 * * 0` (UTC) = chủ nhật 23:00 giờ Việt Nam. Một file `anh-em-it.sql.gz` (`pg_dump --format=plain --no-owner --no-privileges`, `gzip -n`), ghi đè mỗi tuần, lịch sử git giữ các bản cũ. Dữ liệu không đổi thì không commit.
- Bước đánh dấu **[Người dùng]** do người dùng làm theo runbook; agent điều phối hướng dẫn từng bước trong chat, chờ người dùng báo xong rồi chạy bước kiểm tra kế tiếp. Subagent không làm các bước này.
- Commit sau mỗi task: `<loại>(plan-4/task-N): …`; xác minh `pnpm test && pnpm test:int && pnpm lint && pnpm typecheck && pnpm format:check && pnpm build`.

## Review Focus

1. **Neon đang ngủ** khi mem mở app sáng thứ 7: request đầu mất vài giây → khung đang tải hiện, không lỗi timeout → `connect_timeout: 15` (Task 1) và kiểm tra thật ở Task 5 Step 6.
2. **Tuần không có thay đổi dữ liệu:** workflow sao lưu vẫn chạy xanh, không tạo commit rỗng, không báo lỗi → test ở Task 3.
3. **Khôi phục nhầm database:** chạy `pnpm db:restore` khi `.env` đang trỏ production, hoặc đưa nhầm file → script in host + tên database, bắt gõ đúng tên database, từ chối file không phải `.sql`/`.sql.gz` → test ở Task 3.
4. **Preview deployment** (push một nhánh khác) → không chạy migration lên production → test `shouldMigrate` ở Task 1.
5. **Log workflow sao lưu** khi `pg_dump` lỗi (sai mật khẩu, DB ngủ): không lộ chuỗi kết nối, workflow đỏ để người dùng nhận email → kiểm ở Task 4 (secret qua biến môi trường, không echo; một lần thử lại sau 30 giây).

---

## Cấu trúc file

```
vercel.json                      region sin1, buildCommand chạy migration production
scripts/migrate-deploy.ts        migration khi deploy (bỏ qua nếu không phải production)
scripts/db-restore.ts            pnpm db:restore <file>
scripts/make-icons.ts            sinh icon PWA từ font Be Vietnam Pro
scripts/cli.ts                   + ENV_FILE để chạy lệnh quản trị với file env khác
src/ops/                         logic thuần cho vận hành (có test): restore-guard.ts, deploy-env.ts
ops/backup/backup.sh             pg_dump → anh-em-it.sql.gz
ops/backup/commit.sh             commit nếu file đổi
ops/backup/workflow.yml          bản gốc của .github/workflows/backup.yml trong repo sao lưu
ops/backup/README.md             README cho repo sao lưu
docs/ops/runbook.md              các bước trên Neon, Vercel, GitHub; khôi phục
src/app/manifest.ts, src/app/icon.png, src/app/apple-icon.png, public/icons/*
```

---

### Task 1: Kết nối production và migration khi deploy

**Files:**
- Modify: `src/server/db/client.ts`, `drizzle.config.ts`, `scripts/cli.ts`, `package.json`, `.env.example`, spec mục 6.1/6.2/6.5
- Create: `src/ops/deploy-env.ts`, `scripts/migrate-deploy.ts`, `vercel.json`
- Test: `src/ops/deploy-env.test.ts`, `src/server/db/client.test.ts`

**Interfaces:**
- Produces:
  - `connectionOptions(): postgres.Options<{}>` (export từ `client.ts`, dùng trong `createDb`) trả `{ prepare: false, max: 5, connect_timeout: 15, idle_timeout: 20, onnotice: () => {} }`.
  - `shouldMigrate(env: Record<string, string | undefined>): boolean` — true khi `env.VERCEL_ENV === "production"`.
  - `directUrl(env): string` — `env.DATABASE_URL_UNPOOLED ?? env.DATABASE_URL`, ném lỗi "Thiếu DATABASE_URL" nếu cả hai trống.
  - Script `"db:migrate:deploy": "tsx scripts/migrate-deploy.ts"`.
  - `scripts/cli.ts` `connect()`: nếu có `ENV_FILE` thì nạp file đó thay cho `.env`; dùng `directUrl(process.env)`.

- [x] **Step 1: Viết test (fail)**
  - `deploy-env.test.ts`: `shouldMigrate({ VERCEL_ENV: "production" })` true; `"preview"`, `"development"`, `{}` → false. `directUrl({ DATABASE_URL_UNPOOLED: "a", DATABASE_URL: "b" })` → `"a"`; chỉ có `DATABASE_URL` → `"b"`; trống → ném lỗi.
  - `client.test.ts`: `connectionOptions()` có `prepare: false`, `max: 5`, `connect_timeout: 15`, `idle_timeout: 20`.
- [x] **Step 2: Chạy `pnpm test src/ops src/server/db/client.test.ts`** → FAIL.
- [x] **Step 3: Viết mã**
  - `migrate-deploy.ts`: `shouldMigrate(process.env)` false → in "Bỏ qua migration (không phải production)" và thoát 0; true → `migrate(db, { migrationsFolder: "drizzle" })` với `createDb(directUrl(process.env))`, in "Đã chạy migration", lỗi thì in `safeErrorSummary` và thoát 1.
  - `drizzle.config.ts` dùng `DATABASE_URL_UNPOOLED ?? DATABASE_URL`.
  - `vercel.json`: `{ "regions": ["sin1"], "buildCommand": "pnpm db:migrate:deploy && pnpm build" }`.
  - `.env.example` thêm dòng `DATABASE_URL_UNPOOLED=` (để trống ở local) kèm chú thích một dòng.
  - Spec: 6.1 dòng Hosting thêm "region `sin1`", dòng Database thêm "Neon region Singapore"; 6.2 thêm `DATABASE_URL_UNPOOLED` (kết nối trực tiếp cho migration, sao lưu, khôi phục, lệnh quản trị) và `DATABASE_URL_E2E`; 6.5 ghi các quyết định ở Global Constraints về sao lưu (workflow trong repo sao lưu, một file ghi đè, không commit khi không đổi, Docker `postgres:17`).
- [x] **Step 4: Chạy lại** → PASS; chạy toàn bộ xác minh (test tích hợp vẫn xanh với `prepare: false`).
- [x] **Step 5: Commit** `feat(plan-4/task-1): configure Neon connections and production migrations`.

---

### Task 2: Icon PWA và dọn phụ thuộc

**Files:**
- Create: `scripts/make-icons.ts`, `public/icons/icon-192.png`, `public/icons/icon-512.png`, `public/icons/icon-maskable-512.png`, `src/app/icon.png` (32×32), `src/app/apple-icon.png` (180×180)
- Modify: `src/app/manifest.ts`, `package.json` (`shadcn` sang devDependencies; script `"icons": "tsx scripts/make-icons.ts"`), xóa `public/{file,globe,next,vercel,window}.svg` và `src/app/favicon.ico`
- Test: `src/app/manifest.test.ts`

**Interfaces:**
- Icon: nền `#111111`, chữ "AE" màu `#FF6B00`, font `src/fonts/be-vietnam-pro/BeVietnamPro-Bold.ttf` (sharp `text` với `fontfile`), chữ chiếm khoảng 55% chiều rộng; bản maskable để chữ nằm trong vùng an toàn 80% ở giữa.

- [x] **Step 1: Viết test (fail)** — `manifest.test.ts`: `manifest().icons` có đúng 3 mục `/icons/icon-192.png` (192x192), `/icons/icon-512.png` (512x512), `/icons/icon-maskable-512.png` (512x512, `purpose: "maskable"`); mỗi file tồn tại trong `public/` và `sharp(file).metadata()` đúng kích thước.
- [x] **Step 2: Chạy `pnpm test src/app/manifest.test.ts`** → FAIL.
- [x] **Step 3: Viết `make-icons.ts`, chạy `pnpm icons`, cập nhật `manifest.ts`, chuyển `shadcn`, xóa file mẫu không dùng (grep trước khi xóa).**
- [x] **Step 4: Chạy lại** → PASS; `pnpm audit --prod` không còn mục `braces`; `pnpm build` sạch.
- [x] **Step 5: Commit** `feat(plan-4/task-2): add PWA icons, move shadcn to dev dependencies`.

---

### Task 3: Script sao lưu và khôi phục

**Files:**
- Create: `ops/backup/backup.sh`, `ops/backup/commit.sh`, `src/ops/restore-guard.ts`, `scripts/db-restore.ts`
- Modify: `package.json` (`"db:restore": "tsx scripts/db-restore.ts"`), `vitest.integration.mts` (include thêm `src/ops/**/*.int.test.ts`), `docker/init.sql` không đổi (database tạm do test tự tạo)
- Test: `src/ops/restore-guard.test.ts`, `src/ops/backup-restore.int.test.ts`

**Interfaces:**
- `backup.sh`: đọc URL từ biến môi trường `BACKUP_DATABASE_URL` (không nhận qua tham số dòng lệnh để không lộ trong `ps`/log), tham số 1 là thư mục đích; `export PGURL="$BACKUP_DATABASE_URL"` rồi chạy `docker run --rm --network host -e PGURL postgres:17 sh -c 'pg_dump --format=plain --no-owner --no-privileges "$PGURL"' | gzip -n > "$1/anh-em-it.sql.gz"`; `set -euo pipefail`; thử lại một lần sau 30 giây nếu lần đầu lỗi; không echo URL.
- `commit.sh`: tham số 1 là thư mục repo; `git add anh-em-it.sql.gz`; nếu `git diff --cached --quiet` → in "Không có thay đổi, bỏ qua commit" và thoát 0; ngược lại commit `backup: <YYYY-MM-DD giờ VN>`.
- `restore-guard.ts`:
  - `checkRestoreFile(path: string): "sql" | "sql.gz"` — ném lỗi "Chỉ khôi phục từ file .sql hoặc .sql.gz" với đuôi khác.
  - `describeTarget(url: string): { host: string; database: string }`.
  - `confirmMatches(typed: string, database: string): boolean` — so sánh sau `trim()`, phân biệt hoa thường.
  - `RESET_SQL = "DROP SCHEMA IF EXISTS drizzle CASCADE; DROP SCHEMA IF EXISTS public CASCADE; CREATE SCHEMA public;"`.
- `db-restore.ts`: đích = `directUrl(process.env)` (nạp `ENV_FILE` như `cli.ts`); in "Sẽ GHI ĐÈ database <database> trên <host> bằng <file>"; hỏi "Gõ tên database để xác nhận: "; sai → "Đã hủy" thoát 1; đúng → chạy `RESET_SQL` rồi nạp file qua `docker run --rm -i --network host -e PGURL postgres:17 sh -c 'psql -v ON_ERROR_STOP=1 --single-transaction "$PGURL"'` (giải nén `.gz` bằng `zlib` trong Node rồi pipe vào stdin); in "Đã khôi phục". Lỗi in `safeErrorSummary`.

- [ ] **Step 1: Viết test (fail)**
  - `restore-guard.test.ts`: `.sql`, `.sql.gz` hợp lệ; `.dump`, `.gz`, `.txt` ném đúng thông báo; `describeTarget("postgres://u:p@ep-x.ap-southeast-1.aws.neon.tech/neondb?sslmode=require")` → `{ host: "ep-x.ap-southeast-1.aws.neon.tech", database: "neondb" }`; `confirmMatches(" neondb ", "neondb")` true, `"NEONDB"` false.
  - `backup-restore.int.test.ts` (cần Docker): tạo database tạm `anh_em_it_restore`; seed vào `anh_em_it_test` một admin bằng `createFirstAdmin`; chạy `backup.sh` (env `BACKUP_DATABASE_URL` = URL test) vào thư mục tạm là một git repo mới; kiểm file tồn tại, giải nén có `CREATE TABLE public.members`; chạy `commit.sh` hai lần → lần hai in "Không có thay đổi" và `git rev-list --count HEAD` vẫn là 1; khôi phục file vào `anh_em_it_restore` (gọi hàm khôi phục với xác nhận đúng) → bảng `members` có đúng admin đó; khôi phục lần hai vẫn thành công (đặt lại schema). Xóa database tạm ở `afterAll`.
- [ ] **Step 2: Chạy `pnpm test src/ops && pnpm test:int src/ops`** → FAIL.
- [ ] **Step 3: Viết mã** (tách phần chạy khôi phục thành hàm `restoreDatabase(url, file)` trong `scripts/db-restore.ts` hoặc `src/ops/restore.ts` để test gọi được; phần hỏi xác nhận ở `main`).
- [ ] **Step 4: Chạy lại** → PASS; `shellcheck` cho hai file `.sh` nếu có (`docker run --rm -v "$PWD:/mnt" koalaman/shellcheck:stable ops/backup/*.sh`).
- [ ] **Step 5: Commit** `feat(plan-4/task-3): add backup and restore scripts`.

---

### Task 4: Workflow sao lưu và runbook

**Files:**
- Create: `ops/backup/workflow.yml`, `ops/backup/README.md`, `docs/ops/runbook.md`
- Test: kiểm tra bằng `actionlint` (Docker `rhysd/actionlint:latest`)

**Interfaces:**
- `workflow.yml` (sẽ đặt ở `.github/workflows/backup.yml` của repo sao lưu): `on: schedule: - cron: "0 16 * * 0"` + `workflow_dispatch`; `permissions: contents: write`; `concurrency: backup`; một job `ubuntu-latest`, `timeout-minutes: 15`: checkout repo sao lưu; cấu hình `git user.name "backup-bot"`, `user.email "backup-bot@users.noreply.github.com"`; chạy `./backup.sh .` với `env: BACKUP_DATABASE_URL: ${{ secrets.DATABASE_URL }}`; chạy `./commit.sh .`; `git push`. Không có bước nào echo secret.
- `ops/backup/README.md`: repo này chứa gì, lịch chạy, cách chạy tay (Actions → Backup → Run workflow), cách khôi phục (tải `anh-em-it.sql.gz` của commit cần dùng → `pnpm db:restore <file>` trong repo code), cảnh báo repo phải riêng tư.
- `docs/ops/runbook.md` gồm các mục, mỗi bước ghi đúng nút bấm/menu và giá trị cần nhập:
  1. Tạo Vercel project từ repo GitHub `anhdd1901/it-badminton` (framework Next.js, root mặc định, không sửa build command vì đã có `vercel.json`).
  2. Vercel → Storage → Create → Neon (Marketplace), region Singapore, nối vào project cho cả Production/Preview/Development → kiểm tra có `DATABASE_URL`, `DATABASE_URL_UNPOOLED`.
  3. Vercel → Storage → Create → Blob, nối vào project → có `BLOB_READ_WRITE_TOKEN`.
  4. Deploy lại (Redeploy) để migration chạy; đọc build log có "Đã chạy migration".
  5. Tạo admin đầu tiên từ máy: tạo `.env.production.local` chỉ chứa `DATABASE_URL_UNPOOLED=…` (copy từ Vercel → Settings → Environment Variables), chạy `ENV_FILE=.env.production.local pnpm admin:create`.
  6. Tạo repo riêng tư `it-badminton-backup` (không tick README), thêm secret `DATABASE_URL` = giá trị `DATABASE_URL_UNPOOLED`; đẩy `backup.sh`, `commit.sh`, `README.md`, `.github/workflows/backup.yml` lên; Actions → Backup → Run workflow; kiểm commit có `anh-em-it.sql.gz`.
  7. Diễn tập khôi phục vào database dev local.
  8. Khi cần khôi phục production: các bước và cảnh báo.
  9. Đổi/thu hồi secret khi lộ: Neon reset password, cập nhật Vercel env và secret repo sao lưu.

- [ ] **Step 1: Viết `workflow.yml`, chạy `docker run --rm -v "$PWD:/repo" -w /repo rhysd/actionlint:latest ops/backup/workflow.yml`** → không lỗi.
- [ ] **Step 2: Viết `ops/backup/README.md` và `docs/ops/runbook.md`.**
- [ ] **Step 3: Commit** `docs(plan-4/task-4): add backup workflow and operations runbook`.

---

### Task 5: Đưa lên production (cùng người dùng)

Agent điều phối làm task này trực tiếp trong chat (không giao subagent): hướng dẫn từng bước của runbook, chờ người dùng báo xong, rồi kiểm tra.

- [ ] **Step 1: [Người dùng] Runbook mục 1–3** (Vercel project, Neon, Blob). Agent kiểm: người dùng gửi URL `*.vercel.app` của bản deploy.
- [ ] **Step 2: [Người dùng] Runbook mục 4** (Redeploy). Agent kiểm: người dùng dán dòng build log có "Đã chạy migration" (không dán biến môi trường).
- [ ] **Step 3: Agent kiểm header production:** `curl -sI https://<app>.vercel.app/dang-nhap` có `strict-transport-security`, `content-security-policy` với `nonce-`, `x-content-type-options: nosniff`, `referrer-policy: strict-origin-when-cross-origin`.
- [ ] **Step 4: [Người dùng] Runbook mục 5** (tạo admin). Agent nhắc xóa `.env.production.local` sau khi dùng hoặc giữ lại nhưng không commit (đã nằm trong `.gitignore`).
- [ ] **Step 5: Agent chạy thử bằng `agent-browser` trên production** với tài khoản admin người dùng cung cấp (mật khẩu bọc trong `<private>`): đăng nhập; màn Tuần này hiện đúng ngày; đổi theme; tải avatar ở màn Tôi → URL ảnh thuộc `*.public.blob.vercel-storage.com`, ảnh hiện được (CSP cho phép); xóa avatar; đăng xuất. Chụp màn hình ở 390×844. Không tạo dữ liệu thi đấu thử trên production.
- [ ] **Step 6: Kiểm Neon ngủ:** chờ Neon tạm ngưng (mặc định 5 phút không dùng), mở `/` → khung đang tải rồi trang hiện, không lỗi.
- [ ] **Step 7:** Xóa mục "chưa thử `blobAvatarStore` với Vercel Blob thật" khỏi backlog; commit `docs(plan-4/task-5): record production go-live`.

---

### Task 6: Sao lưu thật và diễn tập khôi phục (cùng người dùng)

- [ ] **Step 1: [Người dùng] Runbook mục 6** (repo `it-badminton-backup` riêng tư, secret, đẩy file). Agent có thể tự đẩy file nếu người dùng đồng ý và máy có quyền ghi repo đó; trước khi đẩy, kiểm repo là riêng tư (`curl` không đăng nhập trả 404).
- [ ] **Step 2: [Người dùng] Chạy tay workflow lần đầu.** Agent kiểm: workflow xanh, có commit chứa `anh-em-it.sql.gz`; xem log không có chuỗi kết nối. Chạy tay lần hai → xanh, log có "Không có thay đổi, bỏ qua commit".
- [ ] **Step 3: Diễn tập khôi phục (agent, cùng người dùng tải file):** tải `anh-em-it.sql.gz` về thư mục tạm, `pnpm db:restore <file>` vào database dev local (`.env` trỏ `anh_em_it_dev`), kiểm `members` có admin production. Xong thì chạy lại `pnpm db:migrate` để dev DB đúng schema hiện tại.
- [ ] **Step 4: Commit** `docs(plan-4/task-6): record first backup and restore drill`.

---

### Task 7: Rà bảo mật và hoàn tất

- [ ] **Step 1:** Chạy `security-review` cho toàn bộ thay đổi của kế hoạch 4 (đụng secret, deploy, sao lưu). Mục nào cần sửa thì giao subagent sửa và review như các task khác.
- [ ] **Step 2:** Đối chiếu spec 5.4 mục "Sao lưu" và HSTS: đánh dấu đã làm.
- [ ] **Step 3:** Cập nhật `CLAUDE.md` (mục Lệnh: `db:migrate:deploy`, `db:restore`, `icons`, `ENV_FILE`; mục Lưu ý: workflow sao lưu nằm ở repo `it-badminton-backup`, bản gốc ở `ops/backup/`, sửa thì sửa cả hai; mục Tài liệu: runbook), `docs/backlog.md`.
- [ ] **Step 4:** Commit `docs(plan-4/task-7): update CLAUDE.md after go-live`.
