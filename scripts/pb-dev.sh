#!/bin/sh
# Chạy PocketBase local cho dev với migrations/hooks của repo.
# Nạp .env ở gốc repo (nếu có) để migration tạo tài khoản chủ app ở lần khởi động đầu.
set -eu
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
"$ROOT/scripts/get-pocketbase.sh" >/dev/null
if [ -f "$ROOT/.env" ]; then
  set -a
  . "$ROOT/.env"
  set +a
else
  echo "Chưa có .env: copy .env.example thành .env để tạo tài khoản chủ app ở lần chạy đầu." >&2
fi
exec "$ROOT/.tools/pocketbase" serve \
  --dir "$ROOT/server/pb_data" \
  --migrationsDir "$ROOT/server/pb_migrations" \
  --hooksDir "$ROOT/server/pb_hooks" "$@"
