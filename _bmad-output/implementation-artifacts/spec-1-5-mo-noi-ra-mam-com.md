---
title: 'Story 1.5: Mở nồi ra mâm cơm'
type: 'feature'
created: '2026-09-26'
status: 'in-review'
baseline_commit: '69dc5c4a009af6130d689e3230d34f25e88dfeab'
route: 'dispatch'
review_loop_iteration: 0
context:
  - '{project-root}/_bmad-output/implementation-artifacts/epic-1-context.md'
  - '{project-root}/_bmad-output/planning-artifacts/ux-designs/ux-app-eat-lucky-2026-09-26/DESIGN.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** Có món và luật rồi nhưng chưa có màn để mở nồi.

**Approach:** Dựng màn Quay theo mock đã duyệt (tiêu đề Bộ, chip mùa, nồi đất 220px thở nhẹ, nút "Mở nồi!" 64px, nền gạch bông mờ) và lớp phủ Mâm cơm hiển thị kết quả engine. Trạng thái mâm nằm trong store zustand của `features/tray`, không ghi server.

## Boundaries & Constraints

**Always:**
- Màn Quay: nút "Bộ: <nhãn Bộ> ▾" lấy từ registry, `disabled` (v1 chưa chọn được); lời chào "Nay ăn gì cả nhà?"; mỗi facet của Bộ là một nhóm chip (`radiogroup`, chip cao 36px, chấm màu, chip chọn tô nền `accent-tile`), mặc định `facet.defaultValue(now)`; nồi đất SVG 220px "thở" (CSS, tắt khi reduced-motion); nút "Mở nồi!" cao 64px màu `primary` gần tab bar; nền hoạ tiết gạch bông `accent-tile` độ mờ thấp; dòng "Mở thử đi cả nhà!" khi chưa có mâm nào đã chốt (chưa có `draws` tới Story 1.8 → luôn hiện, có prop để tắt).
- Chạm "Mở nồi!": gọi engine một lần ngay (rng `Math.random`, `now` thật, `recentDraws` rỗng tới Story 1.8, `cooldownDays = defaultCooldownDays`, ô theo `slotTemplate`), khoá nút + nồi sôi (rung nhẹ, nắp nảy) khoảng 1,5 giây (reduced-motion: 300ms), rồi mở Mâm cơm. Chạm thêm khi đang quay không có tác dụng. Món chưa tải xong thì nút khoá.
- Store `features/tray/store.ts` (zustand): `slots` theo thứ tự `revealOrder` của engine, mỗi ô `{ id, groupKey, itemId, rarity, status, locked, removable }`; `open`; hành động `showResult(result, template)`, `close()`.
- Mâm cơm: `role="dialog"` `aria-modal`, nhãn "Mâm cơm", nền `tray`, câu "Nồi Thần dọn mâm!". Mỗi ô `meal-slot` cao ≥ 96px: ảnh 72px (`DishImage` compact), nhãn nhóm (màu nhóm), tên (font title), huy hiệu sao + nhãn độ hiếm, viền 3px màu độ hiếm. Ô `empty`: "Hết món <nhóm> mùa này rồi 😅" + nút "Đổi mùa" (đóng mâm, focus vào nhóm chip). Nút đóng mâm "Để sau". Esc đóng. Chỉ một lớp modal.
- aria-live (polite) khi mâm hiện: "Mâm cơm: Mặn <tên>, <bậc>; Rau …; Canh …" theo thứ tự ô trên mâm; ô trống đọc "<nhóm> hết món".
- Component dùng chung ở `ui/`: `GroupTag`, `RarityBadge`, `ChipGroup`, `GachaPot`, `useReducedMotion`. Chuỗi ở `ui/copy.ts`; nhãn nhóm/mùa lấy từ `SetDefinition`.

