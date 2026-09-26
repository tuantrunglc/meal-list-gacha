---
title: 'Story 1.9: Deploy website Nồi Thần lên VPS'
type: 'chore'
created: '2026-09-26'
status: 'done'
baseline_commit: '9c7506167a733266938c5fe4edaf4968c756eac9'
route: 'dispatch'
review_loop_iteration: 0
context:
  - '{project-root}/_bmad-output/implementation-artifacts/epic-1-context.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** App mới chạy trên máy dev; cả nhà cần mở được trên điện thoại ở bất cứ đâu, dữ liệu an toàn.

**Approach:** Một image Docker multi-stage (build web → alpine + PocketBase 0.40.4 + `pb_public` + migrations + hooks), chạy bằng `docker compose` với volume `pb_data`; HTTPS qua reverse proxy có sẵn hoặc Caddy 2.11.4; backup tích hợp của PocketBase bật bằng migration; README hướng dẫn deploy, cập nhật, copy backup ra ngoài VPS.

## Boundaries & Constraints

**Always:**
- `deploy/Dockerfile`: stage web (`node:26-alpine`, `npm ci`, `vite build`), stage tải PocketBase theo kiến trúc và kiểm checksum, stage chạy alpine với user không phải root, `HEALTHCHECK /api/health`, `APP_VERSION` làm nhãn phiên bản (front + back cùng tag).
- `deploy/entrypoint.sh`: `superuser upsert` từ `PB_ADMIN_EMAIL/PASSWORD` (thiếu thì bỏ qua), rồi `serve` trên 0.0.0.0:8090 với `pb_public`, migrations, hooks. Migration tự chạy khi khởi động; tài khoản chủ app từ `NOI_OWNER_*` (lần đầu).
- `deploy/compose.yml`: service `app` (volume `pb_data`, `env_file: .env`, cổng chỉ mở `127.0.0.1`), service `caddy` trong profile `caddy` với `deploy/Caddyfile` (`{$DOMAIN}` → `app:8090`). `deploy/.env.example`; `.env` không commit.
- Migration cấu hình: backup cron hằng ngày giữ 7 bản; `trustedProxy` đọc `X-Forwarded-For`; tên app.
- README: dev, deploy (có/không có proxy), cập nhật bản mới, backup + copy ra ngoài VPS, khôi phục.
- Không có secret trong repo.

**Never:** Không deploy thật lên VPS của người dùng (không có quyền truy cập). Không CI/CD (Deferred).

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Build | `docker build -f deploy/Dockerfile .` | image chạy được | checksum sai → build lỗi |
| Chạy | container với env | `/api/health` 200, web ở `/`, link sâu trả trang web | N/A |
| E2E | toàn bộ e2e trên container (`E2E_BASE_URL`) | pass | N/A |
| Dựng lại | xoá container, chạy lại cùng volume | dữ liệu còn nguyên; mật khẩu chủ app không bị đổi | N/A |
| Backup | tạo backup | file nằm trong `pb_data/backups` | N/A |

</frozen-after-approval>

## Code Map

- `server/pb_migrations/*` -- schema; `1790000001_bootstrap_owner.js` đọc `NOI_OWNER_*`.
- `scripts/get-pocketbase.sh` -- mẫu tải + kiểm checksum.
- `web/playwright.config.ts`, `web/e2e/env.ts` -- thêm chế độ chạy trên bản đã deploy.

## Tasks & Acceptance

**Execution:**
- [x] `deploy/Dockerfile`, `deploy/entrypoint.sh`, `.dockerignore` -- image.
- [x] `deploy/compose.yml`, `deploy/Caddyfile`, `deploy/.env.example` -- chạy trên VPS.
- [x] `server/pb_migrations/1790000004_settings.js` -- backup, trusted proxy, tên app.
- [x] `README.md` -- hướng dẫn.
- [x] `web/e2e/env.ts`, `web/playwright.config.ts`, các spec -- `E2E_BASE_URL`/API chung.

**Acceptance Criteria:**
- Given image vừa build, when chạy container và `E2E_BASE_URL=... npx playwright test`, then pass; `docker compose config` hợp lệ (có và không có profile caddy); `caddy validate` hợp lệ.

## Implementation Notes

