# Nồi Thần

Website nhỏ cho cả nhà: mở nồi ra mâm cơm 1 mặn · 1 rau · 1 canh. Web (React + Vite) và
PocketBase chạy chung trong một image Docker.

## Chạy khi dev

```sh
cp .env.example .env            # sửa email/mật khẩu chủ app (tạo ở lần chạy đầu)
cd web && npm install
npm run pb                      # PocketBase local ở :8090 (tự tải đúng bản 0.40.4)
npm run dev                     # terminal khác: website ở :5173, /api proxy tới PocketBase
```

Kiểm tra: `npm run lint && npm run typecheck && npm test && npm run build && npm run test:e2e`
(e2e dùng Chrome cài sẵn và PocketBase riêng trên dữ liệu tạm).

Kiểm tra image production: `scripts/e2e-container.sh` dựng image, chạy container trên volume
trống với tài khoản e2e, chạy toàn bộ e2e trên đó, kiểm tra dữ liệu còn sau khi dựng lại
container, rồi dọn dẹp. Không chạy e2e vào bản deploy thật (e2e tạo và xoá dữ liệu).

## Deploy lên VPS

Yêu cầu: Docker + Docker Compose, domain trỏ về VPS.

```sh
git clone <repo> noi-than && cd noi-than/deploy
cp .env.example .env            # điền DOMAIN, PB_ADMIN_*, NOI_OWNER_* (không commit file này)
```

- **VPS chưa có reverse proxy:** `docker compose --profile caddy up -d --build`
  (Caddy tự lấy chứng chỉ HTTPS cho `DOMAIN`).
- **VPS đã có nginx/Caddy/Traefik:** `docker compose up -d --build`, rồi cho proxy chuyển
  `https://DOMAIN` tới `http://127.0.0.1:8090` (đổi cổng bằng `APP_PORT`).

Khi khởi động, container tự chạy migration (schema, API rule, backup định kỳ), tạo/cập nhật
superuser từ `PB_ADMIN_*`, và ở lần đầu tạo household + tài khoản chủ app từ `NOI_OWNER_*`.
Trang quản trị: `https://DOMAIN/_/`.

Kiểm tra: `docker compose ps` (trạng thái `healthy`), `curl https://DOMAIN/api/health`.

### Cập nhật bản mới

```sh
cd noi-than && git pull
cd deploy
# ghi tag mới vào .env để mọi lệnh compose sau đó đều dùng đúng bản này
sed -i "s/^APP_VERSION=.*/APP_VERSION=$(git rev-parse --short HEAD)/" .env
docker compose up -d --build
```

Web và PocketBase luôn đi cùng một tag. Dữ liệu nằm trong volume `noi-than_pb_data`, không
mất khi dựng lại container. Nên tạo một bản backup (bên dưới) trước khi cập nhật.

**Quay lại bản trước:** các image cũ vẫn còn (`docker images noi-than`). Đặt `APP_VERSION`
trong `.env` về tag cũ rồi `docker compose up -d` (không `--build`). Nếu bản mới đã chạy
migration đổi dữ liệu, khôi phục thêm bản backup tạo trước khi cập nhật.

## Backup

PocketBase tự backup lúc 3 giờ sáng (giờ Việt Nam) mỗi ngày, giữ 7 bản, trong
`pb_data/backups` của volume.
Tạo backup ngay: trang quản trị → Settings → Backups → New backup.

**Copy ra ngoài VPS** (đừng để backup chỉ nằm trên VPS):

```sh
# trên VPS (đặt cron hằng ngày, sau 3 giờ sáng): chép các bản backup ra ngoài volume
cd ~/noi-than/deploy && mkdir -p backups && docker compose cp app:/pb/pb_data/backups/. ./backups/
# trên máy nhà (cron hằng ngày): kéo về
rsync -av user@vps:~/noi-than/deploy/backups/ ~/noi-than-backups/
```

`deploy/backups` đã nằm trong `.gitignore`/`.dockerignore` (backup chứa cả mật khẩu đã băm).
Nếu dùng Caddy của compose, volume `noi-than_caddy_data` giữ chứng chỉ HTTPS; mất thì Caddy
tự xin lại, không cần backup.

Khôi phục: trang quản trị → Settings → Backups → chọn bản → Restore (hoặc tải file .zip lên
rồi Restore).
