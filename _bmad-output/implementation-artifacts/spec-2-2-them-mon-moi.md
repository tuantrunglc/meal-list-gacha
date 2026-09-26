---
title: 'Story 2.2: Thêm món mới kèm công thức'
type: 'feature'
created: '2026-09-26'
status: 'done'
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
- [x] `web/src/sets/types.ts`, `web/src/sets/food/{FoodAttrsEditor.tsx,.css,definition.ts,copy.ts}` (+ test) -- trình soạn công thức.
- [x] `web/src/data/items.ts` (+ test) -- `useCreateItem`.
- [x] `web/src/ui/{toast.ts,Toaster.tsx,.css}` (+ test), `web/src/app/App.tsx` -- toast.
- [x] `web/src/features/item-editor/ItemEditor.tsx` + `.css` (+ test) -- form.
- [x] `web/src/features/library/LibraryScreen.tsx`, `tray/MealTray.tsx`, `spin/SpinScreen.tsx` (+ test) -- điểm vào.
- [x] `web/src/ui/copy.ts` -- chuỗi.
- [x] `web/e2e/editor.spec.ts` -- thêm món thật, món đầu lưới, validate, bỏ thay đổi, tìm không thấy → điền sẵn.

**Acceptance Criteria:**
- Given `npm run lint && npm run typecheck && npm test && npm run build && npm run test:e2e`, then pass.

## Implementation Notes

- `SetDefinition.AttrsEditor` khai báo kiểu method (và `onChange` trong `AttrsEditorProps` cũng kiểu method) để registry chứa được `SetDefinition<FoodAttrs>`; form truyền giá trị đã qua `emptyAttrs`/`parseAttrs` của chính Bộ.
- `parseFoodAttrs` giờ trim và bỏ dòng trống (form cho phép dòng trống).
- Toast: vùng `aria-live` luôn có; `role=status` chỉ khi đang hiện (tránh trùng với trạng thái khác của màn).
- Tên điền sẵn là giá trị ban đầu: rời form ngay sau khi mở từ "Thêm mới luôn?" không hỏi "Bỏ thay đổi?".
- E2E đếm món seed theo `seedKey` vì các test khác thêm món tự tạo.

## Spec Change Log

## Review Triage Log

| # | Nguồn | Finding | Verdict | Bằng chứng | Route |
|---|---|---|---|---|---|
| 1 | verif, blind | Điểm vào "Thêm món" ở ô hết món chưa có test (điền sẵn nhóm + mùa, đóng mâm) | medium | | patch — test SpinScreen |
| 2 | blind, edge | Lỗi "chọn nhóm" không gắn vào radiogroup (không `aria-invalid`/`aria-describedby`) | medium | Gắn vào div bọc | patch — `ChipGroup` nhận `invalid`, `describedBy`; test |
| 3 | blind, edge | `parseAttrs` lỗi → lưu `emptyAttrs` còn dòng trống | low | | patch — chuẩn hoá qua `parseAttrs` |
| 4 | blind, edge | "Bỏ thay đổi?": Esc/chạm nền không phải "Ở lại"; "Ở lại" làm mất focus | medium | | patch — Esc = Ở lại, focus về ô Tên; test |
| 5 | blind, edge | Đóng form mở từ mâm: focus rơi ra body | medium | Nút mở đã bị gỡ | patch — focus nút "Mở nồi!"; test |
| 6 | edge | Lần gửi đầu tới server (mất phản hồi), sửa form rồi thử lại → server giữ bản cũ | medium | Trùng ID coi là xong | patch — trùng ID thì `update` bằng nội dung mới; test |
| 7 | blind, edge | Lưu khi household chưa tải → báo nhầm "chưa thuộc nhà nào" | low | | patch — `ready`; khoá Lưu; test |
| 8 | verif, blind, edge | `beforeunload` không test; thiếu `returnValue` | low | | patch — thêm `returnValue` + test |
| 9 | edge | Enter khi đang gõ bộ gõ tiếng Việt thêm dòng | medium | Telex/VNI | patch — bỏ qua khi `isComposing` |
| 10 | edge | Công thức quá dài vượt `maxSize` → lỗi server chung chung | low | | patch — `maxLength` dòng/ghi chú, tối đa 60 dòng |
| 11 | edge | Lỗi lưu cũ còn hiện khi lỗi validate mới | low | | patch — `reset()` khi validate lỗi |
| 12 | edge | "Thêm mới luôn?" không mang nhóm đang lọc | low | | patch |
| 13 | blind | Toast đè nút ＋ | low | Cùng `bottom` | patch — toast lên đầu màn |
| 14 | blind, edge, verif | Dữ liệu e2e lọt sang test khác, phải nới kiểm tra; kiểm một lần dễ chập chờn | medium | | patch — xoá mềm món tự tạo sau mỗi test, trả lại kiểm chính xác 51/16 bằng `toHaveCount` |
| 15 | blind | E2E tên nói "có thể ra khi quay" nhưng không quay; không kiểm độ hiếm/bước | low | | patch — đổi tên, kiểm Đặc biệt, bước, bỏ dòng trống |
| 16 | blind | `waitFor` bọc `mutateAsync` có thể gọi nhiều lần | low | | patch — chờ `ready` rồi gọi một lần |
| 17 | blind | "Lưu" dùng `aria-disabled` vẫn focus được; "Thử lại" không khoá | low | | patch — `disabled` |
| 18 | blind | Key dòng theo chỉ số (xoá dòng giữa) | low | Chỉ lệch khi đang gõ dở rồi xoá dòng khác | reject |
| 19 | edge | Nút Back/đổi route khi đang sửa không hỏi | low | Router khai báo không có `useBlocker`; form là modal che tab bar | reject |
| 20 | blind | Không cảnh báo trùng tên món | low | Cho phép trùng tên (nhà có thể có hai kiểu cùng tên) | reject |

## Verification

**Commands:**
- `cd web && npm run lint && npm run typecheck && npm test && npm run build && npm run test:e2e` -- expected: pass.