- Builder cũ không truyền `TARGETARCH` → suy từ `uname -m`.
- Đã kiểm trên Colima (arm64): image 44,8MB; health 200; `/lich-su` trả HTML (`indexFallback`); 18/18 e2e pass trên container; xoá + chạy lại container cùng volume: draws 2 → 2, items 51 → 51, đổi `NOI_OWNER_PASSWORD` không ảnh hưởng tài khoản cũ; backup tạo được trong `pb_data/backups`; chạy UID 10001; healthcheck `healthy`.
- `superuser upsert` chạy migration trước `serve`, nên env `NOI_OWNER_*` phải có ngay lúc đó (compose truyền qua `env_file`).

## Spec Change Log

- Viết spec sau khi code (workflow bị rút gọn ở story này); phạm vi giữ đúng AC của Story 1.9.

## Review Triage Log

| # | Nguồn | Finding | Verdict | Bằng chứng | Route |
|---|---|---|---|---|---|
| 1 | blind, edge, verif | `useLeftmostIP = true` → client giả IP (log, rate limit) | medium | Caddy/nginx nối IP thật vào cuối header | patch — `false`; e2e kiểm settings |
| 2 | edge | Cron backup của PocketBase tính theo UTC → "3 giờ sáng" thành 10 giờ sáng | medium | | patch — `0 20 * * *` (03:00 giờ VN), ghi rõ trong migration + README |
| 3 | verif | Cấu hình backup/proxy không có test | medium | Sửa sai vẫn xanh | patch — e2e đọc `/api/settings` |
| 4 | edge | `grep` checksum không ra dòng → `sha256sum -c` rỗng có thể qua | medium | | patch — ghi ra file, kiểm `-s` (cả Dockerfile lẫn `get-pocketbase.sh`) |
| 5 | edge | Kiến trúc lạ âm thầm tải bản amd64 | low | | patch — báo lỗi kiến trúc chưa hỗ trợ |
| 6 | blind, edge | Cập nhật truyền `APP_VERSION` một lần → `up` sau đó quay về image `latest` cũ; nhãn trong container lệch | medium | `.env` vẫn `latest` | patch — README ghi tag vào `.env`; compose đặt `APP_VERSION` cho container; thêm cách quay lại bản trước |
| 7 | blind | Backup chép ra `deploy/backups` không bị ignore | medium | Chứa mật khẩu đã băm | patch — `.gitignore`, `.dockerignore` |
| 8 | blind, edge | `docker compose cp` lần hai lồng `backups/backups`; bước trên VPS không có lịch | low | | patch — `backups/.` và hướng dẫn cron |
| 9 | edge | Entrypoint: upsert lỗi → crash loop không log; chỉ có 1 trong 2 biến admin | medium | stdout bị nuốt, `set -e` | patch — báo lỗi rõ và thoát; thiếu một biến thì báo |
| 10 | blind | Mật khẩu admin bị đặt lại mỗi lần khởi động mà không nói | low | | patch — ghi chú trong entrypoint và `.env.example` |
| 11 | blind | Không dùng Caddy vẫn bắt đặt `DOMAIN` | low | `${DOMAIN:?}` bị nội suy cả khi không bật profile | patch — `${DOMAIN:-}`; đã chạy `compose config` không có DOMAIN |
| 12 | blind | Caddy chạy trước khi app sẵn sàng | low | | patch — `depends_on: condition: service_healthy` |
| 13 | blind, verif, edge | E2E trên container: không tái lập được tài khoản; có thể chạy nhầm vào bản thật; `//api` khi có `/` cuối | medium | | patch — `scripts/e2e-container.sh` (build, volume trống, tài khoản e2e, dựng lại, dọn); chỉ cho địa chỉ máy mình trừ khi `E2E_ALLOW_REMOTE=1`; bỏ `/` cuối |
| 14 | verif | Kiểm tra image chỉ là chạy tay | medium | Không có CI | defer — nay đã có script chạy lại được; CI thuộc Deferred của spine |
| 15 | blind | Down migration không trả hết | low | | patch — về mặc định PocketBase |
| 16 | blind | README không nói backup `caddy_data` | low | | patch — ghi chú (mất thì tự xin lại) |
| 17 | blind | `wget` cài thừa | low | busybox đã có | reject |

## Verification

**Commands:**
- `scripts/e2e-container.sh` -- expected: `OK: e2e trên container pass; dữ liệu còn sau khi dựng lại`.
- `docker build -f deploy/Dockerfile -t noi-than:test .` -- expected: thành công.
- `E2E_BASE_URL=http://127.0.0.1:8099 npx playwright test` (container chạy ở 8099) -- expected: pass.
- `cd deploy && docker compose config --quiet && docker compose --profile caddy config --quiet` -- expected: hợp lệ.
