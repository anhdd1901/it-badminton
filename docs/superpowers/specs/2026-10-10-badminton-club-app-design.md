# Thiết kế: App lịch thi đấu câu lạc bộ cầu lông

- **Ngày:** 2026-10-10
- **Trạng thái:** chờ người dùng duyệt
- **Thuật ngữ:** xem `GLOSSARY.md`

## 1. Mục tiêu

Một web app cho câu lạc bộ cầu lông (hiện 10 mem) thay việc xếp lịch và tính điểm bằng tay:

- Mem điểm danh cho buổi thứ 7 hằng tuần.
- App tự xếp lịch đánh đôi theo sơ đồ cố định và hạt giống, chống việc điểm danh lại để đổi lịch.
- Admin nhập tỷ số; app tính bảng xếp hạng mùa (mỗi tháng), bảng ELO, thống kê theo mem và theo cặp.

Thành công khi: câu lạc bộ dùng app cho cả một mùa mà không cần xếp lịch hay tính điểm ngoài app, và mọi con số khớp với luật trong tài liệu này.

## 2. Phạm vi

**Trong phạm vi:** đăng nhập; quản lý mem và phân quyền; điểm danh; xếp lịch; nhập kết quả; bảng xếp hạng mùa; ELO; thống kê mem và cặp; xem lịch sử; avatar; dùng được như app trên màn hình chính điện thoại.

**Ngoài phạm vi:** tự đăng ký tài khoản; thông báo đẩy; chạy khi mất mạng; nhiều câu lạc bộ; màn hình quản lý sơ đồ; bảng vinh danh riêng; ngôn ngữ khác tiếng Việt; buổi đấu ngoài thứ 7.

## 3. Thời gian

- Mọi mốc thời gian theo giờ Việt Nam (`Asia/Ho_Chi_Minh`), lấy theo đồng hồ server.
- **Tuần:** thứ 2 00:00 → chủ nhật 23:59:59.
- **Buổi đấu** của một tuần: ngày thứ 7 của tuần đó. Mỗi thứ 7 có tối đa một buổi.
- **Cửa sổ điểm danh:** thứ 2 00:00 → thứ 7 12:00 của tuần đó.
- **Buổi đã qua:** buổi của một tuần đã kết thúc.

## 4. Quy tắc nghiệp vụ

### 4.1 Điểm danh

- Mem đang hoạt động tự điểm danh hoặc hủy cho buổi của tuần hiện tại. Admin và subadmin điểm danh hoặc hủy hộ bất kỳ mem đang hoạt động nào.
- Điểm danh chỉ thực hiện được khi buổi đang **mở**. Buổi **khóa** khi xảy ra một trong hai:
  - đã qua 12:00 thứ 7 (khóa vĩnh viễn);
  - trước 12:00 thứ 7 mà lịch chính thức của buổi có ít nhất một kết quả. Xóa hết kết quả trước 12:00 thì buổi mở lại.
- Không điểm danh được cho buổi đã qua hay buổi của tuần sau.
- Mỗi lượt điểm danh lưu: mem, người thực hiện, thời điểm.

### 4.2 Hạt giống

- Xét các mem **đang hoạt động** của cả câu lạc bộ, sắp theo ELO hiện tại giảm dần. Bằng ELO thì người tham gia câu lạc bộ sớm hơn đứng trước.
- 4 người đầu là **Hạt giống 1**, còn lại là **Hạt giống 2**.
- Hạt giống được tính tại thời điểm tạo lịch và chụp lại vào lịch. ELO thay đổi sau đó không làm lịch đã tạo thay đổi.

### 4.3 Sơ đồ

