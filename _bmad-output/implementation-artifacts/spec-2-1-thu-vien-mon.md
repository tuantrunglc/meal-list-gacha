---
title: 'Story 2.1: Thư viện món'
type: 'feature'
created: '2026-09-26'
status: 'done'
baseline_commit: '3ba2dfa1068c9fcc8a110f03c84125311542da88'
route: 'dispatch'
review_loop_iteration: 0
context:
  - '{project-root}/_bmad-output/implementation-artifacts/epic-2-context.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** Tab "Món ăn" còn trống; cả nhà chưa xem/tìm lại được món nào.

**Approach:** Màn Thư viện: ô tìm, chip nhóm + chip mùa (có "Tất cả"), lưới 2 cột thẻ món, trạng thái tìm không thấy, chạm thẻ mở Chi tiết món trong một modal dùng chung.

## Boundaries & Constraints

**Always:**
- Dữ liệu: `useItems(set)` của Bộ mặc định (đã lọc `deleted=false`, mới sửa trước).
- `features/library/filter.ts` (hàm thuần): lọc nhóm (`null` = tất cả), lọc từng facet theo **đúng giá trị tag** (`null` = tất cả; chọn "Thu" thì chỉ món gắn Thu — thư viện là danh mục, khác màn Quay), tìm tên không phân biệt hoa thường/dấu (bỏ dấu kết hợp, `đ`→`d`, gộp khoảng trắng), khớp theo chuỗi con.
- `ui/DishCard.tsx` (props thuần): nút bấm toàn thẻ, ảnh `DishImage` 4:3 (thumb), tên (font display, co theo cỡ chữ), nhãn nhóm, huy hiệu sao, chấm mùa có nhãn cho trình đọc; viền 4px màu độ hiếm, bo `lg`, nền `surface-raised`.
- `ui/Modal.tsx` dùng chung: `role=dialog` `aria-modal`, nhãn, focus vào dialog khi mở, giữ Tab trong dialog, Esc/chạm nền đóng, trả focus về chỗ cũ.
- Màn: tiêu đề "Sổ món của nhà"; ô tìm có nhãn "Tìm món" (48px); nhóm chip nhóm và mỗi facet một nhóm chip (`ui/ChipGroup`, mục đầu "Tất cả"); lưới 2 cột; không có kết quả: "Không thấy món này. Thêm mới luôn?" (nút ＋ nối ở Story 2.2); đang tải / lỗi + Thử lại. Chạm thẻ: Modal với `ItemDetail`.
- Nhãn nhóm/mùa lấy từ `SetDefinition`; không viết cứng key Bộ trong `features/`.

**Never:** Chưa có thêm/sửa/xoá (2.2–2.5), chưa upload ảnh (2.3).

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Mở tab | 51 món seed | lưới 2 cột 51 thẻ | N/A |
| Lọc nhóm | chip Canh | chỉ món Canh | N/A |
| Lọc cả hai | Canh + Thu | món Canh gắn Thu | N/A |
| Tìm không dấu | "ca kho" | có "Cá kho tộ" | N/A |
| Tìm có dấu/hoa | "CÁ KHO" | có "Cá kho tộ" | N/A |
| Tìm "đ"/"d" | "dau phu" | có "Đậu phụ sốt cà chua" | N/A |
| Không thấy | "pizza" | "Không thấy món này. Thêm mới luôn?" | N/A |
| Chạm thẻ | "Canh chua cá" | Chi tiết món trong modal; Esc đóng, focus về thẻ | N/A |

</frozen-after-approval>

## Code Map

- `web/src/features/library/LibraryScreen.tsx` -- màn tạm, viết lại.
- `web/src/data/items.ts` -- `useItems`, `itemImageSources`, `Item`.
- `web/src/features/item-detail/ItemDetail.tsx` -- chi tiết món (ref cho heading).
- `web/src/ui/{ChipGroup,DishImage,GroupTag,RarityBadge,copy}` -- dùng lại.
- `web/src/features/tray/MealTray.tsx` -- mẫu focus trap/Esc/trả focus.

## Tasks & Acceptance

