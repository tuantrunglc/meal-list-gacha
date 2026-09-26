---
title: 'Story 1.4: Nồi có sẵn món mặc định'
type: 'feature'
created: '2026-09-26'
status: 'done'
baseline_commit: 'b052365759ba234cd3d0e8d95c9921f4e5c1c1cc'
route: 'dispatch'
review_loop_iteration: 0
context:
  - '{project-root}/_bmad-output/implementation-artifacts/epic-1-context.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** Household mới chưa có món nào nên chưa mở nồi được.

**Approach:** Migration tạo collection `items`; `useItems(set)` nạp những món seed mà household chưa có bản ghi nào (kể cả đã xoá mềm) bằng ID tự sinh, an toàn khi hai máy nạp cùng lúc. Component ảnh món dùng fallback ảnh upload → ảnh seed → đĩa trống.

## Boundaries & Constraints

**Always:**
- Migration `items`: `household` (relation bắt buộc), `setKey`, `groupKey`, `name` (text bắt buộc), `rarity` (số nguyên 1–3 bắt buộc), `tags` (json), `image` (file 1 ảnh, webp/jpeg/png ≤ 5MB, thumb `400x300`, `protected`), `attrs` (json), `seedKey` (text), `deleted` (bool), `created`/`updated` (autodate). Unique index `(household, setKey, seedKey)` khi `seedKey != ''`. Rule: list/view/delete `household.members.id ?= @request.auth.id`; create thêm `@request.body.household.members.id ?= @request.auth.id`; update thêm điều kiện đó nếu body có `household`.
- `data/ids.ts`: `newId()` 15 ký tự `[a-z0-9]`, ngẫu nhiên đều từ `crypto.getRandomValues`.
- `data/items.ts`: kiểu `Item` (camelCase như DB, `attrs: unknown`, `imageFile: string`); `useItems(set)` (feature truyền Bộ vào vì `data/` không được import `sets/`) trả món `deleted=false` của household, mới sửa trước; món seed nào chưa có bản ghi (kể cả đã xoá mềm) thì nạp rồi trả — lần nạp bị ngắt giữa chừng được nạp tiếp, món người dùng đã xoá không quay lại. Lỗi "trùng" từ unique index hoặc trùng ID khi tạo được coi là thành công. Tạo song song có giới hạn.
- `useCurrentHousehold()`: tài khoản không thuộc household nào trả `AppError` mã `no-household` (lời nhắn thân thiện), không phải `server`.
- `ui/DishImage.tsx`: nhận danh sách nguồn theo thứ tự ưu tiên + `alt`; ảnh lỗi thì thử nguồn kế; hết nguồn thì hiện minh hoạ đĩa trống kèm chữ "Thêm ảnh"; không bao giờ hiện icon ảnh vỡ; khung 4:3. `data/items.ts` có `itemImageSources(item)` trả `[thumb upload nếu có, /seed/<seedKey>.webp nếu có seedKey]`.
- Màn Quay gọi `useItems` của Bộ mặc định để lần đầu mở app là nạp seed; lỗi thì hiện lời nhắn + nút "Thử lại".

**Never:** Chưa upload ảnh (Story 2.3), chưa có UI thư viện. Không gọi `pocketbase` ngoài `data/`. Không lưu màu/nhãn vào DB.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Lần đầu | household chưa có món | tạo đủ seed, `useItems` trả đủ | N/A |
| Hai máy cùng nạp | 2 lần nạp chạy song song | vẫn đúng số món seed, không lỗi | trùng coi là thành công |
| Đã đủ | mọi seedKey đã có bản ghi (kể cả đã xoá) | không nạp lại | N/A |
| Nạp dở | lần trước bị ngắt, thiếu một số seedKey | nạp tiếp phần thiếu | N/A |
| Xoá mềm | món `deleted=true` | không có trong `useItems` | N/A |
| Người ngoài | user khác household list/tạo `items` của mình | 0 bản ghi / bị từ chối | N/A |
| Ảnh | chưa upload, không có file seed | đĩa trống + "Thêm ảnh" | ảnh lỗi → nguồn kế |
| Không household | user không thuộc nhà nào | lỗi `no-household` | lời nhắn thân thiện |

</frozen-after-approval>

## Code Map

- `server/pb_migrations/1790000000_init_households.js` -- mẫu migration, rule `members.id ?= @request.auth.id`.
- `web/src/data/{pb,errors,keys,household,queryClient}.ts` -- lớp data hiện có; `AppErrorCode` thêm `no-household`.
- `web/src/sets/registry.ts` -- `getSet`, `DEFAULT_SET_KEY`; `SetDefinition.seed` (`seedKey, groupKey, name, rarity, tags, attrs`).
- `web/src/features/spin/SpinScreen.tsx` -- màn tạm, sẽ viết lại ở 1.5.
- `web/e2e/{env,helpers}.ts`, `web/playwright.config.ts` -- e2e với PocketBase thật (cổng 8097).

## Tasks & Acceptance

**Execution:**
- [x] `server/pb_migrations/1790000002_items.js` -- collection + index + rule.
- [x] `web/src/data/ids.ts` (+ test) -- `newId`.
- [x] `web/src/data/items.ts` (+ test với `pb` mock: nạp khi trống, không nạp khi có, lỗi trùng coi là thành công, lọc `deleted`) -- `useItems`, `seedSet`, `itemImageSources`.
- [x] `web/src/data/household.ts`, `errors.ts`, `keys.ts` (+ test hook) -- `no-household`, key `items(setKey)`.
- [x] `web/src/ui/DishImage.tsx` + `.css` + test -- fallback ảnh.
- [x] `web/src/features/spin/SpinScreen.tsx` -- gọi `useItems`, lỗi + thử lại.
- [x] `web/e2e/items.spec.ts` -- sau đăng nhập có đủ món seed; tải lại không nhân đôi; tạo trùng `seedKey` qua API bị unique index chặn; khách không thấy món.

