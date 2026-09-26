---
title: 'Story 1.6: Chỉnh mâm: đổi món, giữ món, thêm ô, đổi cả mâm'
type: 'feature'
created: '2026-09-26'
status: 'done'
baseline_commit: '25ba862ad8e3c21fdbce10f0b16da18c58fd6229'
route: 'dispatch'
review_loop_iteration: 0
context:
  - '{project-root}/_bmad-output/implementation-artifacts/epic-1-context.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** Mâm ra rồi nhưng chưa chỉnh được: không giữ món ưng, không đổi món chưa ưng, không thêm món phụ.

**Approach:** Thêm hành động vào store `features/tray` và nút trên Mâm cơm. Mọi lần quay lại dùng chung `drawSlots` với `keep` cho các ô không đổi; không gọi server (AD-7).

## Boundaries & Constraints

**Always:**
- Store: `toggleLock(id)`, `rerollOne(id, draw)`, `rerollAll(draw)`, `addSlot(groupKey, draw)`, `removeSlot(id)`. `draw` là hàm `(slots: Slot[]) => DrawResult` do màn Quay dựng từ Bộ, món, bộ lọc hiện tại. Thứ tự ô trên mâm giữ nguyên khi đổi; ô mới thêm vào cuối.
- 🎲 "Đổi món này": chỉ ô đó quay lại (các ô khác `keep`), cùng nhóm, không trùng món khác trên mâm. Ô đang giữ thì nút 🎲 khoá.
- 🔒: bật/tắt giữ; ô giữ nền nhạt đi, nút 🔒 nền `accent-tile`; nút có `aria-pressed` và nhãn "Đang giữ" / "Không giữ" (kèm tên món). Ô trống không giữ được.
- "Đổi cả mâm": quay lại mọi ô chưa giữ (kể cả ô trống), ô giữ nguyên; không giới hạn số lần; không ghi gì.
- "＋ Thêm món": hiện ngay trong mâm (không mở modal thứ hai) các nút nhóm lấy từ `SetDefinition.groups`; chọn nhóm thì thêm ô đã quay sẵn trong nhóm đó, có nút ✕ "Bỏ ô"; 3 ô mặc định không có ✕.
- Mọi nút ≥ 44px và có nhãn cho trình đọc màn hình. Không viết cứng key Bộ trong `features/`.

**Never:** Chưa có Chốt mâm (1.8), hiệu ứng lật/flip (Epic 4), không ghi lịch sử.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Giữ | chạm 🔒 ô Rau | ô Rau "Đang giữ", nền nhạt; chạm lại "Không giữ" | N/A |
| Đổi một | chạm 🎲 ô Mặn | chỉ ô Mặn đổi, vẫn nhóm Mặn, khác món ô khác | N/A |
| Đổi một khi giữ | ô đang giữ | 🎲 bị khoá | N/A |
| Đổi cả mâm | giữ Rau, chạm "Đổi cả mâm" | Rau giữ nguyên, ô khác quay lại | N/A |
| Thêm ô | ＋ → Rau | 4 ô, ô mới nhóm Rau, không trùng Rau cũ, có ✕ | N/A |
| Hết món khi thêm | nhóm không còn món | ô mới trống (Hết món … + Đổi mùa) | N/A |
| Bỏ ô | ✕ ở ô thêm | còn 3 ô; ô mặc định không có ✕ | N/A |

</frozen-after-approval>

## Code Map

- `web/src/features/tray/store.ts` -- store hiện có `showResult`, `close`, `TraySlot {locked, removable}`.
- `web/src/features/tray/MealTray.tsx` -- `viewSlot`, focus trap, live region; thêm nút.
- `web/src/features/spin/SpinScreen.tsx` -- `spin()` dựng input engine; tách thành hàm `draw` dùng chung, truyền vào `MealTray`.
- `web/src/engine/draw.ts` -- `drawSlots` với `keep`.

## Tasks & Acceptance

