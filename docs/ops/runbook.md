# Runbook vận hành ANH EM IT

Các bước làm trên Vercel, Neon và GitHub để đưa app lên production, sao lưu và khôi phục. Quyết định nền tảng nằm ở spec mục 6.1, 6.2, 6.5.

**Quy tắc chung:** không dán chuỗi kết nối, token hay mật khẩu vào chat, issue hay commit. Chỉ copy chúng vào biến môi trường Vercel, GitHub Secrets hoặc file `.env*` ở máy (đã bị `.gitignore`).

## 1. Tạo project trên Vercel

1. Đăng nhập <https://vercel.com> bằng tài khoản GitHub.
2. **Add New… → Project** → chọn repo `anhdd1901/it-badminton` → **Import**. Nếu không thấy repo, bấm **Adjust GitHub App Permissions** và cho Vercel truy cập repo này.
3. **Framework Preset:** Next.js. **Root Directory:** để mặc định. **Build Command:** không sửa (đã có trong `vercel.json`).
4. Bấm **Deploy**. Lần này có thể báo lỗi vì chưa có database. Không sao, làm tiếp mục 2.

## 2. Tạo database Neon

1. Trong project trên Vercel: tab **Storage** → **Create Database** → chọn **Neon** (Serverless Postgres) → **Continue**.
2. **Region:** Singapore (`aws-ap-southeast-1`). **Plan:** Free. Đặt tên, ví dụ `anh-em-it`.
3. Ở bước nối vào project, tick cả **Production**, **Preview** và **Development** → **Connect**.
4. Kiểm tra: **Settings → Environment Variables** có `DATABASE_URL` và `DATABASE_URL_UNPOOLED` (cùng vài biến `PG*`/`POSTGRES_*`, giữ nguyên).

## 3. Tạo kho ảnh Vercel Blob

1. Tab **Storage** → **Create Database** → **Blob** → **Continue**, đặt tên, ví dụ `anh-em-it-avatars`.
2. Nối vào project cho cả ba môi trường.
3. Kiểm tra: **Environment Variables** có `BLOB_READ_WRITE_TOKEN`.

## 4. Deploy lại để chạy migration

1. Tab **Deployments** → bản mới nhất → **⋯ → Redeploy**.
2. Mở build log, tìm dòng `Đã chạy migration`. Bản preview (nhánh khác `main`) in `Bỏ qua migration (không phải production)`: đúng, preview không đụng database production.
3. Ghi lại địa chỉ app dạng `https://<tên>.vercel.app` (tab **Domains**). Muốn đổi tên miền con: **Settings → Domains**.

## 5. Tạo admin đầu tiên

1. Trên Vercel: **Settings → Environment Variables** → `DATABASE_URL_UNPOOLED` → hiện giá trị và copy.
2. Ở thư mục repo trên máy, tạo file `.env.production.local` chỉ có một dòng:
   ```
   DATABASE_URL_UNPOOLED=<giá trị vừa copy>
   ```
3. Chạy `ENV_FILE=.env.production.local pnpm admin:create` rồi trả lời các câu hỏi.
4. Đăng nhập app bằng tài khoản vừa tạo. Thêm mem khác ở **Tôi → Quản lý mem**.
5. File `.env.production.local` không bao giờ được commit (đã có trong `.gitignore`). Dùng xong có thể xóa.

## 6. Bật sao lưu tự động

1. Trên GitHub: **New repository** → tên `it-badminton-backup`, chọn **Private**, **không** tick README/.gitignore/license → **Create repository**.
2. Repo vừa tạo → **Settings → Secrets and variables → Actions → New repository secret** → Name `DATABASE_URL`, Secret là giá trị `DATABASE_URL_UNPOOLED` (giống mục 5) → **Add secret**.
3. Đẩy các file sao lưu lên repo đó, từ thư mục repo mã nguồn:
   ```bash
   tmp=$(mktemp -d)
   git clone https://github.com/anhdd1901/it-badminton-backup.git "$tmp"
   mkdir -p "$tmp/.github/workflows"
   cp ops/backup/backup.sh ops/backup/commit.sh ops/backup/README.md "$tmp/"
   cp ops/backup/workflow.yml "$tmp/.github/workflows/backup.yml"
   cd "$tmp" && git add -A && git commit -m "chore: add backup workflow" && git push -u origin HEAD:main
   ```
4. Tab **Actions** → **Backup** → **Run workflow**. Chờ xanh, rồi kiểm tra có commit `backup: …` chứa `anh-em-it.sql.gz`.
5. Workflow đỏ thì GitHub gửi email. Mở log: dòng `pg_dump lỗi` thường do sai secret hoặc Neon đổi mật khẩu (xem mục 9).

## 7. Diễn tập khôi phục (vào database dev ở máy)

1. Tải `anh-em-it.sql.gz` từ repo sao lưu (bấm file → **Download raw file**).
2. Ở repo mã nguồn, `.env` đang trỏ `anh_em_it_dev`: chạy `pnpm db:up`, rồi `pnpm db:restore ~/Downloads/anh-em-it.sql.gz`, gõ `anh_em_it_dev` khi được hỏi.
3. `pnpm dev`, đăng nhập bằng tài khoản production để thấy dữ liệu.
4. Muốn dev về trạng thái sạch: `pnpm db:restore` một bản dump khác, hoặc xóa volume Docker (`docker compose down -v`, mất hết dữ liệu dev).

## 8. Khôi phục production (khi có sự cố)

Chỉ làm khi dữ liệu production bị hỏng, ví dụ xóa nhầm hoặc bug ghi sai. Neon còn có khôi phục theo thời điểm trong 6 giờ gần nhất (Neon Console → **Restore**). Sự cố mới xảy ra thì dùng cách đó trước.

1. Chọn bản sao lưu trước sự cố (lịch sử commit của repo sao lưu) và tải file về.
2. Báo các mem tạm không dùng app.
3. Dùng file `.env.production.local` như mục 5, rồi chạy `ENV_FILE=.env.production.local pnpm db:restore <file>`. Lệnh in host `…neon.tech` và tên database (thường là `neondb`); gõ đúng tên đó để xác nhận.
4. Mở app kiểm tra. Mọi phiên đăng nhập vẫn giữ nếu bản sao lưu có chúng, còn không thì mem đăng nhập lại.

## 9. Khi lộ hoặc đổi mật khẩu database

1. Neon Console → project → **Roles** → **Reset password** (hoặc làm từ Vercel → Storage → database → **Open in Neon**).
2. Vercel tự cập nhật `DATABASE_URL`/`DATABASE_URL_UNPOOLED` qua tích hợp Neon. Kiểm tra lại ở **Environment Variables**, rồi **Redeploy**.
3. Cập nhật secret `DATABASE_URL` của repo `it-badminton-backup` (mục 6.2) và chạy tay workflow để kiểm tra.
4. Lộ `BLOB_READ_WRITE_TOKEN`: Vercel → Storage → Blob store → **Settings** → tạo token mới, rồi Redeploy.