- Sơ đồ là danh sách trận, mỗi trận ghi 4 **vị trí**: `[a, b] vs [c, d]`. Toàn bộ sơ đồ ở Phụ lục A.
- Vị trí 1–4 dành cho Hạt giống 1, vị trí 5–10 dành cho Hạt giống 2. Sơ đồ có k Hạt giống 1 dùng vị trí 1…k; có n Hạt giống 2 dùng vị trí 5…(4+n).
- Riêng 5 người: một sơ đồ không phân hạt giống, vị trí 1–5.
- Sơ đồ lưu ở một file dữ liệu trong mã nguồn, được kiểm tra bằng test. Mọi sơ đồ phải thỏa: số trận bằng số người; mỗi trận có 4 vị trí khác nhau; mỗi vị trí xuất hiện đúng 4 lần; chỉ dùng đúng tập vị trí của tổ hợp đó.
- Người dùng gửi sơ đồ mới thì cập nhật file này.

### 4.4 Tạo lịch

Mỗi khi danh sách điểm danh của buổi đang mở thay đổi:

1. **Dưới 5 người:** không có lịch.
2. **Từ 5 người:** lấy **khóa danh sách** = tập id mem tham gia, đã sắp xếp.
   - Nếu buổi này đã có lịch nháp với cùng khóa: dùng lại lịch đó.
   - Nếu chưa:
     1. Tính hạt giống (4.2). Với đúng 5 người thì bỏ qua hạt giống.
     2. Đếm k Hạt giống 1 và n Hạt giống 2 tham gia, lấy sơ đồ `(k, n)` (5 người: sơ đồ 5 người).
     3. Không có sơ đồ: không tạo lịch, báo "Chưa có sơ đồ cho k Hạt giống 1 + n Hạt giống 2, liên hệ admin".
     4. Xáo ngẫu nhiên Hạt giống 1 vào vị trí 1…k và Hạt giống 2 vào vị trí 5…(4+n). Với 5 người: xáo cả 5 vào vị trí 1–5.
     5. Lưu thành **lịch nháp**: khóa danh sách, sơ đồ đã dùng, ai ở vị trí nào, hạt giống của từng người.
3. Nhiều người điểm danh cùng lúc chỉ tạo ra một lịch nháp cho mỗi khóa (ràng buộc duy nhất trong database).

**Lịch đang dùng** của buổi đang mở = lịch nháp có khóa trùng danh sách điểm danh hiện tại.

### 4.5 Lịch nháp và lịch chính thức

- **Lịch nháp** nằm ở bảng riêng, chỉ phục vụ việc dùng lại lịch trong tuần.
- **Lịch chính thức** là lịch của buổi được giữ lâu dài; kết quả gắn vào nó. Khi tạo, các trận được chép thành dữ liệu cụ thể (4 mem, số trận), không phụ thuộc file sơ đồ về sau.
- **Chốt lịch chính thức** từ lịch đang dùng khi:
  - có kết quả đầu tiên được nhập (trước 12:00 thứ 7), hoặc
  - đến 12:00 thứ 7 (nếu chưa có).
- Xóa hết kết quả trước 12:00 thứ 7: xóa lịch chính thức, buổi mở lại, lịch nháp vẫn còn.
- Lúc 12:00 thứ 7: chốt lịch chính thức (nếu có từ 5 người và có sơ đồ), rồi xóa mọi lịch nháp của buổi đó. Dưới 5 người thì buổi không có lịch.
- Việc chốt lúc 12:00 chạy khi có request đầu tiên sau mốc này; chạy nhiều lần cho kết quả như nhau.
- Lịch chính thức được giữ mãi, kể cả khi chưa có kết quả nào, để admin nhập bù.

### 4.6 Kết quả trận

- Mỗi trận một ván. Nhập một tỷ số cho hai cặp; không có hòa.
- Tỷ số hợp lệ (thắng–thua): 21–0 … 21–19; 22–20 … 29–27 (hơn đúng 2); 30–28; 30–29. Mọi tỷ số khác bị từ chối kèm lý do.
- Thứ tự nhập tự do, không cần theo số trận.
- **Ai được nhập, sửa, xóa:** buổi của tuần hiện tại: admin và subadmin. Buổi đã qua: chỉ admin.
- Trận chưa có kết quả không tính cho ai.
- Nhập trùng: nếu trận đã có kết quả trong lúc người khác đang nhập, lần lưu sau bị từ chối với thông báo "Trận này vừa được nhập a–b, hãy tải lại". Sửa cũng kiểm tra phiên bản để không ghi đè lẫn nhau.