**Acceptance Criteria:**
- Given `npm run lint && npm run typecheck && npm test && npm run build && npm run test:e2e`, then tất cả pass.

## Implementation Notes

- Đã thử trên PocketBase thật: trùng `seedKey` → 400 với `validation_not_unique` ở `household/setKey/seedKey`; trùng ID → 400 `validation_not_unique` ở `id`; đổi `household` qua update → 404; `rarity` 4 → 400; khách list → 0. `isConflict()` dựa vào mã `validation_not_unique`.
- `image` khai báo `protected: true` (mọi dữ liệu sau đăng nhập); URL ảnh cần file token — `itemImageSources` nhận `fileToken`, việc lấy token làm ở Story 2.3 (chưa có ảnh upload).
- Chưa có file `web/public/seed/*.webp`: mọi món seed đi tới đĩa trống qua `onError` (prod: `indexFallback` trả HTML → ảnh lỗi → fallback).
- `.oxlintrc.json`: thêm override cho `src/data`, `src/sets`, `src/ui` theo đồ thị phụ thuộc của spine, có test trong `tests/lint-rules.test.ts`.

## Spec Change Log

- Lần 1 (khi code): luật "chỉ nạp khi household chưa có món nào" làm household bị thiếu món mãi mãi nếu lần nạp đầu bị ngắt (e2e bắt được: đóng trang khi đang nạp → 38/51 món). Đã sửa thành "nạp các seedKey chưa có bản ghi". Trạng thái xấu tránh được: nồi thiếu món vĩnh viễn. KEEP: món đã xoá mềm vẫn có bản ghi nên không bị nạp lại; lỗi trùng coi là thành công.
- Lần 1: `useItems` nhận Bộ (`SeedSource`) thay vì `setKey` vì đồ thị phụ thuộc không cho `data/` import `sets/`; lint giờ chặn đủ đồ thị (data/sets/ui).

## Review Triage Log

| # | Nguồn | Finding | Verdict | Bằng chứng | Route |
|---|---|---|---|---|---|
| 1 | edge, blind, verif | "Thử lại" không chạy lại bước household; `refetch()` có thể chạy queryFn với household undefined; trạng thái ghép mâu thuẫn | medium | Ghi đè `error` lên query bị tắt | patch — `useItems` trả `ItemsResult` gọn, `refetch` đúng bước; queryFn chặn thiếu household; test |
| 2 | blind | `deleteRule` cho xoá hẳn → món seed đã xoá quay lại | medium | Seed dựa vào bản ghi còn tồn tại | patch — `deleteRule: null`; e2e xác nhận |
| 3 | blind | Update đổi được `seedKey`/`setKey` → seed bị nạp trùng | medium | updateRule chỉ khoá household | patch — khoá `setKey`, `seedKey` khi update; e2e |
| 4 | blind | Trùng ID bị coi là thành công → mất món seed | medium | `seedSet` luôn sinh ID mới nên trùng ID là va chạm thật | patch — `isConflict(err, field)`: trùng seedKey = xong, trùng id = sinh ID mới (tối đa 3 lần); test |
| 5 | blind, verif | Không có test với người dùng household khác | medium | Chỉ test khách | patch — e2e tạo user + household thứ hai bằng superuser |
| 6 | blind, verif, edge | E2E đếm `>= 30`, `networkidle` có thể sớm | medium | Nạp dở 38/51 cũng qua | patch — poll tới đúng `foodSet.seed.length`, so tập seedKey, không có alert |
| 7 | verif | Màn Quay lỗi + Thử lại không có test | medium | `TabBar.test` mock mất | patch — `SpinScreen.test.tsx` |
| 8 | verif | `useItems` chuyển lỗi household chưa có test | medium | Chỉ test `useCurrentHousehold` | patch — gộp vào #1 |
| 9 | edge | `no-household` bị retry vô ích | low | retry mặc định 2 lần | patch — không retry `no-household` |
| 10 | edge | Một món lỗi, các worker khác vẫn tạo tiếp | low | Chồng lên lần thử lại | patch — cờ `failed` |
| 11 | edge | `DishImage` nguồn rỗng chặn các nguồn sau | low | `''` được coi là nguồn | patch — lọc nguồn rỗng |
| 12 | edge, blind | E2E viết cứng `setKey`/`groupKey` | low | | patch — lấy từ món thật |
| 13 | blind | Alias `@/`, `src/` lách được rule data/sets/ui | low | Chỉ engine có | patch |
| 14 | blind | Màn Quay không có trạng thái đang tải | low | Story 1.5 dựng màn Quay thật | reject |
| 15 | blind | Prod tải HTML cho mỗi ảnh seed chưa có | low | Chỉ tốn request; fallback vẫn đúng | reject |
| 16 | blind | Sửa nội dung seed ở bản sau không lan tới household cũ | low | "Khôi phục món mặc định" (Story 3.4) làm việc này | reject |
| 17 | blind | `toItem` tin dữ liệu DB | low | Schema DB đã ràng buộc rarity 1–3 | reject |
| 18 | blind | Định dạng lại `.oxlintrc.json` gây nhiễu diff | low | Chỉ là định dạng | reject |
| 19 | blind | Trạng thái spec và sprint lệch | false | Sprint lên `review` ở bước trình bày | reject |

## Verification

**Commands:**
- `cd web && npm run lint && npm run typecheck && npm test && npm run build && npm run test:e2e` -- expected: pass.
