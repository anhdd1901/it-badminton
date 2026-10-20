# Việc tồn đọng

Lỗi nhỏ và việc hoãn lại (`minor (deferred)`) do reviewer nêu. Agent điều phối ghi vào ngay khi có; xử lý xong thì xóa dòng. Đây là nguồn duy nhất cho việc tồn đọng (claude-mem không bảo đảm nhớ đủ danh sách).

- **Kế hoạch 3 nên làm:** tên mem thiếu hiển thị chuỗi rỗng (`views/`); thông báo tuần đếm cả mem đã ngưng có điểm danh.
- **Đồng thời (hiếm):** ngưng mem có điểm danh vào sáng thứ 7 đã khóa rồi xóa hết kết quả → `NO_DIAGRAM` tới lần điểm danh sau; dữ liệu màn hình không đọc trong một snapshot.
- **Test còn thiếu:** biên ngày qua tháng 12→1 và tháng 2, `parseYmd` không kiểm tra; chỉ trận 1 của sơ đồ 10-4-6 được ghim; `canChangeAttendance` ngoài tuần và sau 12:00; podium hạng 2–4; các nhánh lỗi `deleteResult`/`updateResult`, `finalizeDue` chạy đồng thời; rollback khi bị từ chối.
- **Vệ sinh:** output `test:int` có NOTICE `__drizzle_migrations`; `endedSeasons` tải dữ liệu hai lần.
- **Giao diện (plan-3/task-1, minor):** biến `--accent` của shadcn trùng tên token cam, component shadcn thêm sau (dropdown-menu, select) sẽ có nền hover cam; mô tả toast của sonner màu cố định `#3f3f3f` (khó đọc ở theme tối) nếu dùng `description`; `.prettierignore` loại cả `docs/`, `CLAUDE.md`, `GLOSSARY.md`, `src/components/ui`; `pnpm-workspace.yaml` chặn build script của esbuild; `sonner.tsx` còn một dòng trắng thừa.
- **Cần người dùng xác nhận (plan-3/task-2):** số lần nhập sai mật khẩu bị quên sau 24 giờ không sai thêm (dọn `login_attempts`); spec 5.2 chỉ ghi "5 lần liên tiếp". Đồng ý thì ghi vào spec 5.2.
- **Đăng nhập/quản trị (plan-3/task-2, minor):** test race dùng `sleep` 400–800 ms, máy quá chậm thì test mất khả năng bắt lỗi (nên dò `pg_locks`); `safeErrorSummary` bỏ qua `cause.code` khi `e.code` không phải chuỗi; `setActive(false)` giờ chạy `finalizeDue` trước khi báo lỗi mem không tồn tại/admin.