### 4.7 Bảng xếp hạng mùa

- **Mùa** = tháng dương lịch; buổi thuộc mùa theo tháng của ngày thứ 7.
- Tính từ các trận có kết quả trong lịch chính thức của các buổi trong tháng.
- Mỗi mem trong một trận có kết quả:
  - **Thắng:** +1 nếu ở cặp thắng.
  - **Cầu thắng / cầu thua:** điểm của cặp mình / điểm của cặp đối thủ trong trận đó.
  - **Số trận:** +1.
- **Hiệu số** = cầu thắng − cầu thua.
- **Thứ tự:** thắng (nhiều trước) → hiệu số (cao trước) → cầu thắng (nhiều trước) → cầu thua (ít trước) → số trận (ít trước).
- Bằng nhau mọi tiêu chí thì **đồng hạng**, hạng kế tiếp bị bỏ qua (ví dụ 1, 1, 3).
- Chỉ hiện mem có ít nhất một trận có kết quả trong mùa, kể cả mem đã ngưng.

### 4.8 Kết thúc mùa

- Mùa kết thúc tại thời điểm **sớm hơn** trong hai mốc:
  - lúc mọi trận trong lịch chính thức của thứ 7 cuối tháng đều đã có kết quả (thời điểm của kết quả cuối cùng được nhập);
  - 12:00 thứ 7 cuối tháng.
- Mốc này chỉ quyết định: mùa hiện nhãn "Đã kết thúc", và thứ hạng của mùa được tính vào số lần hạng 1–4.
- Sửa kết quả của mùa đã kết thúc (chỉ admin) thì mọi bảng và thống kê tự tính lại.

### 4.9 ELO

**Khởi tạo và điều chỉnh**

- Admin nhập ELO ban đầu khi tạo mem (form gợi ý sẵn 1000).
- Chỉ admin sửa trực tiếp ELO hiện tại của một mem. Mỗi lần sửa lưu thành **mốc điều chỉnh**: mem, giá trị mới, người sửa, thời điểm bấm lưu.
- Mem được kích hoạt lại giữ nguyên ELO.

**Công thức cho một trận có kết quả.** Gọi R là ELO của từng người ngay trước trận.

1. ELO đội = trung bình R của 2 người. Gọi T_thắng, T_thua.
2. E(x, y) = 1 / (1 + 10^((y − x) / 400)).
3. **Tổng điểm** = 2 × 32 × (1 − E(T_thắng, T_thua)). Đội thắng được cộng tổng này, đội thua bị trừ đúng bằng nó.
4. **Chia trong đội** (làm riêng cho mỗi đội):
   - m = min(|R₁ − R₂| ÷ 2000, 1).
   - Mức của mỗi người, với T_đối là ELO đội đối thủ: đội thắng: 1 − E(R, T_đối); đội thua: E(R, T_đối).
   - p = mức của người đó ÷ tổng mức hai người.
   - Phần của người đó = Tổng × ((1 − m) × 0,5 + m × p).
5. **Làm tròn đến 0,1:** làm tròn Tổng; trong mỗi đội, làm tròn phần của người có phần lớn hơn, người còn lại nhận Tổng (đã làm tròn) trừ phần đó. Tổng thay đổi của 4 người luôn bằng 0.

Chỉ tính thắng/thua, không tính cách biệt tỷ số.

**Ví dụ kiểm chứng** (làm test):

| Trận | Kết quả mong đợi |
|---|---|
| 1000+1000 thắng 1000+1000 | +16,0 / +16,0 / −16,0 / −16,0 |
| 1100+1100 thắng 1000+1000 | +11,5 / +11,5 / −11,5 / −11,5 |
| A750+B1200 thắng C1100+D980 | A +21,1, B +16,8, C −19,1, D −18,8 (tổng 37,9) |
| C1100+D980 thắng A750+B1200 | C +12,9, D +13,2, A −11,2, B −14,9 (tổng 26,1) |

