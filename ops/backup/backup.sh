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
export PGURL="$BACKUP_DATABASE_URL"
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
