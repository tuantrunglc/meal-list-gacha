---
title: 'Story 1.7: Xem chi tiết món và công thức'
type: 'feature'
created: '2026-09-26'
status: 'done'
baseline_commit: 'bcd40bd243d08c8bc47f392edeea944d9e4910fa'
route: 'dispatch'
review_loop_iteration: 0
context:
  - '{project-root}/_bmad-output/implementation-artifacts/epic-1-context.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** Ra món rồi nhưng không xem được nguyên liệu và cách nấu để biết nhà có đủ đồ không.

**Approach:** Chạm vùng thông tin của ô trên mâm thì nội dung dialog mâm chuyển sang Chi tiết món (cùng một lớp modal); "Về mâm" quay lại đúng mâm. Phần công thức do Bộ tự hiển thị (`SetDefinition.DetailView`), phần chung (ảnh, tên, nhóm, độ hiếm, mùa) ở `features/item-detail`.

## Boundaries & Constraints

**Always:**
- `features/item-detail/ItemDetail.tsx`: nhận `item`, `set`; hiện ảnh 4:3 (`DishImage`, nguồn ảnh gốc theo AD-9), tên (title, là heading), nhãn nhóm, huy hiệu độ hiếm, các giá trị facet của món (chấm màu + nhãn), rồi `set.DetailView` với `attrs`. Dùng lại được ở Thư viện/Lịch sử sau này.
- `sets/food/FoodDetail.tsx`: `parseAttrs`; "Nguyên liệu" (danh sách), "Các bước" (danh sách đánh số), "Ghi chú" nếu có; phần rỗng thì không hiện; attrs sai schema thì không hiện gì (không crash).
- Trên mâm: vùng ảnh + chữ của ô có món là một nút "Xem công thức <tên>"; nút 🎲 🔒 ✕ vẫn riêng. Mở chi tiết: dialog vẫn là một, nội dung đổi sang chi tiết, focus vào tên món; nút "← Về mâm" và Esc quay lại mâm, focus về đúng nút của ô vừa mở. Khoá, thứ tự, món trên mâm không đổi.
- Chữ công thức dùng `rem`, không đặt chiều cao cố định; dialog cuộn được; ở cỡ chữ lớn (root 200%) không tràn ngang.

**Never:** Chưa có nút Sửa, trạng thái "Chưa có công thức" (Epic 2). Không mở modal thứ hai. Không viết cứng key Bộ trong `features/`.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Mở | chạm ô "Cá kho tộ" | chi tiết: ảnh, tên, Mặn, ⭐⭐⭐ Đặc biệt, Quanh năm, nguyên liệu, các bước | N/A |
| Về mâm | "← Về mâm" hoặc Esc | mâm như cũ (khoá, thứ tự), focus về ô vừa mở | N/A |
| Một lớp | đang xem chi tiết | chỉ 1 phần tử `role=dialog` | N/A |
| Attrs lỗi | attrs không đúng schema | vẫn hiện phần chung | không crash |
| Chữ lớn | root font 200% | không tràn ngang, cuộn dọc được | N/A |

</frozen-after-approval>

## Code Map

- `web/src/features/tray/MealTray.tsx` -- `TrayDialog` (focus trap, Esc, live region); thêm chế độ xem chi tiết.
- `web/src/sets/types.ts` -- thêm `DetailView: ComponentType<{ attrs: unknown }>`.
- `web/src/sets/food/{attrs,definition}.ts` -- `parseFoodAttrs`.
- `web/src/data/items.ts` -- `itemImageSources(item, token, 'full')`.
- `web/src/ui/{DishImage,GroupTag,RarityBadge}` -- dùng lại.

## Tasks & Acceptance

**Execution:**
- [x] `web/src/sets/types.ts`, `web/src/sets/food/FoodDetail.tsx` (+ test), `definition.ts` -- renderer công thức.
- [x] `web/src/features/item-detail/ItemDetail.tsx` + `.css` (+ test) -- phần chung.
- [x] `web/src/features/tray/MealTray.tsx` + `.css` -- nút mở chi tiết, chế độ chi tiết, về mâm, focus.
- [x] `web/src/ui/copy.ts` -- chuỗi.
- [x] `web/src/features/spin/SpinScreen.test.tsx`, `web/e2e/spin.spec.ts` -- mở/về, một dialog, chữ lớn không tràn.

**Acceptance Criteria:**
- Given `npm run lint && npm run typecheck && npm test && npm run build && npm run test:e2e`, then pass.

## Implementation Notes

- `SetDefinition.DetailView` (component) — Bộ tự hiển thị phần riêng; `features/item-detail/ItemDetail` hiển thị phần chung và nhận ref để focus tên món.
- Chi tiết thay nội dung trong `TrayDialog` (state `detailSlotId`), không thêm dialog. Esc có effect riêng phụ thuộc chế độ đang xem.
- E2E import `sets/food/seed` thay vì `definition` (definition giờ kéo theo component + CSS mà Playwright không nạp được); `tsconfig.node.json` thêm lib `DOM` cho callback `page.evaluate`.
- E2E phóng root font 200%: không tràn ngang ở trang lẫn dialog.

## Spec Change Log

## Review Triage Log

| # | Nguồn | Finding | Verdict | Bằng chứng | Route |
|---|---|---|---|---|---|
| 1 | verif, edge, blind | Món biến mất khi đang xem chi tiết: `detailSlotId` treo, Esc đầu tiên nuốt, focus rơi ra ngoài | medium | Giao diện về mâm nhưng state vẫn là chi tiết | patch — suy ra `inDetail` từ `detailView`; Esc và trả focus theo `inDetail`, không có nút thì focus dialog; test |
| 2 | blind | Nút mở chi tiết che nhóm + độ hiếm khỏi trình đọc | medium | `aria-label` chỉ có tên | patch — nhãn "Xem công thức: <nhóm> <tên>, <bậc>"; test |
| 3 | blind | Tên dialog vẫn "Mâm cơm" khi xem chi tiết | low | | patch — "Chi tiết món <tên>" |
| 4 | edge | Mục công thức toàn khoảng trắng vẫn hiện | low | | patch — trim + lọc; test |
| 5 | verif | Không test chi tiết dùng ảnh gốc (không thumb) | medium | Test chỉ có món seed | patch — test `itemImageSources(..., 'full')` |
| 6 | edge | Trùng key React khi hai facet chung giá trị | low | | patch — key theo facet |
| 7 | blind | Giá trị facet không có tên facet | low | | patch — "Mùa: Quanh năm" |
| 8 | blind | Test dùng `container.remove()` | low | Rò root React | patch — `unmount()`, truy vấn theo container |
| 9 | blind | Test Esc không kiểm focus về ô | low | | patch — thêm kiểm focus |
| 10 | edge | Effect mở dialog chạy lại khi `announcement` đổi | false | Prop chỉ đổi khi quay; không quay được khi mâm mở | reject |
| 11 | blind | Ảnh `protected` cần file token | low | Chưa có ảnh upload tới Story 2.3 | reject — làm ở 2.3 |
| 12 | blind | Parse attrs hai lần; `DetailView` nhận `unknown` | low | Hoạt động đúng | reject |
| 13 | blind | Heading cố định h2/h3; cỡ tiêu đề mục bằng tên món | low | | reject |
| 14 | blind | px cứng, thứ tự import, lib DOM trong tsconfig.node | low | | reject |

## Verification

**Commands:**
- `cd web && npm run lint && npm run typecheck && npm test && npm run build && npm run test:e2e` -- expected: pass.
