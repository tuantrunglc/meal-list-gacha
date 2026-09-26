---
title: 'Story 2.5: Xoá món'
type: 'feature'
created: '2026-09-26'
status: 'done'
baseline_commit: 'da7ebd3c318c0a1dba0799504407a96e0c86d5aa'
route: 'dispatch'
review_loop_iteration: 0
context:
  - '{project-root}/_bmad-output/implementation-artifacts/epic-2-context.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** Món nhà không nấu nữa vẫn nằm trong nồi và thư viện.

**Approach:** Xoá mềm (`deleted=true`) qua nút "Xoá" trong Chi tiết món hoặc vuốt thẻ sang trái trong Thư viện; luôn xác nhận với nút màu `danger`. Món biến mất khỏi thư viện và vòng quay; lịch sử vẫn hiện được nhờ snapshot `entries`.

## Boundaries & Constraints

**Always:**
- `data/items.ts`: `useDeleteItem(setKey)` = `update(id, { deleted: true })` (server cấm xoá hẳn), invalidate danh sách món; lỗi → `AppError`.
- `ItemDetail` nhận `onDelete?`: có thì hiện nút "Xoá" (viền/chữ màu `danger`, 44px).
- Xác nhận (trong `ui/Modal`, một lớp): tiêu đề "Xoá món <tên>?", câu "Nồi sẽ không dọn món này nữa. Mâm cũ trong lịch sử vẫn còn.", nút "Thôi" và "Xoá" (`button-danger`); đang xoá thì khoá, lỗi thì lời nhắn + "Thử lại". Xoá xong: toast "Đã bỏ món khỏi nồi.", đóng.
- Thư viện: Xoá trong chi tiết → đóng chi tiết, mở xác nhận; "Thôi" → mở lại chi tiết. Vuốt thẻ sang trái quá ~72px (`pointer` events, `touch-action: pan-y` để vẫn cuộn dọc được) → mở xác nhận; vuốt chưa đủ thì thẻ trượt về; vuốt không kích hoạt "mở chi tiết".
- Món đã xoá: không có trong `useItems` (thư viện, vòng quay); ô mâm đang giữ món đó hiện như món không còn.

**Never:** Không xoá hẳn bản ghi hay file ảnh. Không có hoàn tác trong story này ("Khôi phục món mặc định" ở Story 3.4 chỉ áp cho món seed).

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Xoá từ chi tiết | Xoá → xác nhận Xoá | bản ghi `deleted=true`, món biến mất khỏi lưới, toast | N/A |
| Huỷ | Xoá → Thôi | không đổi gì, quay lại chi tiết | N/A |
| Vuốt đủ | vuốt thẻ trái 100px | mở xác nhận | N/A |
| Vuốt ít | vuốt 30px | thẻ trượt về, không mở gì | N/A |
| Lỗi mạng | update lỗi | xác nhận còn mở, lời nhắn + Thử lại | AppError |
| Vòng quay | món đã xoá | không bao giờ ra | N/A |

</frozen-after-approval>

## Code Map

- `web/src/data/items.ts` -- `useUpdateItem` (mẫu), `queryKeys.items`.
- `web/src/features/item-detail/ItemDetail.tsx` -- `onEdit` (mẫu nút).
- `web/src/features/library/LibraryScreen.tsx` -- `openId`, `editingItem`, `Modal`.
- `web/src/ui/{DishCard,Modal,toast,copy,global.css}` -- thẻ, modal, toast, `.button-danger`.
- `server/pb_migrations/1790000002_items.js` -- `deleteRule: null`.

## Tasks & Acceptance

**Execution:**
- [x] `web/src/data/items.ts` (+ test) -- `useDeleteItem`.
- [x] `web/src/features/library/DeleteItemConfirm.tsx` (+ test) -- xác nhận.
- [x] `web/src/ui/DishCard.tsx` + `.css` (+ test) -- vuốt để xoá.
- [x] `web/src/features/item-detail/ItemDetail.tsx` -- nút Xoá.
- [x] `web/src/features/library/LibraryScreen.tsx` (+ test) -- nối.
- [x] `web/src/ui/copy.ts` -- chuỗi.
- [x] `web/e2e/delete.spec.ts` -- xoá thật: `deleted=true`, biến mất khỏi lưới; vuốt mở xác nhận.

**Acceptance Criteria:**
- Given `npm run lint && npm run typecheck && npm test && npm run build && npm run test:e2e`, then pass.

## Implementation Notes

- Vuốt: `pointer` events trên `DishCard`, bỏ nếu kéo dọc trước (để cuộn), ngưỡng 72px; vừa vuốt xong thì chặn `click` mở chi tiết.
- E2E vuốt bằng `page.mouse` (Chrome desktop phát pointer events giống cảm ứng).

## Spec Change Log

## Review Triage Log

| # | Nguồn | Finding | Verdict | Bằng chứng | Route |
|---|---|---|---|---|---|
| 1 | blind, edge | Nhả tay đọc `dx` cũ (state chưa vẽ) → vuốt nhanh qua ngưỡng bị bỏ lỡ | medium | pointermove là sự kiện liên tục | patch — tính khoảng cách trong ref của cử chỉ |
| 2 | blind | `pointercancel` cũng xin xoá | medium | Cùng hàm với pointerup | patch — cancel chỉ trượt về; test |
| 3 | blind, edge, verif | Không bắt pointer: chuột kéo ra ngoài thẻ → thẻ kẹt lệch | medium | | patch — `setPointerCapture` khi quyết định vuốt ngang, `lostpointercapture` trượt về |
| 4 | blind, edge, verif | Rung tay dọc 1px lúc đầu huỷ cú vuốt | medium | Quyết định hướng trước ngưỡng | patch — chỉ quyết định khi qua `DRAG_SLOP`; test |
| 5 | edge, verif | Sau cú vuốt không có click, cờ chặn click còn → lần chạm sau bị nuốt | medium | | patch — bỏ chặn ngay sau pointerup; test |
| 6 | edge | Chuột phải/ngón thứ hai kích hoạt vuốt | low | | patch — chỉ con trỏ chính, nút trái; test |
| 7 | blind | Không có dấu hiệu vuốt là để xoá | low | | patch — dải đỏ "Xoá" phía sau, đậm khi qua ngưỡng |
| 8 | blind | Hai hộp thoại lồng nhau cùng tên; id viết cứng | low | Modal (dialog) + div (alertdialog) | patch — `Modal` nhận `role="alertdialog"`, `describedBy`; `useId` |
| 9 | verif, blind | `useDeleteItem` lỗi → AppError chưa test; thiếu `ready` | medium | | patch — test + `ready` |
| 10 | blind | Nút Xoá trong chi tiết chưa test | low | | patch |
| 11 | blind, edge | E2E dọn không an toàn; kiểm "biến mất" dựa vào ô tìm | low | | patch — `finally`; bỏ ô tìm rồi kiểm không còn thẻ |
| 12 | blind | Hiệu ứng trượt về bỏ qua reduced-motion | low | | patch |
| 13 | blind | Món đã xoá không ra ở vòng quay / ô mâm hiện món không còn chưa có test mới | false | `useItems` lọc `deleted` (test 1.4), engine lọc (test 1.2), `trayEntries` bỏ món không còn (test 1.8) | reject |
| 14 | blind | Chỉ invalidate danh sách món | false | Mọi màn đọc món qua `useItems` | reject |

## Verification

**Commands:**
- `cd web && npm run lint && npm run typecheck && npm test && npm run build && npm run test:e2e` -- expected: pass.