**Tính lại**

- ELO hiện tại không lưu mà tính lại từ đầu mỗi khi cần: bắt đầu từ ELO ban đầu, rồi áp lần lượt các sự kiện theo thời gian.
- **Sự kiện trận:** mỗi trận có kết quả, đặt tại 12:00 ngày thứ 7 của buổi. Các trận cùng buổi xếp theo số trận.
- **Sự kiện điều chỉnh:** đặt tại thời điểm bấm lưu; đặt ELO của mem đó bằng giá trị mới.
- Sự kiện điều chỉnh và sự kiện trận cùng thời điểm: điều chỉnh trước.
- **ELO hiện tại** = kết quả sau khi áp mọi sự kiện đã có, kể cả trận của buổi hôm nay được nhập trước 12:00.
- Mem đã ngưng vẫn được tính ELO qua các trận cũ, nhưng không xuất hiện trên bảng ELO và không tham gia xếp hạt giống.

**Bảng ELO:** mem đang hoạt động, ELO một chữ số thập phân, hạt giống hiện tại, thay đổi ở buổi gần nhất mà người đó có trận có kết quả (ví dụ ▲ 16,8).

### 4.10 Thống kê

**Theo mem:** các cột như bảng xếp hạng mùa (thắng, hiệu số, cầu thắng, cầu thua, số trận), cộng thêm số lần đạt hạng 1, 2, 3, 4 trong các mùa đã kết thúc. Sắp theo cùng thứ tự với bảng xếp hạng mùa.

**Theo cặp:** mỗi dòng là một cặp (không phân thứ tự) đã đánh chung ít nhất một trận có kết quả. Cùng các cột và cách sắp như bảng xếp hạng mùa; không có cột hạng.

**Bộ lọc** (cả hai màn):

- Khoảng thời gian: từ tháng — đến tháng, mặc định toàn bộ. Số lần hạng 1–4 chỉ tính các mùa đã kết thúc nằm trong khoảng.
- Mem: theo mem chỉ hiện mem đó; theo cặp hiện các cặp có mem đó.

## 5. Tài khoản, đăng nhập và phân quyền

### 5.1 Tài khoản

- **Username:** 3–30 ký tự `a–z 0–9 . _`, không phân biệt hoa thường (lưu dạng chữ thường), không trùng (kiểm tra khi tạo và khi đổi). Chỉ admin đổi được.
- **Tên hiển thị:** 1–50 ký tự, được phép trùng. Admin hoặc chính mem đó đổi được.
- **Mật khẩu:** tối thiểu 8 ký tự, lưu dạng băm một chiều.
- **Avatar:** không bắt buộc; JPG/PNG/WEBP tối đa 5 MB; tự cắt vuông và thu nhỏ còn 256×256; lưu trên Vercel Blob; xóa được. Admin hoặc chính mem đó đổi được. Không có avatar: chữ cái đầu viết hoa của tên hiển thị (giữ dấu, ví dụ "Đ"), trên nền màu cố định suy ra từ id của mem.
- Ở chỗ chọn người (điểm danh hộ, quản lý mem), hiện kèm username: "Minh (@minh.nt)".
- Mem được ghi nhận ngày tham gia (ngày tạo), dùng để phân định hạt giống khi bằng ELO.

### 5.2 Đăng nhập

- Username + mật khẩu. Phiên đăng nhập lưu ở server (token ngẫu nhiên, cookie `HttpOnly`, `Secure`, `SameSite=Lax`; database chỉ lưu bản băm của token). Phiên không hết hạn; chỉ kết thúc khi mem đăng xuất hoặc bị vô hiệu.
- **Vô hiệu phiên:**
  - mem bị ngưng hoạt động: mọi phiên;
  - mem tự đổi mật khẩu: mọi phiên khác phiên hiện tại;
  - admin đặt lại mật khẩu: mọi phiên của mem đó.
