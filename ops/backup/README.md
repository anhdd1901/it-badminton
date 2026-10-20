# Sao lưu ANH EM IT

**Repo này phải để riêng tư.** File sao lưu chứa toàn bộ dữ liệu của câu lạc bộ, kể cả bản băm mật khẩu.

## Có gì ở đây

- `anh-em-it.sql.gz`: bản sao lưu mới nhất của database production (`pg_dump` dạng SQL, nén gzip). Các bản cũ nằm trong lịch sử commit.
- `backup.sh`, `commit.sh`: script tạo và commit bản sao lưu.
- `.github/workflows/backup.yml`: chạy sao lưu mỗi **chủ nhật 23:17** giờ Việt Nam. Tuần nào dữ liệu không đổi thì không có commit mới.

Bản gốc của các file này nằm ở `ops/backup/` trong repo mã nguồn `it-badminton`. Sửa ở đó trước rồi chép sang đây.

## Chạy tay

Tab **Actions** → **Backup** → **Run workflow** → **Run workflow**.

## Khôi phục

1. Mở commit của bản cần dùng, bấm vào `anh-em-it.sql.gz` → **Download raw file**.
2. Trong repo mã nguồn, chạy `pnpm db:restore <đường-dẫn-file>` (xem `docs/ops/runbook.md`, mục 7 và 8). Lệnh sẽ hỏi tên database trước khi ghi đè.

Lưu ý: chỉ khôi phục được các bản sao lưu từ commit có script hiện tại (dump chỉ gồm schema `public` và `drizzle`). Bản dump toàn database do phiên bản script cũ tạo ra sẽ bị từ chối và được hoàn tác, không làm hỏng database đích.

## Secret

- `DATABASE_URL`: chuỗi kết nối **trực tiếp** tới Neon (giá trị `DATABASE_URL_UNPOOLED` trên Vercel). Đổi mật khẩu Neon thì cập nhật secret này.
