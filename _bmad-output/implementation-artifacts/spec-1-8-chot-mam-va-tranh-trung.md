---
title: 'Story 1.8: Chốt mâm và tránh trùng'
type: 'feature'
created: '2026-09-26'
status: 'done'
baseline_commit: '8438f4007bb27583d29cde207543912a3a6643e2'
route: 'dispatch'
review_loop_iteration: 0
context:
  - '{project-root}/_bmad-output/implementation-artifacts/epic-1-context.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** Chưa lưu được bữa đã chọn, nên nồi có thể ra lại đúng món vừa ăn.

**Approach:** Collection `draws` (chỉ tạo/xoá, snapshot `entries`); nút "Chốt mâm!" gọi đúng một mutation với ID do client sinh, thử lại dùng lại ID; engine nhận các draw gần đây để tránh trùng; gợi ý lần đầu chỉ hiện khi chưa có draw nào.

## Boundaries & Constraints

**Always:**
- Migration `draws`: `household` (relation), `setKey`, `chosenAt` (date, bắt buộc), `entries` (json), `created`; rule list/view/delete theo household, create thêm kiểm body, update `null`; index `(household, setKey, chosenAt)`.
- `data/draws.ts`: `useRecentDraws(set, cooldownDays)` trả draw của Bộ có `chosenAt` trong khoảng `cooldownDays + 1` ngày gần nhất (engine lọc chính xác theo ngày lịch), `chosenAt` chuẩn hoá về ISO (`T`) vì PocketBase trả dạng có dấu cách; `useHasDraws(setKey)`; `useCommitTray(setKey)` mutation nhận `{ id, entries }`, tạo draw với `chosenAt = new Date().toISOString()`, lỗi trùng ID coi là thành công, xong thì invalidate key draws. Key ở `data/keys.ts`.
- Mâm: nút chính "Chốt mâm!" (màu `primary`, cạnh "Đổi cả mâm"); khoá khi đang gửi hoặc mâm không có ô nào có món. `entries` = các ô có món theo thứ tự trên mâm: `{ itemId, groupKey, name, rarity, order }` (order 0..n-1, bỏ ô trống). ID sinh một lần khi bấm; lỗi thì giữ nguyên mâm, hiện lời nhắn `AppError` + "Thử lại" (gửi lại đúng ID + entries cũ); đổi mâm sau khi lỗi thì lần chốt sau dùng ID mới.
- Chốt xong: đóng mâm, xoá ô trong store, màn Quay hiện phản hồi ngắn (`role="status"`) "Chốt rồi! Mấy món này nồi giấu vài hôm nha 😋".
- Màn Quay: truyền draw gần đây + `defaultCooldownDays` vào engine (chưa có `set_configs` tới Story 3.3); gợi ý "Mở thử đi cả nhà!" chỉ khi `useHasDraws` = false.

**Never:** Không sửa draw; không ghi server khi đổi/giữ/thêm ô; chưa có màn Lịch sử (Epic 3).

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Chốt | mâm 3 món, chạm "Chốt mâm!" | 1 draw, entries 3 món đúng thứ tự, mâm đóng, phản hồi ngắn | N/A |
| Tránh trùng | vừa chốt X, quay lại nhiều lần | X không ra ở ô nào (trừ khi đang giữ) | N/A |
| Mất mạng | create thất bại | mâm giữ nguyên, lời nhắn + "Thử lại" | AppError network |
| Thử lại | thử lại sau lỗi | dùng đúng ID cũ; kết quả 1 draw | trùng ID = thành công |
| Mâm trống | mọi ô trống | "Chốt mâm!" khoá | N/A |
| Gợi ý | đã có draw | không hiện "Mở thử đi cả nhà!" | N/A |
| Sửa draw | PATCH draw | bị từ chối | N/A |

</frozen-after-approval>

## Code Map

- `server/pb_migrations/1790000002_items.js` -- mẫu rule; trùng ID trả `validation_not_unique` ở `id`; ngày trả dạng `YYYY-MM-DD HH:mm:ss.sssZ`.
- `web/src/data/{items,errors,keys,household,ids}.ts` -- `isConflict(err,'id')`, `newId`, `useCurrentHousehold`.
- `web/src/features/tray/{MealTray,store}.ts(x)` -- nút hành động; store cần `clear()`.
- `web/src/features/spin/SpinScreen.tsx` -- hàm `draw` (đang `recentDraws: []`), prop `hasHistory`.
- `web/src/engine` -- `RecentDraw { chosenAt, entries: {itemId}[] }`.

## Tasks & Acceptance

**Execution:**
- [x] `server/pb_migrations/1790000003_draws.js` -- collection.
- [x] `web/src/data/draws.ts` (+ test) , `keys.ts` -- hooks.
- [x] `web/src/features/tray/store.ts` (+ test) -- `clear()`, `commitId` (sinh/giữ/đổi khi mâm đổi).
- [x] `web/src/features/tray/MealTray.tsx` + `.css` -- nút Chốt, lỗi + Thử lại.
- [x] `web/src/features/spin/SpinScreen.tsx` (+ test) -- draw gần đây vào engine, gợi ý, phản hồi sau chốt.
- [x] `web/src/ui/copy.ts` -- chuỗi.
- [x] `web/e2e/commit.spec.ts` -- chốt, tránh trùng qua nhiều lần quay, lỗi mạng + thử lại ra đúng 1 draw, PATCH bị từ chối.

