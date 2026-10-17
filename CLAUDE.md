# Dự án: ANH EM IT, app lịch thi đấu câu lạc bộ cầu lông

**Đọc hết file này trước khi làm bất cứ việc gì trong dự án.** File này chỉ chứa thông tin tĩnh: đã chốt gì, lệnh nào, cần lưu ý gì. Trạng thái và tiến độ không ghi ở đây: xem git, các file kế hoạch (`- [x]`) và context claude-mem, theo mục *Ghi nhớ giữa các session* trong `~/.claude/CLAUDE.md`.

Quy trình làm việc chung nằm ở `~/.claude/CLAUDE.md`. File này chỉ ghi những gì riêng của dự án. Chỉ agent điều phối sửa file này, khi đổi quy tắc, công nghệ, lệnh, thư mục hoặc phát hiện chỗ dễ vấp mới. Giữ dưới khoảng 150 dòng.

Quy tắc Next.js 16 cho agent (cũng dùng cho Codex, Cursor…): @AGENTS.md

## Tổng quan

Web app cho một câu lạc bộ cầu lông (hiện 10 mem): mem điểm danh cho buổi thứ 7 hằng tuần, app tự xếp lịch đánh đôi theo sơ đồ và hạt giống, admin nhập tỷ số, app tính bảng xếp hạng mùa (mỗi tháng), ELO và thống kê. Dùng trên trình duyệt điện thoại và máy tính.

## Tài liệu

- **Spec (nguồn chính cho mọi quy tắc):** `docs/superpowers/specs/2026-10-10-badminton-club-app-design.md`
- **Thuật ngữ:** `GLOSSARY.md`. Dùng đúng thuật ngữ này trong code, test và giao diện.
- **Kế hoạch:** `docs/superpowers/plans/`. Dự án chia 4 kế hoạch: 1 Nền móng và lõi quy tắc · 2 Database, đăng nhập, lớp nghiệp vụ · 3 Giao diện · 4 Vận hành. Kế hoạch đã có file và mọi bước `[x]` là xong.
- **Việc tồn đọng:** `docs/backlog.md`.
- **Giao diện:** phong cách lấy cảm hứng từ livescore.com, hai theme sáng/tối, font Be Vietnam Pro (spec 8.1). `docs/design/` (prompt Stitch) chỉ để tham khảo, không dùng nữa.

## Công nghệ

Node 22, pnpm, TypeScript strict. Next.js 16 (App Router) + React 19, Tailwind 4, shadcn/ui, lucide-react. PostgreSQL (Neon ở production, Docker `postgres:17` ở local) qua postgres.js + Drizzle. Zod, argon2, date-fns + `@date-fns/tz`, sharp + Vercel Blob. Test: Vitest, Testing Library, Playwright. Deploy lên Vercel. Không dùng thư viện auth ngoài. Bảng đầy đủ và biến môi trường: spec mục 6.

## Lệnh

- `pnpm install`: cài thư viện
- `pnpm dev`: chạy app ở máy
- `pnpm test` / `pnpm test:watch`: chạy test (Vitest, cố định `TZ=America/Los_Angeles` để lộ lỗi múi giờ)
- `pnpm typecheck`: kiểm tra kiểu TypeScript (Vitest không kiểm tra kiểu, nên luôn chạy lệnh này)
- `pnpm lint`, `pnpm build`
- `pnpm db:up`: bật PostgreSQL (Docker) · `pnpm db:generate`: sinh migration từ `src/server/db/schema.ts` · `pnpm db:migrate`: chạy migration lên database dev
- `pnpm test:int`: test tích hợp với PostgreSQL thật (`*.int.test.ts`, database test, chạy tuần tự)
- `pnpm admin:create`: tạo admin đầu tiên · `pnpm admin:reset-password <username>`: đặt lại mật khẩu (cũng mở khóa đăng nhập)

## Cấu trúc thư mục

```
CLAUDE.md               file này (thông tin tĩnh)
GLOSSARY.md             thuật ngữ nghiệp vụ
AGENTS.md               quy tắc của Next.js 16 cho agent (do `next dev` tạo lại)
src/domain/             quy tắc nghiệp vụ thuần (không import Next, DB, React)
src/server/              lớp nghiệp vụ: db/ (schema, client, lock), auth/, members/, match-days/, data/ (loaders), views/ (dữ liệu cho màn hình)
src/app/                giao diện Next.js (App Router)
scripts/                lệnh quản trị (tsx)
drizzle/                migration
docs/superpowers/specs/ spec
docs/design/            prompt Stitch (không dùng nữa, để tham khảo)
src/fonts/              font tự host (Be Vietnam Pro)
docs/superpowers/plans/ kế hoạch triển khai (tiến độ = các bước [x])
docs/backlog.md         việc tồn đọng
docs/adr/               quyết định kiến trúc (chưa có)
```

## Tóm tắt quy tắc then chốt

Chi tiết và ngoại lệ nằm trong spec; đây chỉ là bản đồ nhanh.

