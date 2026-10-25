# Thuật ngữ

Dùng đúng các thuật ngữ này trong code, test, spec và giao diện. Tên tiếng Anh trong ngoặc là tên dùng trong code.

- **Mem** (`member`): thành viên câu lạc bộ có tài khoản. Mọi vai trò đều là mem thi đấu.
- **Vai trò** (`role`): `admin` (đúng một người), `subadmin`, `member` (mem thường).
- **Mem đang hoạt động / đã ngưng** (`active`): mem đã ngưng không đăng nhập, không điểm danh, không xếp hạt giống; dữ liệu cũ giữ nguyên.
- **Buổi đấu** (`match day`): buổi thi đấu ngày thứ 7 của một tuần.
- **Tuần**: thứ 2 00:00 → chủ nhật 23:59:59, giờ Việt Nam.
- **Buổi đã qua**: buổi của một tuần đã kết thúc.
- **Điểm danh** (`attendance`): mem đăng ký tham gia buổi đấu. Mở từ thứ 2 đến 12:00 thứ 7.
- **Buổi mở / khóa**: buổi khóa khi đã qua 12:00 thứ 7, hoặc lịch chính thức đã có kết quả.
- **Hạt giống 1 / Hạt giống 2** (`seed 1`, `seed 2`): 4 mem đang hoạt động có ELO cao nhất là Hạt giống 1, còn lại Hạt giống 2.
- **Sơ đồ** (`diagram`): danh sách trận theo vị trí cho một tổ hợp (số Hạt giống 1, số Hạt giống 2), hoặc cho 5 người.
- **Vị trí** (`slot`): số trên sơ đồ. 1–4 cho Hạt giống 1, 5–10 cho Hạt giống 2.
- **Khóa danh sách** (`attendee key`): tập id mem tham gia đã sắp xếp; dùng để nhận ra danh sách đã từng có lịch.
- **Lịch nháp** (`draft schedule`): lịch tạo trong tuần cho một khóa danh sách; xóa lúc 12:00 thứ 7.
- **Lịch đang dùng**: lịch nháp có khóa trùng danh sách điểm danh hiện tại.
- **Lịch chính thức** (`official schedule`): lịch được chốt của buổi, giữ mãi; kết quả gắn vào đây.
- **Trận** (`scheduled match`): một trận đánh đôi trong lịch chính thức, có số trận.
- **Kết quả** (`match result`): tỷ số một ván của một trận.
- **Đổi người trong trận** (`change match players`): admin thay người trong các cặp của một trận thuộc lịch chính thức, chỉ chọn trong những người có tên trong lịch đó; không phải ghi nhận đánh thay.
- **Mùa** (`season`): một tháng dương lịch, theo ngày thứ 7 của buổi.
- **Kết thúc mùa**: khi mọi trận của thứ 7 cuối tháng có kết quả, hoặc 12:00 thứ 7 đó, mốc nào sớm hơn.
- **Bảng xếp hạng mùa** (`season standings`): xếp hạng mem trong một mùa.
- **Hiệu số**: cầu thắng − cầu thua.
- **ELO** (`elo`): điểm trình độ, giữ qua các mùa, tính lại từ toàn bộ kết quả.
- **Mốc điều chỉnh ELO** (`elo adjustment`): lần admin đặt ELO của một mem về giá trị mới, tại thời điểm bấm lưu.
