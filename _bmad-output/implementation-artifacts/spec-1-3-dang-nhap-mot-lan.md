---
title: 'Story 1.3: Đăng nhập một lần'
type: 'feature'
created: '2026-09-26'
status: 'done'
baseline_commit: '68bf30ee6630ae13ec597511ee5901ad5ed1d089'
route: 'dispatch'
review_loop_iteration: 0
context:
  - '{project-root}/_bmad-output/implementation-artifacts/epic-1-context.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** Dữ liệu sẽ nằm trên VPS; chưa có đăng nhập nên ai cũng xem được.

**Approach:** PocketBase 0.40.4 với migration JS tạo `households` và khoá tự đăng ký `users`; migration tạo household + tài khoản chủ app từ biến môi trường. Web có màn đăng nhập gọn, nhớ phiên (auth store của SDK trong `localStorage`), tự làm mới token, và lớp `data/` duy nhất nói chuyện với PocketBase.

## Boundaries & Constraints

**Always:**
- Migration `server/pb_migrations/*_init_households.js`: `users.createRule = null` (tắt tự đăng ký); tạo `households` (`name` text bắt buộc, `members` relation → users, nhiều) với `listRule`/`viewRule` = `members.id ?= @request.auth.id`, create/update/delete = `null` (chỉ superuser). Có hàm down.
- Migration `server/pb_migrations/*_bootstrap_owner.js` (chạy sau migration schema): nếu có `NOI_OWNER_EMAIL` + `NOI_OWNER_PASSWORD` thì tạo user (verified) nếu chưa có, và household `NOI_HOUSEHOLD_NAME` (mặc định "Nhà mình") chứa user nếu user chưa thuộc household nào. Không tạo trùng, không đổi mật khẩu đã có. Thiếu biến ở lần khởi động đầu thì bỏ qua và log (tạo tay qua trang admin).
- `web/src/data/`: `pb.ts` (client, baseURL gốc cùng domain), `errors.ts` (`AppError {code, message}`: `invalid-credentials`, `network`, `server`; message giọng Nồi Thần — lỗi thô của PocketBase không lên UI), `keys.ts` (query key tập trung), `auth.ts` (`useAuth()` theo dõi `authStore`, `useLogin()`, `useLogout()`, `refreshSession()`), `household.ts` (`useCurrentHousehold()`).
- Làm mới token: khi app mở mà đã có phiên, và khi tab được focus lại mà token còn < 1 ngày; server trả 401/403 thì đăng xuất, lỗi mạng thì giữ phiên.
- Chưa đăng nhập: mọi route hiện màn đăng nhập (không có thanh tab). Đăng nhập xong vào `/`.
- Màn đăng nhập: tiêu đề "Nồi Thần", email + mật khẩu (`input` 48px, có `<label>`, `autocomplete` đúng), nút chính màu `primary` "Vào bếp thôi!", đang gửi thì khoá nút; lỗi hiện dưới form với `role="alert"`. Chuỗi trong `ui/copy.ts`.
- Dev: script tải PocketBase theo OS/arch vào `.tools/`; `npm run pb` chạy PocketBase local với migrations/hooks của repo; `vite` proxy `/api` tới `PB_URL` (mặc định `http://127.0.0.1:8090`), cả `dev` lẫn `preview`.

**Never:** Không có màn đăng ký, quên mật khẩu, OAuth. Không commit mật khẩu thật (chỉ `.env.example`). Không gọi `pocketbase` ngoài `src/data/`.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Đúng | email/mật khẩu chủ app | vào màn Quay, có thanh tab | N/A |
| Sai | mật khẩu sai | ở lại màn đăng nhập | "Sai email hoặc mật khẩu rồi, thử lại nhé." |
| Nhớ phiên | đã đăng nhập, tải lại trang | vẫn ở trong app | N/A |
| Mất mạng | server không phản hồi khi đăng nhập | ở lại màn | thông báo mất mạng thân thiện |
| Tự đăng ký | POST `/api/collections/users/records` không có quyền superuser | bị từ chối (4xx) | N/A |
| Household | chưa đăng nhập gọi list `households` | 0 bản ghi | N/A |
| Household | chủ app gọi `useCurrentHousehold()` | household của mình | N/A |
| Chạy lại hook | khởi động lại PocketBase | vẫn 1 user, 1 household | N/A |

</frozen-after-approval>

## Code Map

