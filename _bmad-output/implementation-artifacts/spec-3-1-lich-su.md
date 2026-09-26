---
title: 'Story 3.1: Lịch sử mâm đã chốt'
type: 'feature'
created: '2026-09-26'
status: 'done'
baseline_commit: 'd367e61af4cb3f900f130e9061dd193c799cbc1a'
route: 'dispatch'
review_loop_iteration: 0
context:
  - '{project-root}/_bmad-output/implementation-artifacts/epic-3-context.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** Tab "Lịch sử" còn trống; cả nhà chưa xem lại được tuần này đã ăn gì.

**Approach:** Danh sách draw của household (mới nhất trước), phân trang tải thêm khi cuộn; mỗi hàng ngày giờ + ảnh nhỏ + tên món theo thứ tự trên mâm; chạm món mở Chi tiết (món đã xoá vẫn mở được, tên/độ hiếm từ snapshot).

## Boundaries & Constraints

**Always:**
- `data/draws.ts`: `useDrawHistory(setKey)` = `useInfiniteQuery`, trang 20 draw, `sort: -chosenAt`, lọc household + Bộ; `chosenAt` chuẩn hoá ISO; dùng chung key gốc `queryKeys.draws(...)` (nên chốt mâm mới tự làm mới lịch sử).
- `data/items.ts`: `ItemsResult` thêm `all` (kể cả món đã xoá mềm) để lịch sử hiện ảnh/chi tiết món đã xoá; `data` vẫn chỉ món chưa xoá.
- `features/history/HistoryScreen.tsx`: tiêu đề "Mâm đã chốt"; mỗi mâm là một mục danh sách: ngày giờ theo giờ máy (`Intl` vi-VN: thứ, ngày/tháng, giờ:phút; font `meta`), dải ảnh nhỏ (thumb, `DishImage` compact) theo `order`, tên món; mỗi món là một nút "Xem công thức <tên>" (≥ 44px) mở `ItemDetail` trong `ui/Modal`. Món còn: dữ liệu hiện tại. Món đã xoá hoặc không còn: tên + độ hiếm từ snapshot `entries` (công thức, ảnh nếu bản ghi vẫn còn).
- Tải thêm: phần tử canh cuối danh sách (`IntersectionObserver`) gọi trang kế; kèm nút "Xem thêm mâm cũ" cho bàn phím/khi không có observer; hết thì thôi.
- Trống: "Chưa chốt mâm nào. Qua tab Quay mở nồi thử nhé!". Đang tải / lỗi + Thử lại.

**Never:** Chưa xoá mâm (3.2). Không sửa draw. Không viết cứng key Bộ trong `features/`.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Có mâm | 3 draw | 3 hàng, mới nhất trên, ngày giờ giờ máy, tên theo `order` | N/A |
| Trống | 0 draw | câu mời qua tab Quay | N/A |
| Phân trang | 45 draw | 20 → cuộn/Xem thêm → 40 → 45, hết nút | N/A |
| Món đã xoá | món trong draw đã `deleted=true` | vẫn hiện tên (snapshot) và mở được chi tiết | N/A |
| Món đổi tên sau khi chốt | tên mới ≠ snapshot | hàng lịch sử hiện tên lúc chốt (snapshot) | N/A |
| Lỗi mạng | tải trang lỗi | lời nhắn + Thử lại | AppError |

</frozen-after-approval>

## Code Map

- `web/src/data/draws.ts` -- `toDraw`, `Draw`, `DrawEntry`, `useRecentDraws`, key `queryKeys.draws`.
- `web/src/data/items.ts` -- `useItems` (đang lọc `deleted` trong queryFn).
- `web/src/features/history/HistoryScreen.tsx` -- màn tạm.
- `web/src/features/item-detail/ItemDetail.tsx`, `web/src/ui/{Modal,DishImage}`, `web/src/data/files.ts` (`useItemImages`).

## Tasks & Acceptance