**Execution:**
- [x] `web/src/features/library/filter.ts` (+ test) -- lọc + chuẩn hoá tên.
- [x] `web/src/ui/Modal.tsx` + `.css` (+ test), `web/src/ui/DishCard.tsx` + `.css` (+ test).
- [x] `web/src/features/library/LibraryScreen.tsx` + `.css` (+ test) -- màn.
- [x] `web/src/ui/copy.ts` -- chuỗi.
- [x] `web/e2e/library.spec.ts` -- lưới 2 cột, lọc, tìm, chi tiết.

**Acceptance Criteria:**
- Given `npm run lint && npm run typecheck && npm test && npm run build && npm run test:e2e`, then pass; ảnh chụp 390×844 đúng lưới 2 cột.

## Implementation Notes

- "Tất cả" dùng khoá `__all__` (không trùng key Bộ vì key Bộ là kebab-case).
- `ui/Modal` là modal dùng chung mới (focus/Tab/Esc/trả focus); mâm ở màn Quay vẫn giữ `TrayDialog` riêng (không đổi trong story này).
- Ảnh chụp 390×844: lưới 2 cột, thẻ viền màu độ hiếm, đĩa trống khi chưa có ảnh.

## Spec Change Log

## Review Triage Log

| # | Nguồn | Finding | Verdict | Bằng chứng | Route |
|---|---|---|---|---|---|
| 1 | verif, blind | Spec ghi có test `DishCard` nhưng không có; viền độ hiếm + mùa trong nhãn không được kiểm | medium | Không có `DishCard.test.tsx` | patch — thêm test |
| 2 | blind | Chỉ lọc chip ra rỗng mà vẫn mời "Thêm mới luôn?"; không có cách bỏ lọc | medium | | patch — "Chưa có món nào khớp bộ lọc này." + "Bỏ lọc"; test |
| 3 | edge, blind | Tải lại lỗi (còn dữ liệu cũ) thì mất cả lưới | medium | Kiểm `error` trước `data` | patch — lỗi thành dải thông báo, lưới vẫn hiện; test |
| 4 | blind | Ký tự kết hợp vô hình nằm thẳng trong regex bỏ dấu | medium | `cat -v` thấy byte lạ | patch — `/\p{M}/gu` |
| 5 | blind | Focus mở chi tiết vào dialog chứ không vào tên món (ref có sẵn không dùng) | low | | patch — `Modal.initialFocusRef`; test |
| 6 | verif, blind | Thiếu test Modal: Shift+Tab, chạm nền, `locked` | medium | | patch — thêm test |
| 7 | verif | Trạng thái đang tải không có test | medium | Bỏ nhánh thì hiện "Không thấy" lúc tải | patch — test |
| 8 | edge, blind | Trả focus khi phần tử mở modal đã bị gỡ | low | | patch — chỉ trả khi `isConnected` |
| 9 | blind | Lọc facet không phân biệt facet (tag không có namespace) | low | Chỉ lỗi khi key trùng giữa nhóm/facet | patch — test registry: key nhóm + giá trị facet duy nhất |
| 10 | edge, blind | E2E: vòng kiểm "Canh" có thể trống; chưa kiểm 51 thẻ, không thấy, focus sau Esc | low | | patch — kiểm số lượng, `toHaveText`, focus |
| 11 | edge | Key React của chấm mùa có thể trùng | low | | patch — key theo vị trí |
| 12 | edge, blind, verif | Ảnh `protected` không có file token | low | Chưa có upload | reject — làm ở Story 2.3 (token hook trong `data/`) |
| 13 | edge, blind | Nhiều Modal chồng nhau cùng nghe Esc; không khoá cuộn nền | low | Thiết kế chỉ một lớp modal | reject |
| 14 | edge | `openId` còn khi món biến mất | low | Modal tự ẩn | reject |
| 15 | edge | `rarity` ngoài 1–3 làm crash | false | DB ràng buộc 1–3 | reject |
| 16 | blind | Chuẩn hoá tên mỗi lần gõ | low | 51 món | reject |

## Verification

**Commands:**
- `cd web && npm run lint && npm run typecheck && npm test && npm run build && npm run test:e2e` -- expected: pass.
