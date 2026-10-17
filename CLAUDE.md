# Dự án: ANH EM IT, app lịch thi đấu câu lạc bộ cầu lông

**Đọc hết file này trước khi làm bất cứ việc gì trong dự án.** File này chỉ chứa thông tin tĩnh. Trạng thái và tiến độ không ghi ở đây: xem git, các file kế hoạch (`- [x]`) và context claude-mem, theo mục *Ghi nhớ giữa các session* trong `~/.claude/CLAUDE.md`.

**Bản này trên `master` đã cũ.** Code và CLAUDE.md đầy đủ nằm ở nhánh `worktree-plan-1-foundation-domain` (worktree `.claude/worktrees/plan-1-foundation-domain`, chưa merge). Làm việc ở đó.

Quy trình làm việc chung nằm ở `~/.claude/CLAUDE.md`. File này chỉ ghi những gì riêng của dự án.

## Tổng quan

Web app cho một câu lạc bộ cầu lông (hiện 10 mem): mem điểm danh cho buổi thứ 7 hằng tuần, app tự xếp lịch đánh đôi theo sơ đồ và hạt giống, admin nhập tỷ số, app tính bảng xếp hạng mùa (mỗi tháng), ELO và thống kê. Dùng trên trình duyệt điện thoại và máy tính.

## Tài liệu

- **Spec (nguồn chính cho mọi quy tắc):** `docs/superpowers/specs/2026-10-10-badminton-club-app-design.md`
- **Thuật ngữ:** `GLOSSARY.md`. Dùng đúng thuật ngữ này trong code, test và giao diện.

## Công nghệ

Node 22, pnpm, TypeScript strict. Next.js 16 (App Router) + React 19, Tailwind 4, shadcn/ui, lucide-react. PostgreSQL (Neon ở production, Docker `postgres:17` ở local) qua postgres.js + Drizzle. Zod, argon2, date-fns + `@date-fns/tz`, sharp + Vercel Blob. Test: Vitest, Testing Library, Playwright. Deploy lên Vercel. Không dùng thư viện auth ngoài. Bảng đầy đủ và biến môi trường: spec mục 6.

## Lệnh

Chưa có. Khi có, ghi lệnh cài đặt, chạy, test, lint.

## Cấu trúc thư mục

```
CLAUDE.md               file này
GLOSSARY.md             thuật ngữ nghiệp vụ
docs/superpowers/specs/ spec
docs/design/            prompt Stitch (không dùng nữa, để tham khảo)
src/fonts/              font tự host (Be Vietnam Pro)
docs/superpowers/plans/ kế hoạch triển khai
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

- Người dùng đã có tài khoản GitHub nhưng chưa đưa code lên. Khi tới bước cần GitHub (đẩy code, repo sao lưu riêng tư, GitHub Secrets cho sao lưu ở spec 6.5), nhắc và hướng dẫn người dùng từng bước.
- Không có tính năng đánh thay: kết quả luôn tính cho người có tên trong lịch (spec 4.6).
- Công thức chia ELO trong đội (spec 4.9, bước 4) được suy ra từ ví dụ của người dùng và đã được người dùng xác nhận. Đừng "đơn giản hóa" nó: các ví dụ kiểm chứng phải khớp đến 0,1.
- Thứ tự số trận trong lịch không phải thứ tự ra sân; chỉ dùng để sắp thứ tự tính ELO.
- Sơ đồ nằm trong file dữ liệu ở mã nguồn, không ở database. Người dùng gửi sơ đồ mới thì cập nhật file đó và Phụ lục A của spec.
