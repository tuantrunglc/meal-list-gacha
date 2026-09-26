---
title: 'Story 4.2: Hiệu ứng riêng theo độ hiếm'
type: 'feature'
created: '2026-09-26'
status: 'done'
baseline_commit: '2ccd0f8af5ae9d4aa29bfd1d4420679da5ee440d'
route: 'dispatch'
review_loop_iteration: 0
context:
  - '{project-root}/_bmad-output/implementation-artifacts/epic-4-context.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** Thẻ nào bật ra cũng giống nhau; ra món ⭐⭐⭐ không thấy "đã".

**Approach:** Mỗi thẻ khi bật (và khi 🎲 đổi món) chạy hiệu ứng theo bậc, gói trong `ui/RarityBurst` (chỉ trang trí, trong 24px quanh thẻ); nồi có nhá hàng ⭐⭐⭐ (một lần mỗi mâm) và lóe xanh cho ⭐⭐; 🎲 làm ô đó lật ~0,6s.

## Boundaries & Constraints

**Always:**
- `ui/RarityBurst.tsx` (`aria-hidden`, `pointer-events:none`, tự hết giờ): ⭐ hơi nước nhỏ (~0,7s); ⭐⭐ vệt sáng xanh (`rarity-rare`) quét viền + vài hạt gạo bắn ra (~0,8s); ⭐⭐⭐ tia sáng vàng xoay sau thẻ (độ mờ ≤ 0,4) + sao ✦ quanh viền + chữ "Đặc biệt!" nảy lên (~1,5s). Mọi phần tử nằm trong 24px quanh thẻ.
- Chuỗi bật (4.1): thẻ nảy (spring) như cũ; thẻ ⭐⭐⭐ bật chậm hơn một nhịp (+300ms, spring mềm hơn); thẻ cuối là ⭐⭐⭐ thì mâm giữ lớp "chạm để bỏ qua" tới hết hiệu ứng (~1,5s) rồi mới mở khoá. Bỏ qua thì dừng mọi hiệu ứng đang chạy.
- Nồi (`GachaPot`): mâm có ⭐⭐⭐ → sau khi sôi, nhá hàng 0,8s (rung mạnh, khe nắp sáng vàng, hơi nước cuộn) rồi mới bật nắp — một lần mỗi mâm dù nhiều ⭐⭐⭐; mâm có ⭐⭐ (không có ⭐⭐⭐) → nắp lóe xanh khi bật.
- 🎲: chỉ ô đó lật (Web Animations `rotateY`, ~0,6s, focus giữ trên nút 🎲), nồi không rung, xong chạy hiệu ứng theo bậc món mới.
- Giảm chuyển động: không hiệu ứng, không nhá hàng, không lật (4.4 rà thêm).

**Never:** Không phủ kín màn hình, không đổi nền; không đổi dữ liệu/thứ tự; không đọc "Đặc biệt!" lần hai (độ hiếm đã có trong câu đọc).

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Thẻ ⭐ | bật | hơi nước nhỏ, tự tắt | N/A |
| Thẻ ⭐⭐ | bật | vệt xanh + hạt gạo; nắp lóe xanh nếu mâm không có ⭐⭐⭐ | N/A |
| Thẻ ⭐⭐⭐ | bật | nhá hàng ở nồi trước khi mở; thẻ chậm một nhịp; tia vàng + ✦ + "Đặc biệt!"; mâm mở khoá sau ~1,5s | N/A |
| Hai ⭐⭐⭐ | mâm có 2 | nhá hàng một lần; mỗi thẻ có hiệu ứng riêng | N/A |
| Bỏ qua | chạm khi đang ⭐⭐⭐ | hiệu ứng dừng, mâm đủ, mở khoá | N/A |
| 🎲 | đổi ô | ô lật, focus ở 🎲, rồi hiệu ứng bậc mới | N/A |
| Giảm chuyển động | reduce | không hiệu ứng nào | N/A |

</frozen-after-approval>

## Code Map

- `web/src/features/tray/MealTray.tsx` -- chuỗi bật, 🎲, POP.
- `web/src/features/spin/SpinScreen.tsx` -- thời điểm sôi → nắp → mâm.
- `web/src/ui/{GachaPot,RarityBadge,useReducedMotion,copy}`.

## Tasks & Acceptance