- Phiên bị vô hiệu không bị đẩy ra real-time: request tiếp theo trả 401, giao diện xóa trạng thái và về màn đăng nhập.
- **Chống dò mật khẩu:** sai 5 lần liên tiếp với một username thì username đó tạm khóa đăng nhập 15 phút.
- **Admin đầu tiên** được tạo bằng một lệnh khởi tạo chạy một lần. Không có màn tự đăng ký.

### 5.3 Vai trò và quyền

Mọi vai trò đều là mem thi đấu. Luôn có đúng một admin.

| Việc | Mem | Subadmin | Admin |
|---|:-:|:-:|:-:|
| Xem lịch, kết quả, bảng xếp hạng, ELO, thống kê, lịch sử | ✅ | ✅ | ✅ |
| Tự điểm danh hoặc hủy | ✅ | ✅ | ✅ |
| Tự đổi mật khẩu, tên hiển thị, avatar của mình | ✅ | ✅ | ✅ |
| Điểm danh hoặc hủy hộ (buổi tuần này) | | ✅ | ✅ |
| Nhập, sửa, xóa kết quả buổi tuần này | | ✅ | ✅ |
| Nhập, sửa, xóa kết quả buổi đã qua | | | ✅ |
| Thêm mem (tên hiển thị, username, mật khẩu, ELO ban đầu, avatar tùy chọn) | | | ✅ |
| Ngưng hoặc kích hoạt lại mem | | | ✅ |
| Đặt lại mật khẩu, đổi username, tên hiển thị, avatar của người khác | | | ✅ |
| Sửa ELO hiện tại (tạo mốc điều chỉnh) | | | ✅ |
| Đặt hoặc gỡ subadmin | | | ✅ |
| Chuyển quyền admin | | | ✅ |

- **Admin không bị ngưng hoạt động.**
- **Chuyển quyền admin:** chỉ cho mem đang hoạt động (mem thường hoặc subadmin); admin phải nhập lại mật khẩu. Sau đó người nhận là admin (mất vai trò subadmin nếu có), người chuyển thành mem thường.
- Mọi kiểm tra quyền thực hiện ở server; giao diện chỉ ẩn những nút không có quyền.

## 6. Kiến trúc và công nghệ

### 6.1 Thư viện và công cụ

Phiên bản ghi là bản mới nhất trên npm ngày 2026-10-10, để tham khảo. Phiên bản chính xác được khóa trong `package.json` và `pnpm-lock.yaml` khi khởi tạo dự án; ưu tiên tổ hợp mà Next.js chính thức hỗ trợ.

| Hạng mục | Lựa chọn | Phiên bản | Dùng để |
|---|---|---|---|
| Runtime | Node.js | 22 LTS | chạy local và trên Vercel |
| Quản lý gói | pnpm | 12 | cài thư viện, chạy script |
| Ngôn ngữ | TypeScript, chế độ `strict` | bản Next.js hỗ trợ | toàn bộ mã nguồn |
| Framework | Next.js (App Router, Server Components, Server Actions) | 16.x | giao diện + server trong một dự án |
| UI | React | 19.x | |
| CSS | Tailwind CSS | 4.x | giao diện responsive |
| Thành phần UI | shadcn/ui (dựa trên Radix UI) | CLI 4.x | popup, tabs, chọn tháng, form, thông báo: chép mã vào dự án, tùy biến theo thiết kế |
| Icon | lucide-react | 1.x | |
| Font | `next/font` | có sẵn trong Next.js | tự host font, không tải từ Google lúc chạy |
| Database | PostgreSQL | 17 (local), Neon (production) | |
| Driver | `postgres` (postgres.js) | 3.x | kết nối PostgreSQL, dùng chung cho local và Neon |
| ORM và migration | Drizzle ORM + drizzle-kit | 0.45.x / 0.31.x | định nghĩa bảng, truy vấn có kiểu, sinh migration |
| Kiểm tra dữ liệu | Zod | 4.x | kiểm tra input của mọi server action và form |
| Băm mật khẩu | `@node-rs/argon2` | 2.x | argon2id |
| Phiên đăng nhập | `node:crypto` | có sẵn | sinh token ngẫu nhiên, băm SHA-256 để lưu |
| Thời gian | date-fns + `@date-fns/tz` | 4.x / 1.x | tính tuần, 12:00 thứ 7, tháng theo giờ Việt Nam |
| Ngẫu nhiên | tự viết (`crypto` khi chạy thật, bộ sinh có seed khi test) | | xáo vị trí khi tạo lịch |
| Ảnh | sharp | 0.35.x | cắt vuông, thu nhỏ avatar 256×256 |
| Lưu file | `@vercel/blob` | 2.x | lưu avatar |
| PWA | `app/manifest.ts` của Next.js | có sẵn | thêm vào màn hình chính; không dùng service worker |
| Script | tsx | 4.x | chạy lệnh khởi tạo admin, seed dữ liệu |
| Test đơn vị và tích hợp | Vitest | 5.x | lõi quy tắc; lớp nghiệp vụ với PostgreSQL thật |
| Test giao diện thành phần | @testing-library/react | 16.x | chỉ cho thành phần có logic (ô nhập tỷ số, bộ lọc) |
| Test đầu cuối | Playwright | 1.64.x | các luồng chính trên trình duyệt |
| PostgreSQL cho dev và test | Docker (`postgres:17`) | | database local và database test tách riêng |
| Lint, format | ESLint (cấu hình của Next.js) + Prettier | 10.x / 3.x | |
| Hosting | Vercel (gói Hobby) | | deploy từ git |

