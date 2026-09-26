#!/bin/sh
# Dựng image production, chạy trên volume trống với tài khoản e2e (khớp web/e2e/env.ts),
# chạy toàn bộ e2e trên container, kiểm tra dữ liệu còn sau khi dựng lại container, rồi dọn.
set -eu
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
IMAGE=noi-than:e2e
NAME=noi-than-e2e
VOLUME=noi-than-e2e-data
PORT=8099
BASE="http://127.0.0.1:$PORT"

cleanup() { docker rm -f "$NAME" >/dev/null 2>&1 || true; docker volume rm -f "$VOLUME" >/dev/null 2>&1 || true; }
trap cleanup EXIT
cleanup

docker build -q -f "$ROOT/deploy/Dockerfile" --build-arg APP_VERSION=e2e -t "$IMAGE" "$ROOT" >/dev/null

run() {
  docker run -d --name "$NAME" -p "127.0.0.1:$PORT:8090" -v "$VOLUME:/pb/pb_data" \
    -e PB_ADMIN_EMAIL=admin@e2e.test -e PB_ADMIN_PASSWORD=mat-khau-admin-123 \
    -e NOI_OWNER_EMAIL=chu-app@e2e.test -e "NOI_OWNER_PASSWORD=$1" -e "NOI_HOUSEHOLD_NAME=Nhà e2e" \
    "$IMAGE" >/dev/null
  i=0
  until curl -fs "$BASE/api/health" >/dev/null; do
    i=$((i + 1)); [ "$i" -lt 60 ] || { docker logs "$NAME"; exit 1; }; sleep 1
  done
}

count() {
  token=$(curl -fs -X POST -H 'content-type: application/json' \
    -d '{"identity":"admin@e2e.test","password":"mat-khau-admin-123"}' \
    "$BASE/api/collections/_superusers/auth-with-password" | sed 's/.*"token":"\([^"]*\)".*/\1/')
  curl -fs -H "Authorization: $token" "$BASE/api/collections/$1/records?perPage=1" | sed 's/.*"totalItems":\([0-9]*\).*/\1/'
}

run mat-khau-e2e-123
curl -fs -o /dev/null "$BASE/lich-su" || { echo "link sâu không trả trang web" >&2; exit 1; }
(cd "$ROOT/web" && E2E_BASE_URL="$BASE" npx playwright test)

before="$(count items)/$(count draws)"
docker rm -f "$NAME" >/dev/null
# Đổi mật khẩu chủ app trong env: tài khoản đã có không bị ghi đè
run mat-khau-khac-han-123
after="$(count items)/$(count draws)"
[ "$before" = "$after" ] || { echo "Mất dữ liệu sau khi dựng lại: $before → $after" >&2; exit 1; }
curl -fs -o /dev/null -X POST -H 'content-type: application/json' \
  -d '{"identity":"chu-app@e2e.test","password":"mat-khau-e2e-123"}' \
  "$BASE/api/collections/users/auth-with-password" || { echo "Mật khẩu chủ app bị ghi đè" >&2; exit 1; }
echo "OK: e2e trên container pass; dữ liệu còn sau khi dựng lại ($after items/draws)"
