#!/usr/bin/env bash
# Đầu nhận deploy từ GitHub Actions.
#
# Chạy trên VPS như một FORCED COMMAND trong ~/.ssh/authorized_keys:
#
#   command="/opt/noi-than/deploy/ci-receive.sh",no-pty,no-agent-forwarding,\
#   no-port-forwarding,no-X11-forwarding ssh-ed25519 AAAA... noi-than-ci
#
# Khoá CI nằm trong GitHub Secrets nên không mở được shell, chỉ làm được đúng một việc:
# nhận image qua stdin rồi chạy lại app.
#
# Phía Actions gọi:  docker save noi-than:<tag> | gzip | ssh -i key root@vps "deploy <tag> <sha>"
#
# Hỏng ở bất kỳ bước nào thì tự quay về bản đang chạy trước đó.
set -uo pipefail

APP=/opt/noi-than
PORT=8090
LOG=/var/log/noi-than-deploy.log
LOCK=/var/lock/noi-than-deploy.lock
KEEP=3                      # số image giữ lại để còn quay về

log() { echo "[$(date '+%F %T')] $*" | tee -a "$LOG" >&2; }
die() { log "LỖI: $*"; exit 1; }

# Lệnh phía client gửi lên chỉ là tham số, không bao giờ được chạy như shell
read -r verb TAG SHA extra <<<"${SSH_ORIGINAL_COMMAND:-}"
[ "$verb" = deploy ] && [ -z "${extra:-}" ] || die "lệnh không hợp lệ: ${SSH_ORIGINAL_COMMAND:-<trống>}"
[[ "$TAG" =~ ^[0-9a-f]{7}$ ]] || die "tag không hợp lệ: $TAG"
[[ "$SHA" =~ ^[0-9a-f]{40}$ ]] && [ "${SHA:0:7}" = "$TAG" ] || die "sha không hợp lệ: $SHA"

exec 9>"$LOCK" || die "không mở được $LOCK"
flock -n 9 || die "đang có một lần deploy khác chạy, bỏ qua lần này"

log "=== nhận deploy $TAG ==="

# ---- 1. nhận image qua stdin ------------------------------------------------
gunzip | docker load >>"$LOG" 2>&1 || die "không nạp được image gửi lên"
docker image inspect "noi-than:$TAG" >/dev/null 2>&1 || die "gói gửi lên không có noi-than:$TAG"

# ---- 2. đưa file deploy (compose, script) về đúng commit ---------------------
cd "$APP" || die "không vào được $APP"
PREV_SHA=$(git rev-parse HEAD)
git fetch -q origin "$SHA" >>"$LOG" 2>&1 && git checkout -q --detach "$SHA" >>"$LOG" 2>&1 \
  || die "không lấy được commit $SHA"

cd "$APP/deploy" || die "không vào được $APP/deploy"
PREV_TAG=$(sed -n 's/^APP_VERSION=//p' .env)

healthy() {
  for _ in $(seq 1 30); do
    sleep 2
    s=$(docker inspect -f '{{.State.Health.Status}}' "$(docker compose ps -q app)" 2>/dev/null)
    [ "$s" = healthy ] && curl -fsS "http://127.0.0.1:$PORT/api/health" >/dev/null 2>&1 && return 0
  done
  return 1
}

rollback() {
  log "!!! quay về bản $PREV_TAG"
  git -C "$APP" checkout -q --detach "$PREV_SHA"
  sed -i "s/^APP_VERSION=.*/APP_VERSION=$PREV_TAG/" .env
  docker compose up -d --no-build app >>"$LOG" 2>&1
  if healthy; then log "đã quay về bản cũ, app chạy lại bình thường"
  else log "NGHIÊM TRỌNG: quay về rồi mà app vẫn không lên — vào VPS xem tay"; fi
}

# ---- 3. chạy bản mới + kiểm tra ---------------------------------------------
sed -i "s/^APP_VERSION=.*/APP_VERSION=$TAG/" .env
if ! docker compose up -d --no-build app >>"$LOG" 2>&1; then
  rollback; die "docker compose up thất bại"
fi
if ! healthy; then
  docker compose logs --tail 40 app >>"$LOG" 2>&1
  rollback; die "app không healthy sau 60 giây"
fi

# ---- 4. dọn image cũ --------------------------------------------------------
docker images noi-than --format '{{.CreatedAt}}\t{{.Repository}}:{{.Tag}}' | sort -r \
  | tail -n +$((KEEP + 1)) | cut -f2 | xargs -r docker rmi >>"$LOG" 2>&1 || true

log "=== deploy XONG ($PREV_TAG → $TAG) ==="
echo "deploy OK — noi-than:$TAG"