**Execution:**
- [x] `web/src/data/draws.ts` (+ test) -- `useDrawHistory`.
- [x] `web/src/data/items.ts` (+ test) -- `all`.
- [x] `web/src/features/history/HistoryScreen.tsx` + `.css` (+ test) -- màn.
- [x] `web/src/ui/copy.ts` -- chuỗi.
- [x] `web/e2e/history.spec.ts` -- chốt mâm → thấy trong lịch sử đúng tên/thứ tự; xoá món → lịch sử vẫn hiện; mở chi tiết.

**Acceptance Criteria:**
- Given `npm run lint && npm run typecheck && npm test && npm run build && npm run test:e2e`, then pass.

## Implementation Notes

- `useItems` giờ cache cả món đã xoá (`all`), `data` lọc bằng `useMemo`; các màn cũ vẫn dùng `data`.
- Chi tiết từ lịch sử không có nút Sửa/Xoá (xem lại quá khứ); món đã xoá hoặc đổi tên hiển thị tên/độ hiếm lúc chốt.
- Lịch sử dùng key con của `queryKeys.draws` nên chốt mâm (invalidate key gốc) tự làm mới.

## Spec Change Log

## Review Triage Log

| # | Nguồn | Finding | Verdict | Bằng chứng | Route |
|---|---|---|---|---|---|
| 1 | blind, edge | Phân trang theo số trang lệch khi có mâm mới/xoá → mâm trùng (key React trùng) | medium | | patch — bỏ trùng theo `id` khi gộp trang; test 2 trang |
| 2 | blind, edge, verif | Món còn nhưng đổi tên: nút tên cũ, chi tiết tên mới | medium | Chỉ món đã xoá dùng snapshot | patch — lịch sử luôn dùng tên/độ hiếm lúc chốt; test |
| 3 | edge | Ngày không hợp lệ → `Intl` ném lỗi, sập màn | medium | | patch — trả chuỗi rỗng; test |
| 4 | edge | Tải trang kế lỗi mà canh vẫn trong khung → tải lại liên tục | medium | Observer dựng lại, bắn ngay | patch — dừng khi `isFetchNextPageError`, nút thành "Thử lại"; test |
| 5 | edge | Lỗi household → lịch sử kẹt "Đang lật sổ" | medium | Query bị tắt, không có lỗi | patch — báo lỗi household + Thử lại |
| 6 | blind, edge | Danh sách món chưa tải/lỗi → chi tiết rỗng không báo | low | | patch — chi tiết báo đang tải / lỗi + Thử lại; test |
| 7 | edge | `order`/`name` thiếu trong snapshot → sắp xếp NaN, nhãn "undefined" | low | | patch — chuẩn hoá trong `toDraw` |
| 8 | verif | Không kiểm lọc theo Bộ trong `useDrawHistory` | medium | | patch — kiểm `setKey` |
| 9 | verif, blind | Tự tải khi cuộn và gộp nhiều trang chưa test | medium | jsdom không có observer | patch — stub `IntersectionObserver`, test 2 trang; thêm `rootMargin` |
| 10 | verif | `useItems().all` chưa có unit test | low | | patch |
| 11 | blind, edge | E2E không kiểm phản hồi API, để lại mâm thử, giả định hàng đầu | low | | patch — kiểm `ok()`, dọn mâm trong `finally`, tìm hàng theo tên |
| 12 | blind | Test phụ thuộc múi giờ máy | false | `vite.config.ts` đặt `TZ=Asia/Ho_Chi_Minh` cho test | reject |
| 13 | blind | Không nhóm theo ngày/tuần | low | Mỗi hàng có thứ + ngày; mỗi mâm là một bữa | reject |
| 14 | blind | Mutation khác có thể bỏ món đã xoá khỏi cache | false | Mutation chỉ invalidate, không sửa cache | reject |
| 15 | blind | Mượn chuỗi của thư viện/mâm | low | | reject |

## Verification

**Commands:**
- `cd web && npm run lint && npm run typecheck && npm test && npm run build && npm run test:e2e` -- expected: pass.