**Không dùng:** thư viện auth bên ngoài (NextAuth/Auth.js…), vì đăng nhập username/mật khẩu với phiên ở server đơn giản hơn tự viết; thư viện quản lý state hay React Query, vì dữ liệu đọc qua Server Components; service worker.

### 6.2 Biến môi trường

| Biến | Dùng để |
|---|---|
| `DATABASE_URL` | chuỗi kết nối PostgreSQL (Neon ở production, Docker ở local) |
| `DATABASE_URL_TEST` | database dành riêng cho test tích hợp |
| `BLOB_READ_WRITE_TOKEN` | quyền ghi Vercel Blob |

### 6.3 Tổ chức mã nguồn

Ba lớp:

1. **Lõi quy tắc** (`src/domain/`): hàm TypeScript thuần, không đụng database hay giao diện: kiểm tra tỷ số, bảng xếp hạng, hạt giống, sơ đồ và tạo lịch (nhận bộ sinh số ngẫu nhiên làm tham số), ELO, mốc thời gian (tuần, cửa sổ điểm danh, kết thúc mùa), thống kê.
2. **Lớp nghiệp vụ** (server actions và route handlers): xác thực, kiểm tra quyền, giao dịch database, áp quy tắc khóa/mở, chốt lịch.
3. **Giao diện**.

Mọi số liệu tổng hợp (bảng xếp hạng, ELO, hạt giống hiện tại, thống kê, trạng thái khóa, kết thúc mùa) đều tính ra từ dữ liệu gốc, không lưu riêng.

## 7. Dữ liệu

| Bảng | Nội dung chính | Ràng buộc |
|---|---|---|
| `members` | tên hiển thị, username, mật khẩu băm, vai trò (`admin`/`subadmin`/`member`), đang hoạt động, ELO ban đầu, URL avatar, ngày tạo | username duy nhất; đúng một `admin` |
| `auth_sessions` | mem, băm token, thời điểm tạo, thời điểm dùng gần nhất | |
| `login_attempts` | username, số lần sai liên tiếp, khóa đến lúc nào | |
| `match_days` | ngày thứ 7 | ngày duy nhất |
| `attendances` | buổi, mem, người thực hiện, thời điểm | (buổi, mem) duy nhất |
| `draft_schedules` | buổi, khóa danh sách, mã sơ đồ, gán vị trí (mem → vị trí, hạt giống), thời điểm tạo | (buổi, khóa) duy nhất |
| `official_schedules` | buổi, mã sơ đồ, gán vị trí, thời điểm chốt | mỗi buổi tối đa một |
| `scheduled_matches` | lịch chính thức, số trận, 2 mem cặp A, 2 mem cặp B | (lịch, số trận) duy nhất |
| `match_results` | trận, điểm cặp A, điểm cặp B, người nhập, thời điểm, phiên bản | mỗi trận tối đa một |
| `elo_adjustments` | mem, giá trị mới, người sửa, thời điểm | |

