---
title: 'Story 2.4: Sửa món'
type: 'feature'
created: '2026-09-26'
status: 'done'
baseline_commit: '926b52b7aa3f494a2f369107034fc8cf14468851'
route: 'dispatch'
review_loop_iteration: 0
context:
  - '{project-root}/_bmad-output/implementation-artifacts/epic-2-context.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** Món đã có (kể cả món mặc định) chưa sửa được cho đúng cách nhà nấu.

**Approach:** Nút "Sửa" trong Chi tiết món mở lại form của Story 2.2 ở chế độ sửa (điền sẵn, đổi/bỏ ảnh); lưu bằng `useUpdateItem`. Chi tiết món chưa có công thức hiện "Chưa có công thức, ghi lại bí kíp nè". Món đang nằm trên mâm hiển thị dữ liệu mới.

## Boundaries & Constraints

**Always:**
- `ItemEditor` nhận `item?: Item`: có thì là chế độ sửa, tiêu đề "Sửa món", điền sẵn tên, nhóm, mỗi facet (giá trị tag thuộc facet đó, không có thì `universalValue`), độ hiếm, `attrs` (qua `parseAttrs`, lỗi thì `emptyAttrs`; công thức trống thì có một dòng trống để gõ), ảnh hiện có (`useItemImages`, cỡ full) đổi được hoặc "Bỏ ảnh". Dirty/Bỏ thay đổi?/đang lưu/lỗi + Thử lại như 2.2.
- `useUpdateItem(setKey)`: `update(id, { name (trim), groupKey, rarity, tags, attrs, image? })`; ảnh mới → gửi File; bỏ ảnh → `image: null` (xoá file); không đổi ảnh → không gửi `image`. Không gửi `setKey`, `seedKey`, `household` (rule chặn; món seed giữ `seedKey`). Invalidate danh sách món. Lưu xong: toast "Đã lưu vào nồi!", đóng form.
- `ItemDetail` nhận `onEdit?`: có thì hiện nút "Sửa" (44px). `FoodDetail`: nguyên liệu và các bước đều trống → "Chưa có công thức, ghi lại bí kíp nè".
- Thư viện: Sửa trong chi tiết → đóng chi tiết, mở form sửa (một lớp modal); lưu/thoát xong mở lại chi tiết của món đó.
- Mâm: Sửa trong chi tiết món trên mâm → đóng mâm, mở form sửa; lưu/thoát xong mở lại mâm (khoá, thứ tự giữ nguyên). Ô trên mâm lấy tên, ảnh, **độ hiếm** từ món hiện tại (không từ bản chụp lúc quay); `entries` khi chốt cũng dùng dữ liệu hiện tại.

**Never:** Không cho đổi Bộ hay `seedKey`. Chưa có xoá (2.5).

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Sửa món seed | đổi tên + độ hiếm "Cá kho tộ" | bản ghi cập nhật, `seedKey` giữ nguyên, toast | N/A |
| Chưa có công thức | món tự thêm không nguyên liệu/bước | "Chưa có công thức, ghi lại bí kíp nè" + Sửa | N/A |
| Đổi ảnh | món có ảnh, chọn ảnh khác | ảnh mới thay ảnh cũ | N/A |
| Bỏ ảnh | món có ảnh, Bỏ ảnh, Lưu | `image` rỗng; hiện ảnh seed nếu có, không thì đĩa trống | N/A |
| Không đổi ảnh | chỉ sửa tên | ảnh giữ nguyên | N/A |
| Trên mâm | sửa độ hiếm món đang trên mâm | mâm mở lại, ô hiện độ hiếm/tên mới | N/A |
| Lỗi mạng | update thất bại | form giữ dữ liệu, lời nhắn + Thử lại | AppError |

</frozen-after-approval>

## Code Map

- `web/src/features/item-editor/{ItemEditor,ImagePicker}.tsx` -- form 2.2/2.3 (`initialState`, `existingSources`, `onRemoveExisting`).
- `web/src/data/items.ts` -- `useCreateItem` (mẫu), `Item`.
- `web/src/features/item-detail/ItemDetail.tsx`, `web/src/sets/food/FoodDetail.tsx` -- chi tiết.
- `web/src/features/library/LibraryScreen.tsx` -- modal chi tiết (`openId`), `editor` state.
- `web/src/features/tray/MealTray.tsx` (`viewSlot`, `trayEntries`, chế độ chi tiết), `web/src/features/spin/SpinScreen.tsx` (`editor` state), `tray/store.ts` (`open`).

## Tasks & Acceptance