- `web/src/app/App.tsx` -- bọc Shell trong cổng đăng nhập.
- `web/src/main.tsx` -- `QueryClient` đã có; `refetchOnWindowFocus` mặc định bật (AD-6).
- `web/vite.config.ts` -- proxy `/api` đang viết cứng 8090.
- `.tools/pocketbase` (gitignored) -- binary 0.40.4 đã tải; API JSVM giống PocketBase ≥ 0.23 (`migrate`, `new Collection`, `onServe`, `$os.getenv`, `e.app.findAuthRecordByEmail`).
- `web/playwright.config.ts`, `web/e2e/smoke.spec.ts` -- smoke hiện tại sẽ cần đăng nhập.

## Tasks & Acceptance

**Execution:**
- [x] `scripts/get-pocketbase.sh` -- tải PocketBase 0.40.4 đúng OS/arch vào `.tools/`.
- [x] `server/pb_migrations/1790000000_init_households.js` -- như Boundaries.
- [x] `server/pb_migrations/1790000001_bootstrap_owner.js` -- như Boundaries.
- [x] `.env.example` -- `NOI_OWNER_EMAIL`, `NOI_OWNER_PASSWORD`, `NOI_HOUSEHOLD_NAME`.
- [x] `web/src/data/{pb,errors,keys,auth,household}.ts` + `web/src/data/errors.test.ts` -- lớp data và test ánh xạ lỗi.
- [x] `web/src/features/auth/LoginScreen.tsx` (+ `.css`) và `web/src/app/AuthGate.tsx` -- màn đăng nhập + cổng + làm mới token.
- [x] `web/src/app/App.tsx`, `web/src/ui/copy.ts`, `web/src/ui/global.css` (style `input`, nút chính dùng chung) -- nối vào.
- [x] `web/src/features/auth/LoginScreen.test.tsx` -- render, lỗi hiện `role=alert`, nút khoá khi đang gửi (mock hook data).
- [x] `web/package.json` (`pb`, `test:e2e`), `web/vite.config.ts` (proxy theo `PB_URL`, preview), `web/playwright.config.ts` (chạy PocketBase thật trên thư mục dữ liệu tạm + cổng riêng) -- hạ tầng.
- [x] `web/e2e/auth.spec.ts` -- các hàng ma trận end-to-end với PocketBase thật; cập nhật `smoke.spec.ts` đăng nhập trước.

**Acceptance Criteria:**
- Given `npm run lint && npm run typecheck && npm test && npm run build && npm run test:e2e`, then tất cả pass.

## Implementation Notes

- Hook `onServe` không có trong JSVM 0.40.4 → tạo tài khoản bằng migration `1790000001_bootstrap_owner.js` (xem Spec Change Log). `server/pb_hooks/` hiện trống (`.gitkeep`).
- Điều hướng về `/` sau đăng nhập nằm ở `AuthGate` (theo dõi chuyển trạng thái), vì `LoginScreen` bị unmount ngay khi `authStore` đổi nên callback `onSuccess` của nó không chạy.
- Lời nhắn lỗi nằm trong `data/errors.ts` (spine: repo ném `AppError` có message giọng Nồi Thần; `data/` không được import `ui/`).
- `pb.autoCancellation(false)`: tránh SDK tự huỷ request trùng (StrictMode, TanStack Query).
- E2E: `playwright.config.ts` chạy PocketBase thật ở cổng 8097 trên `e2e/.pb_data` (xoá mỗi lần), tài khoản e2e qua env; `vite preview` proxy `/api` theo `PB_URL`. Hằng số chung ở `e2e/env.ts`.
- Đã kiểm tay bằng curl: khởi động lại PocketBase vẫn 1 household; thành viên không tạo được household (403).

## Spec Change Log

- Lần 1 (khi code): Boundaries ghi hook `onServe`, nhưng JSVM của PocketBase 0.40.4 không có `onServe`, còn `onBootstrap` chạy trước khi migration của repo được áp dụng (lỗi `sql: no rows` khi tìm `households`). Đã sửa: tạo tài khoản bằng migration thứ hai. Trạng thái xấu tránh được: hook panic làm server không khởi động. KEEP: logic idempotent (tìm user theo email, chỉ tạo household nếu user chưa thuộc household nào).

## Review Triage Log