**Acceptance Criteria:**
- Given `npm run lint && npm run typecheck && npm test && npm run build && npm run test:e2e`, then pass.

## Implementation Notes

- Sau review: `failedCommitId` + `replaceId` để không thành hai mâm khi phản hồi mất rồi mâm đổi; createRule giới hạn `chosenAt` trong `@yesterday..@tomorrow`; xử lý thành công ở cấp hook.

- PocketBase trả `chosenAt` dạng `2026-09-26 10:11:12.345Z` → `toIsoDate` đổi sang `T` (Safari không parse dấu cách).
- `commitId` nằm trong store mâm: sinh ở lần bấm đầu, giữ khi thử lại, về `null` khi mâm đổi (đổi/thêm/bỏ ô, mở mâm mới); `clear()` sau khi chốt.
- Nút "Mở nồi!" chờ cả `useRecentDraws` để luật tránh trùng luôn có hiệu lực.
- Sau khi chốt, focus đưa vào dòng phản hồi `role="status"` (không rơi ra body).
- E2E "mất mạng": chặn phản hồi của lần POST đầu sau khi server đã tạo draw (`route.fetch()` rồi `abort`) → thử lại với cùng ID nhận `validation_not_unique` → coi là thành công → đúng 1 draw.

## Spec Change Log

## Review Triage Log

| # | Nguồn | Finding | Verdict | Bằng chứng | Route |
|---|---|---|---|---|---|
| 1 | blind, edge | Đang chốt vẫn đổi/giữ/thêm/bỏ ô, đóng mâm được; đóng mâm thì callback thành công cấp lần gọi không chạy (draw lưu nhưng mâm không xoá, không phản hồi) | high | TanStack v5 bỏ callback của `mutate()` khi component unmount | patch — bọc nội dung mâm trong `<fieldset disabled>` khi đang chốt, chặn Esc/nền/Để sau; xử lý thành công ở cấp hook (`useCommitTray(setKey, onCommitted)`); test |
| 2 | blind | Phản hồi lần đầu mất, người dùng đổi mâm rồi chốt → 2 draw (1 "ma") | medium | ID mới cho mâm mới | patch — store nhớ `failedCommitId`; lần chốt với ID khác gửi `replaceId` → xoá bản ghi đó trước (404 bỏ qua); test |
| 3 | blind, edge | Lời nhắn lỗi cũ còn sau khi đổi mâm; "Thử lại" chốt mâm khác | medium | `reset()` chỉ ở "Đổi cả mâm" | patch — chỉ hiện lỗi khi `failedCommitId === commitId`; test |
| 4 | blind, edge | Tải mâm gần đây lỗi → quay vẫn được, bỏ qua tránh trùng | medium | `recentDraws.data ?? []` | patch — khoá nút khi chưa có dữ liệu (cooldown > 0), hiện lỗi + Thử lại; test |
| 5 | edge | Chốt xong mà tải lại lỗi → cache cũ, món vừa chốt ra lại | medium | | patch — `setQueriesData` thêm draw mới vào cache + `any=true` trước khi invalidate; test |
| 6 | blind, edge | Server tin `chosenAt` của client | medium | Giờ máy lệch làm hỏng tránh trùng | patch — createRule chỉ nhận `@yesterday ≤ chosenAt ≤ @tomorrow`; e2e |
| 7 | edge, blind | `entries` sai dạng lọt vào engine | low | | patch — `toDraw` lọc phần tử không có `itemId` |
| 8 | verif | Gợi ý lần đầu quay lại sau khi chốt chưa được kiểm | medium | | patch — e2e kiểm sau mỗi lần quay |
| 9 | verif | Invalidate/cập nhật cache sau chốt chưa kiểm | medium | | patch — gộp #5 |
| 10 | verif | Khoá nút khi đang tải mâm gần đây chưa kiểm | medium | | patch — gộp #4 |
| 11 | verif | `commitId` đổi chỉ được kiểm với `rerollAll` | medium | | patch — kiểm cả `rerollOne/addSlot/removeSlot/showResult` |
| 12 | verif | Test "cooldown 0" không thể fail | low | Khẳng định trước khi household về | patch — chờ household rồi mới kiểm |
| 13 | verif | Rule household của `draws` chưa kiểm | medium | | patch — e2e người ngoài: list 0, view 404, tạo/xoá bị từ chối |
| 14 | verif, blind | `trayEntries` bỏ ô trống + đánh số chưa kiểm | medium | | patch — unit test |
| 15 | blind | Test thử lại đặt `commitId` bằng tay (vòng tròn) | medium | | patch — viết lại qua `onError` của mutation |
| 16 | blind | E2E không kiểm thử lại gửi đúng ID | low | | patch — bắt ID của 2 lần POST |
| 17 | edge | Focus rơi khi dòng phản hồi bị gỡ lúc quay | false | Bấm "Mở nồi!" thì focus đã ở nút | reject |
| 18 | blind | E2E đếm theo tổng draw của tài khoản | low | `workers: 1` | reject |
| 19 | blind | Emoji trong `role=status` bị đọc | low | Giọng văn cho phép 1 emoji | reject |
| 20 | blind | "Để sau" mượn class `tray-add__link`; setTimeout focus không huỷ | low | | reject |

## Verification

**Commands:**
- `cd web && npm run lint && npm run typecheck && npm test && npm run build && npm run test:e2e` -- expected: pass.
