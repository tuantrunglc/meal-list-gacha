#!/bin/sh
# Khởi động PocketBase: tạo/cập nhật superuser từ biến môi trường, rồi phục vụ web + API.
# Migration (schema, API rule, household + tài khoản chủ app) tự chạy khi serve.
set -eu

# Lưu ý: mỗi lần khởi động, mật khẩu superuser được đặt lại theo PB_ADMIN_PASSWORD
# (đổi mật khẩu admin thì đổi trong deploy/.env, không đổi trên trang quản trị).
if [ -n "${PB_ADMIN_EMAIL:-}" ] && [ -n "${PB_ADMIN_PASSWORD:-}" ]; then
  if ! pocketbase superuser upsert "$PB_ADMIN_EMAIL" "$PB_ADMIN_PASSWORD" \
    --dir /pb/pb_data --migrationsDir /pb/pb_migrations >/dev/null; then
    echo "entrypoint: không tạo được superuser (email sai hoặc mật khẩu quá ngắn?)" >&2
    exit 1
  fi
elif [ -n "${PB_ADMIN_EMAIL:-}${PB_ADMIN_PASSWORD:-}" ]; then
  echo "entrypoint: cần cả PB_ADMIN_EMAIL lẫn PB_ADMIN_PASSWORD" >&2
  exit 1
else
  echo "entrypoint: chưa có PB_ADMIN_EMAIL/PB_ADMIN_PASSWORD, bỏ qua tạo superuser" >&2
fi

exec pocketbase serve --http 0.0.0.0:8090 \
  --dir /pb/pb_data \
  --publicDir /pb/pb_public \
  --migrationsDir /pb/pb_migrations \
  --hooksDir /pb/pb_hooks \
  --hooksWatch=false
