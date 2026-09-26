---
title: 'Story 4.4: Giảm chuyển động'
type: 'feature'
created: '2026-09-26'
status: 'in-review'
baseline_commit: 'cd9aed179e824b71db03c5973345afbcad05f816'
route: 'dispatch'
review_loop_iteration: 0
context:
  - '{project-root}/_bmad-output/implementation-artifacts/epic-4-context.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** Người nhạy cảm với chuyển động cần app tôn trọng Reduce Motion ở mọi chỗ, không chỉ màn Quay; và animation thêm sau này không được lọt.

**Approach:** Rà và chốt nhánh giảm chuyển động ở toàn bộ app (CSS + JS), thêm lưới an toàn cho thư viện `motion` và test kiến trúc chặn animation mới thiếu nhánh giảm chuyển động; e2e chạy thật với `reducedMotion: 'reduce'`.

## Boundaries & Constraints

**Always:**
- Giảm chuyển động (`prefers-reduced-motion: reduce`): không nồi sôi/nhá hàng/nắp bật, không tia sáng/hạt bay/sao, không lật, không bật lần lượt; cả mâm hiện dần (fade) 300ms; mọi transition/animation trang trí khác (toast, modal, thẻ, công tắc, nút Quay) tắt.
- Độ hiếm vẫn nhận ra qua màu viền và số sao (+ chữ bậc) khi giảm chuyển động.
- JS: mọi chỗ cần biết giảm chuyển động đọc qua `ui/useReducedMotion` (không gọi `matchMedia('(prefers-reduced-motion…')` chỗ khác). App bọc `MotionConfig reducedMotion="user"` làm lưới an toàn cho `motion`.
- Test kiến trúc: mỗi file CSS có `animation`/`transition` phải có khối `@media (prefers-reduced-motion: reduce)`; file dùng `motion/react` phải dùng `useReducedMotion`; chỉ `ui/useReducedMotion.ts` đọc media query.
- Phản hồi âm thanh/rung vẫn giữ (không phải chuyển động) theo 4.3.

**Never:** Không thêm công tắc riêng trong app (theo cài đặt hệ thống). Không bỏ fade 300ms của mâm.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Mở nồi | reduce | nồi đứng yên, ~0,3s sau mâm hiện đủ (fade), không lớp bỏ qua, không hiệu ứng | N/A |
| 🎲 | reduce | ô đổi ngay, không lật, không hiệu ứng | N/A |
| Độ hiếm | reduce, ⭐⭐⭐ | viền vàng + ⭐⭐⭐ Đặc biệt | N/A |
| Toast/Modal/Công tắc/Thẻ | reduce | không animation/transition | N/A |
| Animation mới thiếu nhánh | dev thêm CSS animation | test kiến trúc đỏ | N/A |

</frozen-after-approval>

## Code Map

- `web/src/**/*.css` -- animation/transition hiện có (đa số đã có khối reduce; `SpinScreen.css` nút Quay chưa).
- `web/src/app/App.tsx` -- gốc app.
- `web/src/ui/useReducedMotion.ts`, `features/{spin,tray}`.

## Tasks & Acceptance

**Execution:**
- [x] `web/src/features/spin/SpinScreen.css` -- tắt transition nút Quay khi reduce.
- [x] `web/src/app/App.tsx` -- `MotionConfig reducedMotion="user"` (+ `LazyMotion`/`m`, Cài đặt tải lười).
- [x] `web/src/test/reducedMotion.test.ts` -- test kiến trúc (CSS + JS).
- [x] `web/src/features/spin/SpinScreen.test.tsx` -- độ hiếm vẫn nhận ra khi reduce.
- [x] `web/e2e/reduced-motion.spec.ts` -- chạy thật với reduce.

**Acceptance Criteria:**
- Given `npm run lint && npm run typecheck && npm test && npm run build && npm run test:e2e`, then pass.

## Implementation Notes

- Phần lớn nhánh giảm chuyển động đã làm cùng 4.1–4.3 (nồi, bật thẻ, hiệu ứng, lật, phản hồi); story này rà toàn app và khoá lại bằng test kiến trúc (`src/test/reducedMotion.test.ts`, đọc mã nguồn qua `import.meta.glob(?raw)`).
- Nút Quay còn transition khi nhấn → thêm khối reduce.
- Bundle chính vượt 500KB từ khi thêm `motion` (4.1): chuyển sang `LazyMotion` + `m` (−47KB) và tải lười màn Cài đặt → 498KB.

## Spec Change Log

## Review Triage Log

## Verification

**Commands:**
- `cd web && npm run lint && npm run typecheck && npm test && npm run build && npm run test:e2e` -- expected: pass.
