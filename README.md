# ANH EM IT

Web app lịch thi đấu câu lạc bộ cầu lông: mem điểm danh buổi thứ 7, app tự xếp lịch đánh đôi theo sơ đồ và hạt giống, admin nhập tỷ số, app tính bảng xếp hạng mùa, ELO và thống kê.

## Lệnh

- Cài đặt: `pnpm install`
- Database cục bộ (Docker Postgres): `pnpm db:up`, rồi `pnpm db:migrate`
- Chạy dev: `pnpm dev`
- Test: `pnpm test` (đơn vị), `pnpm test:int` (tích hợp, cần `pnpm db:up`)
- Kiểm tra: `pnpm lint`, `pnpm typecheck`, `pnpm format:check`
- Build: `pnpm build`

## Tài liệu

- Thiết kế và quy tắc: `docs/superpowers/specs/2026-10-10-badminton-club-app-design.md`
- Quy ước làm việc trong dự án: `CLAUDE.md`
- Thuật ngữ: `GLOSSARY.md`