Sơ đồ không nằm trong database mà ở file dữ liệu trong mã nguồn (4.3).

## 8. Màn hình

Tiếng Việt; thiết kế cho điện thoại trước. Điện thoại: thanh điều hướng ở đáy; máy tính: menu bên. Màu sắc, font và bố cục chi tiết sẽ làm bằng `frontend-design` trước khi lập kế hoạch.

| Màn | Nội dung |
|---|---|
| **Đăng nhập** | username, mật khẩu |
| **Buổi tuần này** (trang chủ) | ngày, trạng thái (đang mở / đã khóa / đã đóng lúc 12:00); "đã điểm danh / tổng mem đang hoạt động", bấm vào mở popup danh sách (avatar + tên; admin và subadmin điểm danh hoặc hủy hộ tại đây); nút điểm danh hoặc hủy; lịch các trận (số trận, hai cặp, tỷ số, ô trống nếu chưa nhập); admin và subadmin nhập hoặc sửa tỷ số ngay tại trận, có nút "Xóa hết kết quả buổi này". Dưới 5 người: "Chưa đủ người để xếp lịch (cần ít nhất 5, hiện có N)". Không có sơ đồ: thông báo ở 4.4. |
| **Bảng xếp hạng** | chọn tháng (mặc định tháng hiện tại); nhãn "Đang diễn ra" / "Đã kết thúc"; các cột ở 4.7 |
| **ELO** | 4.9 |
| **Thống kê** | tab Theo mem / Theo cặp; bộ lọc 4.10 |
| **Lịch sử** | danh sách buổi theo tháng; chi tiết buổi: người tham gia, lịch, kết quả; admin sửa kết quả tại đây |
| **Cá nhân** | đổi tên hiển thị, avatar, mật khẩu; đăng xuất |
| **Quản lý mem** (admin) | danh sách (lọc đang hoạt động / đã ngưng); thêm; sửa; ngưng / kích hoạt; đặt lại mật khẩu; sửa ELO; đặt / gỡ subadmin; chuyển quyền admin |

## 9. Xử lý lỗi

- Lỗi nhập liệu: thông báo cụ thể bằng tiếng Việt ngay tại ô nhập (ví dụ "Tỷ số 23–20 không hợp lệ: từ 22 điểm trở lên phải thắng cách đúng 2"; "Username đã có người dùng").
- 401: giao diện về màn đăng nhập. 403: "Bạn không có quyền làm việc này".
- Thao tác trên buổi đã khóa: "Buổi đấu đã khóa, không thể thay đổi điểm danh".
- Xung đột khi nhập hoặc sửa kết quả: 4.6.
- Database khởi động chậm: hiện khung đang tải, không để màn trắng.
- Lỗi không lường trước: thông báo chung, ghi log ở server.

## 10. Kiểm thử

| Loại | Phạm vi | Công cụ |
|---|---|---|
| Đơn vị (TDD, nhiều nhất) | toàn bộ lõi quy tắc: mọi biên tỷ số (21–19, 21–20, 22–20, 23–20, 29–27, 30–28, 30–29, 31–29…); thứ tự xếp hạng, đồng hạng, ít trận xếp trên; hạt giống và phân định bằng ELO; tính hợp lệ của mọi sơ đồ; tạo lịch với bộ sinh ngẫu nhiên cố định, gồm trường hợp 5 người và thiếu sơ đồ; khóa danh sách và dùng lại lịch; mốc tuần, 12:00 thứ 7, kết thúc mùa; ELO theo bảng ví dụ 4.9, làm tròn, mốc điều chỉnh, tính lại sau khi sửa trận cũ; thống kê mem, cặp, số lần hạng 1–4 | Vitest |
| Tích hợp | lớp nghiệp vụ với PostgreSQL thật: toàn bộ bảng quyền 5.3; vô hiệu phiên; khóa đăng nhập; chốt và hủy chốt lịch; dùng lại lịch qua nhiều lần điểm danh; tạo lịch đồng thời; xung đột nhập kết quả; chuyển quyền admin | Vitest + PostgreSQL test |
| Đầu cuối | đăng nhập → điểm danh đủ 5 người → có lịch → nhập kết quả → buổi khóa → bảng xếp hạng và ELO cập nhật; quản lý mem cơ bản | Playwright; `agent-browser` để kiểm tra bằng mắt |