**Execution:**
- [x] `web/src/data/items.ts` (+ test) -- `useUpdateItem`.
- [x] `web/src/features/item-editor/ItemEditor.tsx` (+ test) -- chế độ sửa, ảnh hiện có.
- [x] `web/src/features/item-detail/ItemDetail.tsx`, `web/src/sets/food/FoodDetail.tsx` (+ test) -- nút Sửa, trạng thái chưa có công thức.
- [x] `web/src/features/library/LibraryScreen.tsx` (+ test) -- Sửa từ chi tiết.
- [x] `web/src/features/tray/MealTray.tsx`, `web/src/features/spin/SpinScreen.tsx` (+ test) -- Sửa từ mâm, dữ liệu hiện tại trên ô.
- [x] `web/src/ui/copy.ts`, `web/src/sets/food/copy.ts` -- chuỗi.
- [x] `web/e2e/edit.spec.ts` -- sửa món seed (seedKey giữ), đổi/bỏ ảnh với PocketBase thật.

**Acceptance Criteria:**
- Given `npm run lint && npm run typecheck && npm test && npm run build && npm run test:e2e`, then pass.

## Implementation Notes

- `ImagePicker.hasUploaded` tách "có ảnh đã upload (bỏ được)" khỏi nguồn hiển thị (ảnh seed chỉ để xem) — e2e bắt được: món seed bị coi là "đã có ảnh".
- Ô trên mâm và `trayEntries` lấy độ hiếm từ món hiện tại; `slot.rarity` của engine chỉ còn dùng cho thứ tự bật.
- Sửa từ mâm: đóng mâm (`closeThen`), mở form ở màn Quay, xong đặt `open: true` để mở lại đúng mâm.
- E2E sửa món seed rồi trả lại tên/độ hiếm cũ để các test khác không lệch.

## Spec Change Log

## Review Triage Log

| # | Nguồn | Finding | Verdict | Bằng chứng | Route |
|---|---|---|---|---|---|
| 1 | verif, blind | Lỗi/Thử lại/đang lưu ở chế độ sửa chưa test (mock update cố định) | medium | | patch — mock cấu hình được + test |
| 2 | blind, edge | Lưu khi sửa làm mất tag ngoài facet | medium | Tag dựng lại chỉ từ facet | patch — giữ tag không thuộc facet nào; test |
| 3 | blind, edge | Công thức không đọc được bị ghi đè rỗng khi chỉ đổi tên | medium | | patch — không gửi `attrs` nếu công thức lưu không đọc được và chưa đụng tới; test |
| 4 | edge, verif | "Bỏ ảnh" sau khi chọn ảnh mới xoá luôn ảnh đã upload; món không có ảnh bị dirty giả | medium | `remove()` luôn gọi `onRemoveExisting` | patch — bỏ ảnh vừa chọn thì chỉ quay về ảnh đang có; test |
| 5 | blind, edge, verif | Món biến mất khi form mở: form tắt, mâm/chi tiết không mở lại | medium | Tra `items.data` mỗi lần render | patch — giữ bản món lúc bấm Sửa, form luôn gọi `onClose` |
| 6 | edge | Chốt lỗi → sửa món → thử lại cùng ID giữ bản chụp cũ | medium | | patch — sửa xong đặt `commitId: null` (bản lỗi được thay qua `replaceId`) |
| 7 | blind | Công thức rỗng: gõ rồi xoá dòng trống bị coi là đã sửa | low | | patch — so sánh sau `parseAttrs`; test |
| 8 | blind, edge | Chỉ có ghi chú thì không hiện lời mời ghi công thức (lệch spec) | low | | patch — hiện lời mời khi không có nguyên liệu lẫn bước, ghi chú vẫn hiện; test |
| 9 | blind, edge | `useUpdateItem` không có `ready`, invalidate với household rỗng | low | | patch — `ready` |
| 10 | edge | Ô trống có `itemId` cũ vẫn vào entries | low | | patch — bỏ ô `empty` |
| 11 | blind, verif, edge | E2E khôi phục không an toàn khi hỏng; chọn nhầm thẻ trùng chuỗi con; lỗi mơ hồ khi không thấy món | low | | patch — `finally`, chọn đúng tên, báo rõ |
| 12 | blind | Nút Sửa không có test; không đảm bảo 44px | low | | patch — test + `min-height` |
| 13 | blind | Test `useUpdateItem` không kiểm `setKey`/`household` | low | | patch |
| 14 | blind | Sửa từ mâm chưa có e2e | low | Unit test SpinScreen phủ luồng | reject |
| 15 | blind | Thứ tự bật dùng độ hiếm lúc quay, huy hiệu dùng độ hiếm hiện tại | low | Thứ tự bật chỉ có nghĩa lúc mở nồi | reject — cập nhật chú thích `trayEntries` |

## Verification

**Commands:**
- `cd web && npm run lint && npm run typecheck && npm test && npm run build && npm run test:e2e` -- expected: pass.
