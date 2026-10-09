# Prompt thiết kế giao diện cho Stitch

File này dùng để nhờ [Stitch](https://stitch.withgoogle.com) thiết kế giao diện app. Prompt viết bằng tiếng Anh vì Stitch hiểu tiếng Anh tốt nhất; mọi chữ hiển thị trên giao diện để nguyên tiếng Việt trong dấu ngoặc kép.

## Cách dùng

1. Tạo project mới trong Stitch, chọn **Mobile**.
2. Dán **Prompt 0** trước để Stitch nắm bối cảnh và phong cách chung.
3. Dán lần lượt từng prompt màn hình (1 → 10), **mỗi lần một prompt**. Nếu Stitch quên phong cách, dán lại khối "Shared context" của Prompt 0 lên đầu prompt màn hình.
4. Chỉnh từng màn bằng câu ngắn, mỗi lần một thay đổi (ví dụ: "Make the vs badge smaller").
5. Khi xong bản điện thoại, dùng **Prompt 11** để làm bản máy tính.
6. Xuất ra Figma hoặc HTML, hoặc chụp màn hình, rồi gửi lại cho Claude để ghi thiết kế vào spec trước khi lập kế hoạch.

Nguồn quy tắc: `docs/superpowers/specs/2026-10-10-badminton-club-app-design.md`. Nếu thiết kế của Stitch thêm tính năng không có trong spec (thông báo, chat, thanh toán…), bỏ qua những phần đó.

---

## Prompt 0: Shared context

```
Design a mobile-first web app called "ANH EM IT" (also installable to the phone home screen) for a small badminton club in Vietnam. All UI text is Vietnamese. About 10 members use it every week.

What the app does:
- Every Saturday the club plays one session of doubles. From Monday to 12:00 Saturday, members check in ("Điểm danh") for that Saturday.
- When at least 5 members have checked in, the app automatically generates the session's match list from fixed templates. Each match is "Player + Player vs Player + Player". Every player plays exactly 4 matches. Matches can be played in any order.
- Members are split into two seed groups: "Hạt giống 1" (top 4 by ELO) and "Hạt giống 2" (everyone else).
- Admins enter one score per match (badminton to 21, win by 2, cap at 30, e.g. 21–17, 24–22, 30–29).
- The app computes a monthly season ranking ("Bảng xếp hạng"), an ELO rating that carries over across seasons, and statistics per member and per pair.
- Roles: "Admin" (one person, manages everything), "Subadmin" (can check in for others and enter scores for this week's session), "Mem" (views data and checks in for themselves). Everyone is also a player.

Design direction:
- Feel: a lively community sports club, not a corporate SaaS dashboard. Think badminton court lines, shuttlecock, Saturday-morning energy. Friendly and clear, readable at a glance while standing on court.
- The signature element is the match card: two pairs facing each other with a dark round "vs" badge between them, and the score next to it. Make this the most memorable part of the design; keep everything around it calm.
- Existing visual language to keep: warm cream background for match cards; "Hạt giống 1" shown in blue, "Hạt giống 2" shown in green (soft tinted chips with colored text); a dark circular "vs" badge.
- Avoid: generic purple gradients, identical floating cards with heavy shadows everywhere, ALL-CAPS labels above every heading, decorative numbering, emoji as icons.
- Avatars: round photo, or the uppercase first letter of the display name (keep Vietnamese diacritics, e.g. "Đ") on a solid color that is unique per member.
- Numbers (scores, ELO, points) use tabular figures so columns line up. Vietnamese number format: decimal comma (1182,4).
- Accessible: good contrast, tap targets at least 44px, visible focus states.
- Navigation: bottom tab bar with 5 tabs: "Tuần này", "Xếp hạng", "Thống kê", "Lịch sử", "Tôi".

Sample data to use everywhere (display name, ELO, seed):
Tuấn 1182,4 (Hạt giống 1), Minh 1120,0 (Hạt giống 1), Hoàng 1096,8 (Hạt giống 1), Đức 1051,3 (Hạt giống 1),
Quang 1012,5 (Hạt giống 2), Long 998,0 (Hạt giống 2), Nam 975,6 (Hạt giống 2), Hải 950,2 (Hạt giống 2),
Phong 931,7 (Hạt giống 2), Trung 904,1 (Hạt giống 2).
There are two members both named "Minh" in some lists; the second is "Minh" (@minh.le), so avatars and usernames must tell them apart.
```

---

## Prompt 1: Đăng nhập

```
Screen: login.
- App name "ANH EM IT" (the club's name; keep exactly this uppercase spelling) with a simple badminton-themed mark.
- Fields: "Tên đăng nhập", "Mật khẩu" (with show/hide toggle). Button "Đăng nhập".
- Small note under the form: "Tài khoản do admin cấp. Quên mật khẩu? Liên hệ admin."
- Error state example below the form: "Sai tên đăng nhập hoặc mật khẩu".
- Second variant: "Đăng nhập tạm khóa 15 phút do nhập sai quá nhiều lần".
No sign-up link.
```

## Prompt 2: Tuần này, mem thường, có lịch

```
Screen: "Tuần này" (home), seen by a regular member, session open.
- Header: "Thứ 7, 17/10" and status chip "Đang mở điểm danh · đóng lúc 12:00 thứ 7".
- A tappable counter "Đã điểm danh 7/10" (tapping opens the attendee list).
- Primary button "Điểm danh" when not checked in; when checked in it becomes a quieter "Hủy điểm danh" with a "Bạn đã điểm danh" confirmation.
- Match list "Lịch thi đấu · 7 trận". Each match card: "Trận 01", pair A (two avatars + names) vs pair B, and a score area. Show seed color on each player chip (blue = Hạt giống 1, green = Hạt giống 2).
- Some matches have scores (e.g. Trận 02: Tuấn + Nam 21–17 Hoàng + Hải, winners highlighted), others show an empty score "– –".
- Matches for 7 players (Tuấn, Minh, Hoàng, Quang, Long, Nam, Hải):
  Trận 01 Tuấn + Quang vs Minh + Long
  Trận 02 Tuấn + Nam vs Hoàng + Hải  (21–17)
  Trận 03 Minh + Quang vs Hoàng + Long
  Trận 04 Tuấn + Hải vs Minh + Nam
  Trận 05 Tuấn + Long vs Hoàng + Nam  (19–21)
  Trận 06 Minh + Hải vs Hoàng + Quang
  Trận 07 Quang + Long vs Nam + Hải
```

## Prompt 3: Tuần này, các trạng thái khác

```
Create three variants of the "Tuần này" screen:
1. Fewer than 5 check-ins: counter "Đã điểm danh 3/10", and in place of the match list a friendly empty state: "Chưa đủ người để xếp lịch" with subtext "Cần ít nhất 5 người, hiện có 3".
2. Session locked because a score was entered: status chip "Đã khóa · đã có kết quả", the check-in button is disabled with the note "Không thể thay đổi điểm danh khi đã có kết quả".
3. After 12:00 Saturday: status chip "Đã đóng điểm danh lúc 12:00".
```

## Prompt 4: Danh sách điểm danh (popup)

```
Bottom sheet opened by tapping "Đã điểm danh 7/10".
- Title "Đã điểm danh (7)". List rows: avatar, display name, seed chip, and small text "tự điểm danh" or "admin điểm danh hộ".
- Admin/subadmin view adds: a "Điểm danh hộ" button that opens a member picker (shows "Minh (@minh.nt)" and "Minh (@minh.le)" to tell duplicates apart), and a remove action on each row.
- Below, a collapsed section "Chưa điểm danh (3)".
```

## Prompt 5: Nhập tỷ số (admin, subadmin)

```
Admin view of the "Tuần này" match list.
- Each match card has an inline score entry: two compact number inputs (pair A score, pair B score) and a "Lưu" button.
- Validation error shown on the card: "Tỷ số 23–20 không hợp lệ: từ 22 điểm trở lên phải thắng cách đúng 2".
- Conflict message example: "Trận này vừa được nhập 21–17, hãy tải lại".
- Entered scores can be edited (pencil) or cleared.
- At the bottom, a destructive text button "Xóa hết kết quả buổi này" with a confirm dialog: "Xóa toàn bộ kết quả? Điểm danh sẽ mở lại nếu chưa đến 12:00 thứ 7."
```

## Prompt 6: Xếp hạng (mùa và ELO)

```
Screen "Xếp hạng" with a segmented control "Mùa" | "ELO".

"Mùa" view:
- Month selector "Tháng 10/2026" with previous/next arrows, and a status chip "Đang diễn ra" (or "Đã kết thúc" for past months).
- Ranking with columns: "Hạng", member, "Thắng", "Hiệu số", "Cầu thắng", "Cầu thua", "Trận". On mobile, keep rank, member, wins and difference visible and let the rest fit compactly or scroll horizontally.
- Show a tie: two members both ranked 1, the next one ranked 3.
- Top 3 subtly emphasized, without trophies everywhere.

"ELO" view:
- Rows: rank, member, ELO with one decimal (e.g. 1182,4), seed chip, and change from the last session (e.g. "▲ 16,8" in green, "▼ 11,2" in red, "–" if not played).
- A clear divider after the 4th row labeled "Hạt giống 1" above and "Hạt giống 2" below.
```

## Prompt 7: Thống kê

```
Screen "Thống kê" with tabs "Theo mem" | "Theo cặp".
- Filter bar: time range "Từ tháng – Đến tháng" (default "Toàn bộ") and a member filter "Tất cả mem".
- "Theo mem": columns "Thắng", "Hiệu số", "Cầu thắng", "Cầu thua", "Trận", plus podium counts "Hạng 1", "Hạng 2", "Hạng 3", "Hạng 4" (number of finished seasons at each rank).
- "Theo cặp": each row is a pair (two overlapping avatars, "Tuấn + Long"), same stat columns, no podium counts.
- Empty state when filters match nothing: "Không có trận nào trong khoảng này".
```

## Prompt 8: Lịch sử

```
Screen "Lịch sử".
- List grouped by month: "Tháng 10/2026", "Tháng 9/2026"… Each session row: date "Thứ 7, 10/10", number of players "8 người", matches with scores "8/8 trận có kết quả" (or "6/8").
- Session detail: participants, the official match list with scores, read-only for members.
- Admin view of a past session: scores are editable, with a note "Chỉ admin sửa được kết quả buổi đã qua".
```

## Prompt 9: Tôi (cá nhân)

```
Screen "Tôi".
- Profile header: large avatar with "Đổi ảnh" and "Xóa ảnh", display name with edit, username shown read-only "@tuan.ng", role chip ("Admin", "Subadmin" or "Mem"), current ELO and seed.
- Actions: "Đổi tên hiển thị", "Đổi mật khẩu" (current password, new password, confirm; note "Các thiết bị khác sẽ bị đăng xuất"), "Đăng xuất".
- Admin only: an entry "Quản lý mem".
```

## Prompt 10: Quản lý mem (admin)

```
Screen "Quản lý mem", admin only.
- Filter chips "Đang hoạt động (10)" | "Đã ngưng (1)". Search by name or username.
- Rows: avatar, display name, "@username", role chip, ELO.
- Button "Thêm mem" opens a form: "Tên hiển thị", "Tên đăng nhập", "Mật khẩu", "ELO ban đầu" (prefilled 1000), optional avatar upload. Error example: "Tên đăng nhập đã có người dùng".
- Member detail with actions: "Sửa tên hiển thị", "Đổi tên đăng nhập", "Đổi ảnh", "Đặt lại mật khẩu", "Sửa ELO" (note "Lưu thành mốc điều chỉnh từ thời điểm này"), "Đặt làm subadmin" / "Gỡ subadmin", "Ngưng hoạt động" / "Kích hoạt lại".
- Danger zone: "Chuyển quyền admin" with a dialog: pick a member, re-enter your password, warning "Sau khi chuyển, bạn sẽ thành mem thường."
- The admin's own row has no "Ngưng hoạt động" action.
```

## Prompt 11: Bản máy tính

```
Create desktop versions (1280px wide) of "Tuần này", "Xếp hạng" and "Thống kê" using the same design language.
- Replace the bottom tab bar with a left sidebar holding the same 5 sections.
- "Tuần này": match cards in a 2-column grid; check-in summary and attendee list in a right-hand panel.
- Tables show all columns without horizontal scrolling.
```
