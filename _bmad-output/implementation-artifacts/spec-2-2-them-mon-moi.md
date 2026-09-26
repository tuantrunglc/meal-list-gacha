---
title: 'Story 2.2: Thêm món mới kèm công thức'
type: 'feature'
created: '2026-09-26'
status: 'in-progress'
baseline_commit: '5f1e31edcaf2331a881294605fc80a8a970f962f'
route: 'dispatch'
review_loop_iteration: 0
context:
  - '{project-root}/_bmad-output/implementation-artifacts/epic-2-context.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** Nồi chỉ có món mặc định; cả nhà chưa thêm được món ruột của mình.

**Approach:** Form Thêm món mở trong một modal toàn màn hình (một lớp), phần công thức do Bộ cung cấp (`SetDefinition.AttrsEditor`); lưu bằng mutation với ID do client sinh; toast "Đã lưu vào nồi!"; nối từ nút ＋ của Thư viện, "Thêm mới luôn?" và ô "Hết món" trên mâm.

## Boundaries & Constraints

**Always:**
- `features/item-editor/ItemEditor.tsx` (trong `ui/Modal`, nhãn "Thêm món"): ô ảnh là đĩa trống "Thêm ảnh" (chức năng ảnh ở 2.3); Tên (bắt buộc, input 48px); Nhóm (chip, bắt buộc, không chọn sẵn trừ khi được điền sẵn); mỗi facet một nhóm chip, mặc định `universalValue` (Quanh năm); Độ hiếm (chip ⭐ Thường / ⭐⭐ Ngon / ⭐⭐⭐ Đặc biệt, mặc định Thường); `set.AttrsEditor`; nút chính "Lưu" (primary) và "Thôi".
- Điền sẵn: `{ name?, groupKey?, facets? }` từ nơi mở form.
- Lưu: thiếu tên hoặc nhóm thì không lưu, báo ngay dưới trường (`aria-invalid`, `aria-describedby`, câu thân thiện), focus trường lỗi đầu tiên. Hợp lệ: `useCreateItem` tạo `items` với ID sinh một lần khi mở form (thử lại dùng lại ID, trùng ID = thành công), `tags` = giá trị facet đã chọn, `attrs` = kết quả `set.parseAttrs` (đã bỏ dòng trống), `seedKey` rỗng, `deleted=false`; xong đóng form, toast "Đã lưu vào nồi!" (nền `accent-warm`, `role=status`), invalidate danh sách món (món mới nằm đầu lưới, lần quay kế tiếp có thể ra). Lỗi lưu: lời nhắn `AppError` + "Thử lại", form giữ dữ liệu; đang lưu thì khoá form và không đóng được.
- Rời form khi đã sửa gì (Esc, chạm nền, "Thôi"): hiện ngay trong modal "Bỏ thay đổi?" với "Bỏ" (màu `danger`) / "Ở lại"; chưa sửa gì thì đóng luôn. Đóng/tải lại tab khi đang sửa: `beforeunload`.
- `sets/food/FoodAttrsEditor.tsx`: Nguyên liệu = danh sách ô nhập (mỗi dòng một mục, thêm/xoá dòng), Các bước = danh sách đánh số tự động (thêm/xoá bước), Ghi chú (textarea, tuỳ chọn); mọi nút ≥ 44px có nhãn.
- Điểm vào: Thư viện có nút ＋ "Thêm món" (luôn thấy); "Thêm mới luôn?" (điền sẵn tên đang tìm); ô "Hết món <nhóm>" trên mâm có thêm nút "Thêm món" (điền sẵn nhóm + mùa đang chọn; đóng mâm rồi mở form trên màn Quay).
- Toast: `ui/toast.ts` (store nhỏ) + `ui/Toaster.tsx` gắn ở app shell, tự ẩn sau ~3 giây.

**Never:** Chưa upload ảnh (2.3), chưa sửa/xoá (2.4, 2.5). Không mở modal thứ hai. Không viết cứng key Bộ trong `features/`.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Thiếu tên | nhóm có, tên trống, Lưu | không gọi server, báo "Món này tên gì nè?" dưới ô Tên, focus ô Tên | N/A |
| Thiếu nhóm | tên có, nhóm chưa chọn | báo "Chọn nhóm cho món nhé." | N/A |
| Lưu được | đủ + 2 nguyên liệu + 3 bước | 1 bản ghi items đúng dữ liệu; toast; form đóng; món đầu lưới | N/A |
| Dòng trống | nguyên liệu có dòng trống | dòng trống bị bỏ khi lưu | N/A |
| Lỗi mạng | create thất bại | form còn nguyên, lời nhắn + Thử lại (cùng ID) | trùng ID = thành công |
| Rời khi đã sửa | gõ tên rồi Esc | "Bỏ thay đổi?"; "Ở lại" giữ form; "Bỏ" đóng | N/A |
| Từ tìm không thấy | tìm "pizza" → Thêm mới luôn? | form với tên "pizza" | N/A |
| Từ ô hết món | Hết món Canh, mùa Thu → Thêm món | form nhóm Canh, mùa Thu | N/A |

</frozen-after-approval>

## Code Map

- `web/src/features/library/LibraryScreen.tsx` -- nút ＋, "Thêm mới luôn?" (trạng thái `notFound`).
- `web/src/features/tray/MealTray.tsx` -- ô `empty` (nút "Đổi mùa"); thêm prop `onAddItem(groupKey)`.
- `web/src/features/spin/SpinScreen.tsx` -- `filters` hiện tại; mở editor sau khi đóng mâm.
- `web/src/data/{items,ids,errors,keys}.ts` -- `useItems`, `newId`, `isConflict(err,'id')`, `queryKeys.items`.
- `web/src/sets/types.ts` -- thêm `AttrsEditor`, `emptyAttrs`.
- `web/src/ui/{Modal,ChipGroup,DishImage,copy,global.css}` -- dùng lại; `.field`, `.input`, `.button-primary/secondary`.
- `web/src/app/App.tsx` -- gắn `Toaster`.

## Tasks & Acceptance

**Execution:**
- [ ] `web/src/sets/types.ts`, `web/src/sets/food/{FoodAttrsEditor.tsx,.css,definition.ts,copy.ts}` (+ test) -- trình soạn công thức.
- [ ] `web/src/data/items.ts` (+ test) -- `useCreateItem`.
- [ ] `web/src/ui/{toast.ts,Toaster.tsx,.css}` (+ test), `web/src/app/App.tsx` -- toast.
- [ ] `web/src/features/item-editor/ItemEditor.tsx` + `.css` (+ test) -- form.
- [ ] `web/src/features/library/LibraryScreen.tsx`, `tray/MealTray.tsx`, `spin/SpinScreen.tsx` (+ test) -- điểm vào.
- [ ] `web/src/ui/copy.ts` -- chuỗi.
- [ ] `web/e2e/editor.spec.ts` -- thêm món thật, món đầu lưới, validate, bỏ thay đổi, tìm không thấy → điền sẵn.

**Acceptance Criteria:**
- Given `npm run lint && npm run typecheck && npm test && npm run build && npm run test:e2e`, then pass.

## Implementation Notes

## Spec Change Log

## Review Triage Log

## Verification

**Commands:**
- `cd web && npm run lint && npm run typecheck && npm test && npm run build && npm run test:e2e` -- expected: pass.
