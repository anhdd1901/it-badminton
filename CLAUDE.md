# Dự án: App lịch thi đấu câu lạc bộ cầu lông

**Đọc hết file này trước khi làm bất cứ việc gì trong dự án.** File này cho biết dự án đang ở đâu, đã chốt những gì và cần lưu ý gì. Mọi session và agent đều dựa vào nó, nên nó phải luôn đúng với hiện trạng.

Quy trình làm việc chung nằm ở `~/.claude/CLAUDE.md` (brainstorming → spec → writing-plans → thực hiện theo tdd → review → finishing). File này chỉ ghi những gì riêng của dự án.

## Cập nhật file này

- **Khi nào:** ngay khi chốt một quyết định; thêm hoặc đổi công nghệ, lệnh, cấu trúc thư mục; bắt đầu hoặc xong một giai đoạn; phát hiện điều bất ngờ mà người sau dễ vấp.
- **Cách ghi:** ghi hiện trạng, không ghi nhật ký. Thông tin cũ thì sửa hoặc xóa, không để song song với thông tin mới. Chi tiết nằm trong spec, kế hoạch hoặc ADR; ở đây chỉ tóm tắt và dẫn link. Quyết định nghiệp vụ thay đổi thì sửa spec trước, rồi sửa tóm tắt ở đây.
- **Subagent không sửa file này.** Nếu phát hiện điều cần cập nhật, ghi vào báo cáo trả về; agent điều phối sẽ cập nhật.
- Giữ file ngắn gọn, dưới khoảng 150 dòng.

## Tổng quan

Web app cho một câu lạc bộ cầu lông (hiện 10 mem): mem điểm danh cho buổi thứ 7 hằng tuần, app tự xếp lịch đánh đôi theo sơ đồ và hạt giống, admin nhập tỷ số, app tính bảng xếp hạng mùa (mỗi tháng), ELO và thống kê. Dùng trên trình duyệt điện thoại và máy tính.

## Trạng thái hiện tại

- **Giai đoạn:** brainstorming xong; spec đã viết, **chờ người dùng duyệt**.
- **Đã xong:** chốt toàn bộ yêu cầu, gồm cách tính ELO và 16 sơ đồ trận đấu; viết spec và `GLOSSARY.md`.
- **Tiếp theo:** người dùng duyệt spec → đề nghị `grilling` soi spec → `frontend-design` chốt giao diện, ghi vào spec → `writing-plans`.

## Tài liệu

- **Spec (nguồn chính cho mọi quy tắc):** `docs/superpowers/specs/2026-10-10-badminton-club-app-design.md`
- **Thuật ngữ:** `GLOSSARY.md`. Dùng đúng thuật ngữ này trong code, test và giao diện.

## Công nghệ

Next.js (App Router, TypeScript) + PostgreSQL trên Neon qua Drizzle ORM, Tailwind CSS, Vercel Blob cho avatar; deploy lên Vercel. Test: Vitest (đơn vị, tích hợp với PostgreSQL thật), Playwright (đầu cuối). Chi tiết: spec mục 6 và 10.

## Lệnh

Chưa có. Khi có, ghi lệnh cài đặt, chạy, test, lint.

## Cấu trúc thư mục

```
CLAUDE.md               file này
GLOSSARY.md             thuật ngữ nghiệp vụ
docs/superpowers/specs/ spec
docs/superpowers/plans/ kế hoạch triển khai (chưa có)
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

- Công thức chia ELO trong đội (spec 4.9, bước 4) được suy ra từ ví dụ của người dùng và đã được người dùng xác nhận. Đừng "đơn giản hóa" nó: các ví dụ kiểm chứng phải khớp đến 0,1.
- Thứ tự số trận trong lịch không phải thứ tự ra sân; chỉ dùng để sắp thứ tự tính ELO.
- Sơ đồ nằm trong file dữ liệu ở mã nguồn, không ở database. Người dùng gửi sơ đồ mới thì cập nhật file đó và Phụ lục A của spec.