| # | Nguồn | Finding | Verdict | Bằng chứng | Route |
|---|---|---|---|---|---|
| 1 | verif, blind | `refreshSession` (401/403/404 đăng xuất, lỗi mạng giữ phiên) không có test | medium | Chỉ bị mock trong `TabBar.test.tsx` | patch — `data/auth.test.ts` |
| 2 | blind, edge | Refresh ép đăng xuất không xoá cache; 401 từ query không đăng xuất | medium | `refreshSession` chỉ `authStore.clear()`; không có `onError` toàn cục | patch — `data/queryClient.ts`: `onError` unauthorized → clear; `authStore.onChange` token rỗng → `queryClient.clear()`; không retry lỗi unauthorized |
| 3 | edge, blind | Token hết hạn khi app mở lâu không được phát hiện | medium | Không có timer; `refreshSession` return sớm khi `!isValid` | patch — kiểm tra mỗi giờ; token hết hạn còn trong store thì xoá |
| 4 | edge | Refresh đang chạy mà đăng xuất → đăng nhập lại | low | SDK lưu token khi refresh thành công | patch — `logoutEpoch` |
| 5 | blind, edge | `npm run pb` không nạp `.env`; migration chạy một lần nên tài khoản chủ app không bao giờ được tạo | medium | PocketBase không đọc `.env` | patch — `scripts/pb-dev.sh` nạp `.env`; ghi rõ "chỉ lần đầu" trong `.env.example` |
| 6 | blind, edge | Script tải binary không kiểm checksum; so phiên bản bằng `grep` (0.40.40 cũng khớp); không kiểm curl/unzip | medium | Chạy binary tải từ mạng | patch — `shasum -a 256 -c`, so chuỗi chính xác, kiểm lệnh |
| 7 | blind | Lỗi cũ vẫn hiện khi gõ lại; email toàn khoảng trắng bật nút | low | `login.reset()` không được gọi | patch + test |
| 8 | verif, blind, edge | Test e2e mang tên `useCurrentHousehold` nhưng gọi thẳng REST | low | Hook chưa có nơi dùng | patch — đổi tên test; test hook làm ở Story 1.4 (nơi đầu tiên dùng hook) |
| 9 | edge, blind | Không có household → 404 → báo "server" | low | `getFirstListItem` 404 | reject — Story 1.4 xử lý khi dùng hook |
| 10 | verif | Nhánh migration thiếu env / user có sẵn không có test tự động | medium (chưa kiểm) | Cần cấu hình khởi động PocketBase thứ hai | defer |
| 11 | edge, blind | Mật khẩu < 8 / email sai / tên > 100 làm migration lỗi, server không khởi động | false | Lỗi to, rõ ràng; migration không được đánh dấu đã chạy nên sửa env rồi khởi động lại là xong | reject |
| 12 | edge, blind | `catch (_)` nuốt mọi lỗi khi tìm user; migration không có down | low | Lỗi DB thật thì `save` cũng lỗi, migration dừng | reject |
| 13 | blind | "Chạy lại" pass vì migration không chạy lại chứ không phải nhờ logic idempotent | low | Đúng; hành vi vẫn đúng | reject (chỉ sửa được bằng sửa spec) |
| 14 | blind | Refresh ngay sau đăng nhập là thừa; refresh không gom | low | Một request thừa | reject |
| 15 | blind | Đăng xuất cả khi 404; thêm mã lỗi ngoài spec | low | 404 = tài khoản đã bị xoá; `conflict` dùng ở Story 1.4 | reject |
| 16 | blind | `server/pb_hooks` không có `.gitkeep` | false | `ls -a` thấy `.gitkeep` | reject |
| 17 | blind | Trạng thái spec và sprint lệch | false | Sprint lên `review` ở bước trình bày theo quy trình | reject |
| 18 | blind, edge | Playwright đụng PocketBase còn sót trên cổng 8097 | low | Chỉ khi lần chạy trước bị kill dở | reject |
| 19 | blind | Proxy dev chỉ `/api`, prod chưa phục vụ `pb_public` | low | Story 1.9 | reject |
| 20 | blind, edge | Một user nhiều household, không thêm thành viên trong app, không index `members` | low | Spine để "nhiều user/household" vào Deferred | reject |
| 21 | blind | `.button-secondary` chưa dùng; tương phản nút disabled | low | Story 1.5 dùng; phần tử disabled không thuộc yêu cầu tương phản | reject |
| 22 | blind | Mock `data/auth` trong TabBar test mong manh | low | Chưa gây lỗi | reject |

## Verification

**Commands:**
- `cd web && npm run lint && npm run typecheck && npm test && npm run build && npm run test:e2e` -- expected: pass.