**Execution:**
- [x] `web/src/ui/RarityBurst.tsx` + `.css` (+ test).
- [x] `web/src/ui/GachaPot.tsx` + `.css` -- nhá hàng, lóe xanh.
- [x] `web/src/features/tray/MealTray.tsx` + `.css` (+ test) -- hiệu ứng khi bật/🎲, nhịp ⭐⭐⭐, lật.
- [x] `web/src/features/spin/SpinScreen.tsx` (+ test) -- nhá hàng trước khi mở.
- [x] `web/src/ui/copy.ts` -- "Đặc biệt!".

**Acceptance Criteria:**
- Given `npm run lint && npm run typecheck && npm test && npm run build && npm run test:e2e`, then pass.

## Implementation Notes

- `RarityBurst` nằm trong `li` (`position:relative; isolation:isolate`) với `z-index:-1`: tia sáng vẽ trên nền thẻ nhưng dưới nội dung; `inset:-12px` nên mọi phần tử trong 24px quanh thẻ; hẹn giờ giữ `onDone` qua ref để không chạy lại khi cha render lại.
- Kế hoạch bật (id + bậc) chốt trong effect lúc bắt đầu bật, từ `slot.rarity` của lần quay — cùng nguồn với nồi nhá hàng. Mâm giữ khoá tới khi hiệu ứng ⭐⭐⭐ dài nhất xong (tính theo đồng hồ của chuỗi).
- Màn Quay thêm `busy` (từ lúc chạm tới khi mâm mở) để nút Quay khoá cả trong pha nhá hàng và nắp bật (trước đây chỉ khoá lúc sôi).
- 🎲 lật bằng `element.animate` (không remount ô nên focus giữ ở nút 🎲); môi trường không có Web Animations thì bỏ qua.

## Spec Change Log

## Review Triage Log

| # | Nguồn | Finding | Verdict | Bằng chứng | Route |
|---|---|---|---|---|---|
| 1 | edge | Nắp không bao giờ lóe xanh: rule `--opening` (sau, cùng độ ưu tiên) đè `--flash-rare` | high | CSS cascade | patch — tăng độ ưu tiên |
| 2 | blind, edge | Hai nguồn độ hiếm (nồi dùng kết quả quay, mâm dùng món hiện tại) | medium | | patch — cả hai dùng `slot.rarity` |
| 3 | blind | Giữ khoá chỉ khi thẻ cuối là ⭐⭐⭐ | low | Engine luôn dời ⭐⭐⭐ xuống cuối | patch — tính theo hiệu ứng ⭐⭐⭐ dài nhất; test hai món ⭐⭐⭐ |
| 4 | blind, edge | Closure cũ `reducedMotion` trong hẹn giờ; eslint-disable | low | | patch — ref; bỏ eslint-disable |
| 5 | blind, edge | 🎲 liên tục chồng lật và nhiều hiệu ứng | low | | patch — mỗi ô một lần lật, huỷ lần trước; test |
| 6 | blind, edge | Hạt gạo bay quá 24px | medium | | patch — từ mép trên, tối đa ~18px |
| 7 | blind | Màu viết cứng | low | | patch — `color-mix` với token |
| 8 | blind | Khe vàng tắt phụt khi nắp bật | low | | patch — `flash-legend` tắt dần 0,5s |
| 9 | verif | Chưa test chạm lại lúc nhá hàng; bỏ qua bằng bàn phím khi có hiệu ứng; 🎲 khác bậc; rời màn lúc nhá hàng | medium | | patch — thêm test |
| 10 | blind, edge | `revealPlan` không reset | low | Dialog mount mới mỗi lần mở | patch (nay chốt trong effect) |
| 11 | blind | Nhá hàng không bỏ qua được | reject | Như nồi sôi (UX: không bỏ qua được); 0,8s | reject |
| 12 | blind | `spinAndWait` tiến 5000ms, mất độ chính xác | reject | Thời gian chính xác nằm ở test chuyên biệt dùng hằng export | reject |
| 13 | edge | Không có test riêng MealTray | reject | Hành vi phủ qua SpinScreen (tích hợp thật với store) | reject |

## Verification

**Commands:**
- `cd web && npm run lint && npm run typecheck && npm test && npm run build && npm run test:e2e` -- expected: pass.
