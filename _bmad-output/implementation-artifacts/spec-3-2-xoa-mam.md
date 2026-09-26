---
title: 'Story 3.2: Xoá mâm trong lịch sử'
type: 'feature'
created: '2026-09-26'
status: 'done'
baseline_commit: 'abd6e48fed4525bac31f3731bfd1d35af757c6ad'
route: 'dispatch'
review_loop_iteration: 0
context:
  - '{project-root}/_bmad-output/implementation-artifacts/epic-3-context.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** Chốt nhầm mâm thì các món trong đó bị giấu khỏi nồi mấy ngày và nằm sai trong lịch sử.

**Approach:** Vuốt hàng lịch sử sang trái (hoặc nút "Xoá mâm" cho bàn phím/trình đọc) → xác nhận nút `danger` → xoá hẳn draw (draw chỉ create/delete); làm mới các truy vấn draw để món không còn bị tránh trùng và lịch sử cập nhật.

## Boundaries & Constraints

**Always:**
- `ui/useSwipeToDelete.ts`: tách logic vuốt của `DishCard` (ngưỡng 72px, quyết định hướng sau ngưỡng rung tay, bắt pointer, cancel không xin xoá, chỉ con trỏ chính, bỏ chặn click sau khi nhả) thành hook dùng chung; `DishCard` dùng lại hook, hành vi không đổi.
- `ui/ConfirmDialog.tsx`: hộp xác nhận chung (`Modal` role `alertdialog`, mô tả, "Thôi" + nút `danger`, đang xử lý khoá, lỗi + "Thử lại"); `DeleteItemConfirm` dùng lại.
- `data/draws.ts`: `useDeleteDraw(setKey)` = `delete(id)`; 404 (đã xoá ở máy khác) coi là thành công; xong invalidate key gốc `queryKeys.draws(...)` (lịch sử, mâm gần đây, "đã có mâm").
- Lịch sử: mỗi hàng vuốt được (dải đỏ "Xoá" phía sau) và có nút "Xoá mâm" (44px, nhãn "Xoá mâm <ngày giờ>"); xác nhận "Xoá mâm này?" / "Mấy món trong mâm sẽ được quay lại ngay."; xoá xong toast "Đã xoá mâm."; hàng biến mất.

**Never:** Không sửa draw; không xoá món.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Xoá mâm | Xoá mâm → Xoá | draw bị xoá khỏi server, hàng biến mất, toast | N/A |
| Huỷ | Xoá mâm → Thôi | không đổi gì | N/A |
| Vuốt | vuốt hàng trái > 72px | mở xác nhận | N/A |
| Tránh trùng | xoá mâm có X hôm nay | X có thể ra ở lần quay kế | N/A |
| Đã xoá ở máy khác | delete trả 404 | coi là xong | N/A |
| Lỗi mạng | delete lỗi | xác nhận còn mở, lời nhắn + Thử lại | AppError |

</frozen-after-approval>

## Code Map

- `web/src/ui/DishCard.tsx` -- logic vuốt hiện có (tách ra hook).
- `web/src/features/library/DeleteItemConfirm.tsx` -- hộp xác nhận hiện có (tách thành `ConfirmDialog`).
- `web/src/data/draws.ts` -- `useDrawHistory`, key `queryKeys.draws`, `useCommitTray` (mẫu invalidate).
- `web/src/features/history/HistoryScreen.tsx` -- hàng lịch sử.

## Tasks & Acceptance

**Execution:**
- [x] `web/src/ui/useSwipeToDelete.ts`, `web/src/ui/DishCard.tsx` -- tách hook (test cũ của DishCard vẫn xanh).
- [x] `web/src/ui/ConfirmDialog.tsx` + `.css` (+ test), `web/src/features/library/DeleteItemConfirm.tsx` -- hộp xác nhận chung.
- [x] `web/src/data/draws.ts` (+ test) -- `useDeleteDraw`.
- [x] `web/src/features/history/HistoryScreen.tsx` + `.css` (+ test) -- vuốt/nút xoá, xác nhận.
- [x] `web/src/ui/copy.ts` -- chuỗi.
- [x] `web/e2e/history.spec.ts` -- xoá mâm thật: draw mất khỏi server, hàng biến mất; unit test kiểm mâm gần đây (tránh trùng) được cập nhật ngay.
- [x] `web/src/features/history/HistoryRow.tsx` -- hàng lịch sử tách riêng (vuốt, nút xoá).

**Acceptance Criteria:**
- Given `npm run lint && npm run typecheck && npm test && npm run build && npm run test:e2e`, then pass.

## Implementation Notes

- `ui/useSwipeToDelete` giữ nguyên mọi sửa lỗi vuốt của Story 2.5; `DishCard` và `HistoryRow` dùng chung. `ui/ConfirmDialog` thay phần thân của `DeleteItemConfirm` (CSS đổi tên từ `delete-confirm` sang `confirm-dialog`).
- `HistoryRow` tách khỏi `HistoryScreen`; mỗi hàng có nút "Xoá mâm" (thay thế cho người không vuốt được).

## Spec Change Log

## Review Triage Log

| # | Nguồn | Finding | Verdict | Bằng chứng | Route |
|---|---|---|---|---|---|
| 1 | blind, edge, verif | Tách `HistoryRow` làm mất điều kiện bỏ qua mâm hỏng (không ngày, không món) | medium | | patch — trả lại; nhãn "không rõ giờ" khi thiếu ngày; test |
| 2 | blind, edge | Nút thùng rác trong vùng vuốt không chặn cú click đuôi | low | | patch |
| 3 | blind, edge | Xoá xong hàng còn tới khi tải lại xong (dialog kẹt "Đang xoá…") | medium | Chờ invalidate cả lịch sử | patch — bỏ ngay khỏi cache lịch sử + mâm gần đây rồi mới làm mới; test |
| 4 | blind | Toast/đóng dialog mất nếu màn unmount khi đang xoá | low | Callback cấp lần gọi | patch — callback cấp hook `useDeleteDraw(setKey, onDeleted)` |
| 5 | edge | Household mất khi dialog mở → dialog khoá cứng | low | `busy` gồm `!ready` | patch — `confirmDisabled` riêng, vẫn huỷ được; test |
| 6 | blind, edge | `ConfirmDialog` bỏ chặn bấm hai lần | low | | patch |
| 7 | verif, blind | Làm mới mâm gần đây/"đã có mâm" sau khi xoá chưa kiểm | medium | | patch — test cache mâm gần đây rỗng ngay sau xoá |
| 8 | verif | Dialog đóng sau khi xoá thành công chưa kiểm | medium | | patch — unit + e2e |
| 9 | blind, edge | E2E không dọn khi hỏng | low | | patch — `finally` |
| 10 | blind | `ConfirmDialog` (ui) mượn chuỗi của editor; `DishCard` viết cứng "Xoá" | low | | patch — `copy.common` |
| 11 | blind | Spec thiếu `HistoryRow`; claim "món lại có thể ra" ở e2e | low | | patch — cập nhật Tasks |
| 12 | blind | Vuốt hàng xung đột cuộn ngang danh sách món | false | Danh sách món `flex-wrap`, không cuộn ngang | reject |
| 13 | edge | Nhiều household | false | v1 mỗi người một household | reject |
| 14 | edge | Mâm biến mất (máy khác) khi dialog đang mở | low | Xoá lại → 404 coi là xong | reject |

## Verification

**Commands:**
- `cd web && npm run lint && npm run typecheck && npm test && npm run build && npm run test:e2e` -- expected: pass.