- **Thời gian:** giờ Việt Nam, theo đồng hồ server. Tuần thứ 2 → chủ nhật. Buổi đấu là thứ 7. Điểm danh từ thứ 2 đến 12:00 thứ 7.
- **Khóa buổi:** sau 12:00 thứ 7, hoặc khi lịch chính thức đã có kết quả (xóa hết kết quả trước 12:00 thì mở lại). (spec 4.1)
- **Hạt giống:** 4 mem đang hoạt động có ELO cao nhất là Hạt giống 1; bằng ELO thì người vào câu lạc bộ sớm hơn đứng trước. (4.2)
- **Lịch:** từ 5 người; sơ đồ theo (số Hạt giống 1, số Hạt giống 2); 5 người thì không phân hạt giống. Danh sách trùng lần trước trong cùng buổi thì dùng lại lịch nháp. Chốt lịch chính thức khi có kết quả đầu tiên hoặc lúc 12:00 thứ 7; lịch nháp xóa lúc 12:00 thứ 7. (4.3–4.5)
- **Tỷ số:** một ván, luật 21, hơn 2, chạm 30. Thứ tự nhập tự do. Buổi tuần này: admin và subadmin; buổi đã qua: chỉ admin. (4.6)
- **Xếp hạng mùa:** thắng → hiệu số → cầu thắng → cầu thua (ít trước) → số trận (ít trước); đồng hạng kiểu 1, 1, 3. (4.7)
- **ELO:** công thức đội với chia trong đội theo độ chênh; tính lại từ đầu theo (ngày, số trận), có mốc điều chỉnh của admin. Có bảng ví dụ kiểm chứng. (4.9)
- **Quyền:** subadmin chỉ điểm danh hộ và nhập kết quả buổi tuần này; mọi việc quản lý chỉ admin. Đúng một admin, chuyển quyền được. (5.3)
- **Phiên đăng nhập:** không hết hạn; vô hiệu ở server khi ngưng mem hoặc đổi mật khẩu; giao diện tự đăng xuất khi gặp 401. (5.2)

## Lưu ý

- **Nhánh làm việc:** kế hoạch 2–4 làm tiếp trên nhánh `worktree-plan-1-foundation-domain` (worktree `.claude/worktrees/plan-1-foundation-domain`), chưa merge vào `master`. Mỗi kế hoạch: viết → người dùng duyệt → thực hiện bằng subagent-driven-development.
- **Môi trường:** PostgreSQL 17 chạy bằng Docker ở cổng 5433 (`docker-compose.yml`), database `anh_em_it_dev` và `anh_em_it_test`. Chép `.env.example` thành `.env`. Phiên Claude cũ chưa nhận nhóm `docker` thì chạy lệnh docker qua `sg docker -c "..."`.
- **Font:** Be Vietnam Pro 400/500/600/700 (`.ttf`, đủ dấu tiếng Việt) và `OFL.txt` ở `src/fonts/be-vietnam-pro/`.
- **Next.js 16 khác kiến thức cũ:** trước khi viết code Next, đọc hướng dẫn trong `node_modules/next/dist/docs/` (xem `AGENTS.md`).
- **Ranh giới `src/domain/`:** hàm nhận `now: Date`, không gọi `new Date()`; chỉ import `date-fns`, `@date-fns/tz` và file trong `src/domain/`. ELO lưu bằng số nguyên phần mười. Domain tin dữ liệu vào: lớp nghiệp vụ (kế hoạch 2) phải kiểm tra `LocalDate`/`SeasonId` bằng Zod, chỉ đưa mem đang hoạt động vào xếp hạt giống, và truyền cho `seasonEndsAt` đúng một mốc thời gian cho mỗi trận có kết quả của thứ 7 cuối mùa.
- **Lớp nghiệp vụ `src/server/`:** hàm nhận `db`, `Actor`, `now`; tự kiểm quyền; lỗi là `AppError` (code + thông báo tiếng Việt trong `errors.ts`, `HTTP_STATUS` để ánh xạ). Mọi thao tác ghi trên một buổi khóa advisory theo ngày (`lockMatchDay`) và gọi `finalizeDue` trước. Khóa lịch (`scheduleKey`) = danh sách mem *đang hoạt động* đã điểm danh; giao diện phải gửi lại `scheduleKey` lấy từ `getWeekView`/`getMatchDayDetail` khi nhập/sửa/xóa kết quả. Id từ client đi qua `parseMemberId`.
- **Cho kế hoạch 3 (từ review):** cần thêm dữ liệu cho màn Cá nhân, danh sách mem cho admin, chọn mem kèm username, danh sách tháng có dữ liệu; dịch vụ avatar; client `db` dùng chung (cache trên `globalThis`); ẩn "đặt lại mật khẩu" cho chính admin (sẽ tự đăng xuất).
- **sharp đang bị tắt build** (`pnpm-workspace.yaml`, `allowBuilds`): bật lại khi làm phần thu nhỏ avatar.
- Người dùng đã có tài khoản GitHub nhưng chưa đưa code lên. Khi tới bước cần GitHub (đẩy code, repo sao lưu riêng tư, GitHub Secrets cho sao lưu ở spec 6.5), nhắc và hướng dẫn người dùng từng bước.
- Không có tính năng đánh thay: kết quả luôn tính cho người có tên trong lịch (spec 4.6).
- Công thức chia ELO trong đội (spec 4.9, bước 4) được suy ra từ ví dụ của người dùng và đã được người dùng xác nhận. Đừng "đơn giản hóa" nó: các ví dụ kiểm chứng phải khớp đến 0,1.
- Thứ tự số trận trong lịch không phải thứ tự ra sân; chỉ dùng để sắp thứ tự tính ELO.
- Sơ đồ nằm trong file dữ liệu ở mã nguồn, không ở database. Người dùng gửi sơ đồ mới thì cập nhật file đó và Phụ lục A của spec.