**Never:** Chưa có 🎲/🔒/＋/Đổi cả mâm (1.6), Chốt mâm (1.8), chi tiết món (1.7), thẻ bật lần lượt và hiệu ứng theo độ hiếm (Epic 4), bánh răng Cài đặt (3.3). Không gọi server khi quay. Không viết cứng key Bộ trong `features/`.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Mở màn | tháng 9 | chip Thu được chọn, gợi ý "Mở thử đi cả nhà!" | N/A |
| Quay | chạm "Mở nồi!" | nút khoá ~1,5s, rồi mâm 3 ô theo `revealOrder` | N/A |
| Chạm liên tục | chạm 3 lần khi đang quay | chỉ quay 1 lần | N/A |
| Hết món | nhóm không còn món ở mùa chọn | ô đó "Hết món <nhóm> mùa này rồi 😅" + "Đổi mùa"; ô khác bình thường | N/A |
| Đổi mùa | chạm "Đổi mùa" | mâm đóng, focus ở chip mùa | N/A |
| Đọc màn hình | mâm hiện | aria-live đúng câu | N/A |
| Đổi chip | chọn Hạ rồi quay | chỉ món `ha` hoặc `quanh-nam` | N/A |

</frozen-after-approval>

## Code Map

- `web/src/features/spin/SpinScreen.tsx` (+ test) -- đang gọi `useItems`, hiện lỗi + Thử lại; viết lại màn.
- `web/src/data/items.ts` -- `useItems(set) → ItemsResult`, `Item`, `itemImageSources`.
- `web/src/engine` -- `drawSlots`, `EngineItem`, `SlotResult`, `DrawResult`.
- `web/src/sets/registry.ts`, `sets/types.ts` -- `getSet`, `DEFAULT_SET_KEY`, `groups`, `facets`, `slotTemplate`.
- `web/src/ui/{DishImage,copy,global.css,tokens.css}` -- ảnh món, chuỗi, `.button-primary/secondary`.
- `web/src/app/App.tsx` -- `.app-main` bọc màn; tab bar cố định dưới.
- Mock tham khảo: `_bmad-output/planning-artifacts/ux-designs/ux-app-eat-lucky-2026-09-26/mockups/quay-va-mam-com.html` (SVG nồi, hoạ tiết gạch bông, mâm tre).

## Tasks & Acceptance

**Execution:**
- [x] `web/src/ui/{GroupTag,RarityBadge,ChipGroup,GachaPot}.tsx` + `.css`, `ui/useReducedMotion.ts` -- component dùng chung.
- [x] `web/src/features/tray/store.ts` (+ test) -- store mâm.
- [x] `web/src/features/tray/MealTray.tsx` + `.css` -- lớp phủ mâm, ô món, ô trống, aria-live, Esc.
- [x] `web/src/features/spin/SpinScreen.tsx` + `.css` (+ test viết lại) -- màn Quay.
- [x] `web/src/ui/copy.ts` -- chuỗi mới.
- [x] `web/e2e/spin.spec.ts` -- đăng nhập, quay, thấy mâm 3 ô, đóng mâm.

**Acceptance Criteria:**
- Given `npm run lint && npm run typecheck && npm test && npm run build && npm run test:e2e`, then pass; ảnh chụp màn Quay và Mâm cơm ở 390×844 khớp mock.

## Implementation Notes

- Câu "Hết món … mùa này rồi 😅" và "Đổi mùa" dính với facet mùa nên là chữ của Bộ: thêm `SetDefinition.messages { emptySlot, changeFilter }` (Bộ food điền trong `sets/food/copy.ts`).
- Nút "Mở nồi!" dùng `aria-disabled` khi đang sôi (giữ focus, chạm không có tác dụng), `disabled` khi món chưa tải.
- Tiêu đề trang đổi thành lời chào "Nay ăn gì cả nhà?" (theo mock); test/e2e cũ tìm "Mở nồi" đã cập nhật.
- Đã chụp màn Quay và Mâm cơm ở 390×844 bằng Chrome: khớp mock (chip Thu chọn sẵn, nồi, nút đỏ 64px, mâm tre, ô viền màu độ hiếm, đĩa trống khi chưa có ảnh).

## Spec Change Log

## Review Triage Log

## Verification

**Commands:**
- `cd web && npm run lint && npm run typecheck && npm test && npm run build && npm run test:e2e` -- expected: pass.

**Manual checks:**
- Chụp màn Quay và Mâm cơm (Playwright, Chrome) ở 390×844 và so với mock.