**Execution:**
- [x] `web/src/features/tray/store.ts` (+ test) -- các hành động mới.
- [x] `web/src/features/tray/MealTray.tsx` + `.css` -- nút 🎲 🔒 ✕, Đổi cả mâm, ＋ Thêm món + chọn nhóm.
- [x] `web/src/features/spin/SpinScreen.tsx` (+ test) -- hàm `draw` dùng chung.
- [x] `web/src/ui/copy.ts` -- chuỗi.
- [x] `web/e2e/spin.spec.ts` -- giữ + đổi cả mâm; thêm/bỏ ô; nút ≥ 44px.

**Acceptance Criteria:**
- Given `npm run lint && npm run typecheck && npm test && npm run build && npm run test:e2e`, then pass.

## Implementation Notes

- `MealTray` giờ chỉ quyết định mở/đóng; thân mâm là `TrayDialog` mount mỗi lần mở nên state cục bộ (đang chọn nhóm, câu đọc) tự reset — tránh setState trong effect.
- Nút 🔒 hiện 🔓 khi không giữ, 🔒 nền `accent-tile` khi giữ; nhãn đọc "<tên>: Đang giữ/Không giữ" + `aria-pressed`.
- Lớp phủ tối hơn (0.72) để dòng "＋ Thêm món" không lẫn với nút Quay phía sau (thấy khi chụp màn 390×844).
- E2E đo mọi nút trong mâm ≥ 44×44px.

## Spec Change Log

## Review Triage Log

| # | Nguồn | Finding | Verdict | Bằng chứng | Route |
|---|---|---|---|---|---|
| 1 | blind, edge | 🎲 có thể trả lại đúng món cũ | medium | Pool vẫn chứa món hiện tại | patch — `Slot.avoidItemId` trong engine (tránh nếu còn món khác); test engine + store + màn |
| 2 | blind | Test "không trùng" không thể fail (2 ô khác nhóm) | medium | | patch — test 2 ô cùng nhóm |
| 3 | blind, edge, verif | Focus rơi ra `body` sau ✕, chọn nhóm, "Thôi" | medium | Nút đang focus bị gỡ | patch — focus về "＋ Thêm món"/nút nhóm đầu/dialog; test |
| 4 | blind, edge, verif | Không đọc lại mâm sau 🎲, Đổi cả mâm, ＋, ✕ | medium | Live region chỉ đặt lúc mở | patch — `announce()` sau mỗi thao tác (🎲 đọc riêng ô đó); test |
| 5 | blind, verif | E2E 44px bỏ sót nút ✕, nút nhóm, "Thôi" | medium | Đo trước khi mở bộ chọn | patch — đo lại khi mở bộ chọn và khi có ô thêm |
| 6 | verif | "Đổi cả mâm" lấp ô trống chưa có test | medium | | patch — test store |
| 7 | blind, edge | Test `close()` giữ ô bị xoá | low | | patch — thêm lại, kèm ô giữ + ô thêm |
| 8 | edge | Nhiều nút "Bỏ ô Rau" giống nhau | low | | patch — nhãn kèm tên món |
| 9 | edge | Thêm ô không giới hạn | low | | patch — `MAX_SLOTS = 8`, ẩn ＋ khi đủ |
| 10 | edge | Ô giữ mà món đã mất: không có nút mở khoá | low | Nhánh `missing` không có 🔒 | patch — hiện nút mở khoá |
| 11 | blind | Bộ chọn nhóm lặp nhãn (`aria-label` + `<p>`) | low | | patch — `aria-labelledby` |
| 12 | blind | Effect của dialog chạy lại khi `announcement` đổi | false | Prop chỉ đổi khi quay, mà không quay được khi mâm mở | reject |
| 13 | edge | Tên món bị ép ở màn 320px | false | `.meal-slot__info{min-width:0}` + `overflow-wrap:anywhere` đã có | reject |
| 14 | blind | Không có 🎲 cho ô trống | low | "Đổi mùa" và "Đổi cả mâm" đã lo | reject |
| 15 | blind | `extraCounter` toàn module; test viết `'rau'` trong features | low | ID chỉ cần duy nhất; file test được miễn quét | reject |
| 16 | blind | `#fff` viết cứng; lớp phủ tối hơn cho mọi dialog | low | Chỉ có một dialog | reject |

## Verification

**Commands:**
- `cd web && npm run lint && npm run typecheck && npm test && npm run build && npm run test:e2e` -- expected: pass.
