#!/usr/bin/env bash
# Dumps the database in $BACKUP_DATABASE_URL to <dir>/anh-em-it.sql.gz with the PostgreSQL 17
# client from Docker. The URL is read from the environment only, so it never shows up in
# `ps` output or in CI logs.
set -euo pipefail

dir="${1:?Thiếu thư mục đích}"
if [ -z "${BACKUP_DATABASE_URL:-}" ]; then
  echo "Thiếu BACKUP_DATABASE_URL" >&2
  exit 1
fi

# Tolerate a sloppy copy/paste: whitespace, quotes, or the variable name in front of the value.
url="${BACKUP_DATABASE_URL//[$'\r\n\t ']/}"
url="${url//\"/}"
url="${url//\'/}"
url="${url#DATABASE_URL_UNPOOLED=}"
url="${url#DATABASE_URL=}"
# Anything else would be taken by pg_dump as a database *name* on the local socket, which fails
# with a confusing error. The value itself is never printed.
case "$url" in
  postgres://* | postgresql://*) ;;
  *)
    echo "Secret DATABASE_URL không phải chuỗi kết nối (${#url} ký tự): phải bắt đầu bằng postgres:// hoặc postgresql://. Lấy lại chuỗi đầy đủ từ Neon (không phải dấu ***) và tạo lại secret." >&2
    exit 1
    ;;
esac
case "$url" in
  *@*-pooler*)
    echo "Secret DATABASE_URL là chuỗi qua pooler (có -pooler trong tên máy chủ). Sao lưu cần chuỗi kết nối trực tiếp (DATABASE_URL_UNPOOLED)." >&2
    exit 1
    ;;
esac
export PGURL="$url"
out="$dir/anh-em-it.sql.gz"
tmp="$out.tmp"
trap 'rm -f "$tmp"' EXIT

# Only the schemas the app owns: add-ons such as Neon Auth create their own (neon_auth) that a
# restore into another database could not rebuild.
dump() {
  docker run --rm --network host -e PGURL postgres:17 \
    sh -c 'pg_dump --format=plain --no-owner --no-privileges --schema=public --schema=drizzle "$PGURL"' | gzip -n >"$tmp"
}

if ! dump; then
  echo "pg_dump lỗi, thử lại sau 30 giây" >&2
  sleep 30
  dump
fi
# pg_dump 17.6+ writes a random \restrict key into every dump. Keep the old file when only that
# key differs, so an unchanged week produces no commit (the random key itself stays, it guards psql).
gzip -t "$tmp"
content() { gzip -dc "$1" | grep -Ev '^\\(un)?restrict '; }
if [ -f "$out" ] && cmp -s <(content "$out") <(content "$tmp"); then
  rm "$tmp"
  echo "Dữ liệu không đổi so với bản trước"
  exit 0
fi
mv "$tmp" "$out"
echo "Đã sao lưu vào $out"