## 11. Câu hỏi mở

Không còn câu hỏi mở. Sơ đồ cho các tổ hợp cần từ 7 Hạt giống 2 trở lên chưa có; người dùng sẽ gửi khi câu lạc bộ đông hơn.

## Phụ lục A. Sơ đồ trận đấu

Ký hiệu `a+b/c+d`: cặp vị trí a, b đánh với cặp vị trí c, d. Thứ tự trong dòng là số trận 1, 2, 3… Tiêu đề: số người · số Hạt giống 1 + số Hạt giống 2.

```
5 (không phân):  2+3/4+5  1+4/3+5  1+5/2+4  1+3/2+5  1+2/3+4
6 · 0+6:  5+6/7+8   5+7/9+10  6+9/8+10  5+10/6+7  5+9/6+8   7+10/8+9
6 · 1+5:  1+5/6+7   1+6/8+9   5+8/7+9   1+7/6+9   1+8/5+7   5+9/6+8
6 · 2+4:  1+5/2+6   1+7/2+8   5+6/7+8   1+6/2+5   1+8/2+7   5+7/6+8
6 · 3+3:  1+6/3+7   2+7/3+5   1+2/5+6   1+3/5+7   1+7/2+6   2+5/3+6
6 · 4+2:  1+2/3+4   1+5/2+6   3+5/4+6   1+3/2+4   1+6/2+5   3+6/4+5
7 · 1+6:  1+8/5+10  1+6/8+9   5+7/9+10  1+5/6+7   6+9/8+10  5+9/7+10  1+7/6+8
7 · 2+5:  1+6/2+7   5+7/8+9   1+5/2+6   6+8/7+9   1+9/2+5   5+6/7+8   1+8/2+9
7 · 3+4:  1+5/2+6   1+7/3+8   2+5/3+6   1+8/2+7   1+6/3+7   2+8/3+5   5+6/7+8
7 · 4+3:  1+2/3+4   1+6/2+7   3+5/4+7   1+5/2+6   3+7/4+6   1+7/4+5   2+5/3+6
8 · 2+6:  5+6/7+10  1+8/2+9   5+7/6+10  1+9/2+8   1+7/2+10  5+10/8+9  1+5/2+6  6+8/7+9
8 · 3+5:  1+7/3+8   1+6/2+9   5+6/7+8   2+8/3+9   5+7/6+9   1+8/2+5   1+9/3+6  2+7/3+5
8 · 4+4:  1+2/3+4   5+6/7+8   1+3/2+4   5+7/6+8   2+5/4+7   1+6/3+8   3+7/4+8  1+5/2+6
9 · 3+6:  1+6/2+10  1+7/3+8   5+7/9+10  2+8/3+10  5+6/7+8   1+10/3+9  1+5/2+6  2+9/3+7  5+9/6+8
9 · 4+5:  1+5/3+6   2+7/4+8   1+6/2+9   5+6/7+8   1+3/2+4   5+8/7+9   1+2/3+4  5+7/6+9  3+8/4+9
10 · 4+6: 1+3/2+4   6+7/9+10  1+5/3+8   2+6/4+7   5+10/8+9  1+4/2+3   5+8/6+9  1+7/4+10 2+8/3+9  5+6/7+10
```

Tổ hợp chưa có sơ đồ: 7 · 0+7; 8 · 0+8, 1+7; 9 · 0+9, 1+8, 2+7; 10 · 0+10 … 3+7; mọi tổ hợp từ 11 người.
