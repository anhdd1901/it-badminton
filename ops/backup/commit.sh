#!/usr/bin/env bash
# Commits <dir>/anh-em-it.sql.gz when it changed; an unchanged week is not an error.
set -euo pipefail

dir="${1:?Thiếu thư mục repo}"
cd "$dir"
git add anh-em-it.sql.gz
if git diff --cached --quiet; then
  echo "Không có thay đổi, bỏ qua commit"
  exit 0
fi
git commit -q -m "backup: $(TZ=Asia/Ho_Chi_Minh date '+%Y-%m-%d %H:%M')"
echo "Đã commit bản sao lưu"
