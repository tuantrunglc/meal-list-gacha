---
title: 'Story 4.1: Mở nồi, thẻ bật ra lần lượt'
type: 'feature'
created: '2026-09-26'
status: 'done'
baseline_commit: 'a73c98a23b5e0e6e5f15b45790fb6e0d2ca5669d'
route: 'dispatch'
review_loop_iteration: 0
context:
  - '{project-root}/_bmad-output/implementation-artifacts/epic-4-context.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** Quay xong mâm hiện ra một cục, thiếu cảm giác hồi hộp của gacha.

**Approach:** Nồi sôi xong thì nắp bật, mâm mở ra và các thẻ món bật vào mâm lần lượt theo thứ tự engine (món ⭐⭐⭐ cuối), cách nhau ~0,5 giây, bằng `motion`; chạm bất kỳ đâu để hiện cả mâm ngay; thông báo aria-live chỉ phát một lần khi mâm đủ.

## Boundaries & Constraints

**Always:**
- Store mâm: `revealing` (true khi `showResult`; false khi xong/bỏ qua/đóng/chốt) + `finishReveal()`. Mở lại mâm cũ (sau form Sửa/Thêm) không bật lại.
- `TrayDialog`: khi `revealing`: ô thứ n hiện sau ~300ms + (n−1)×500ms với hiệu ứng bật (`motion`: từ nhỏ/lệch lên → vào chỗ, spring), các nút trên mâm bị khoá (`fieldset disabled`), một nút trong suốt phủ lớp mâm "Hiện cả mâm ngay" (bấm/chạm/Enter → `finishReveal`), chạm nền không đóng mâm lúc đang bật. Ô cuối hiện xong ~600ms thì tự `finishReveal`. Xong thì focus về dialog.
- Aria-live mâm chỉ đặt sau khi `revealing=false` (một lần).
- `GachaPot`: thêm trạng thái `open` (nắp bật lên rồi rơi về, ~0,6s) khi hết sôi; màn Quay đặt `open` lúc mâm mở rồi về nghỉ.
- Giảm chuyển động: không bật lần lượt (`revealing=false` ngay), giữ fade 300ms hiện có; nắp không bật.
- Hiệu ứng chỉ quanh thẻ, không đổi nền.

**Never:** Không đổi thứ tự của engine, không ghi server. Chưa có hiệu ứng theo độ hiếm (4.2), âm thanh/rung (4.3).

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Bật lần lượt | quay xong, 3 ô | 0 ô → 1 → 2 → 3 cách ~0,5s; nút mâm khoá tới khi đủ | N/A |
| Bỏ qua | chạm khi mới 1 ô | hiện đủ 3 ô ngay, nút mở khoá, đọc mâm một lần | N/A |
| Đọc mâm | trong lúc bật | aria-live rỗng; đủ mâm thì đọc đúng câu | N/A |
| Mở lại mâm | từ form Sửa quay về | hiện đủ ngay, không bật lại | N/A |
| Giảm chuyển động | reduce | hiện đủ ngay (fade 300ms) | N/A |
| Esc lúc bật | Esc | đóng mâm (như cũ), lần mở lại không bật | N/A |

</frozen-after-approval>

## Code Map

- `web/src/features/tray/{store.ts,MealTray.tsx,MealTray.css}` -- showResult, TrayDialog (focus, announcement effect).
- `web/src/features/spin/SpinScreen.tsx` -- spin timer, `GachaPot boiling`, mở lại mâm (`setState({open:true})`).
- `web/src/ui/{GachaPot.tsx,GachaPot.css,useReducedMotion.ts,copy.ts}`.

## Tasks & Acceptance

**Execution:**
- [x] `web/src/features/tray/store.ts` (+ test) -- `revealing`, `finishReveal`.
- [x] `web/src/features/tray/MealTray.tsx` + `.css` (+ test) -- bật lần lượt, nút bỏ qua, aria-live sau cùng.
- [x] `web/src/ui/GachaPot.tsx` + `.css`, `web/src/features/spin/SpinScreen.tsx` (+ test) -- nắp bật; giảm chuyển động không bật lần lượt.
- [x] `web/src/ui/copy.ts` -- "Hiện cả mâm ngay".
- [x] `web/e2e/spin.spec.ts` -- thẻ bật lần lượt, chạm bỏ qua.

**Acceptance Criteria:**
- Given `npm run lint && npm run typecheck && npm test && npm run build && npm run test:e2e`, then pass.

## Implementation Notes

- Ô chưa bật là `li` giữ chỗ (`visibility:hidden`, `aria-hidden`) nên mâm không nhảy chiều cao; khi bật, `li` đổi sang `motion.li` (khác kiểu phần tử → mount mới → chạy `initial`).
- Hiệu ứng `POP` chỉ áp khi `revealing`; ô thêm bằng ＋ hay 🎲 sau đó không bật lại.
- Aria-live tách khỏi effect focus: chỉ đặt câu đọc khi `revealing=false`.
- Bỏ qua: lớp `div` trong suốt phủ cả màn (chạm, `aria-hidden`) + nút ẩn "Hiện cả mâm ngay" bên trong dialog + Enter/Space trên dialog.
- Mâm mở sau khi nắp bật `LID_LEAD_MS` (250ms) để thấy nắp bật trước; hẹn giờ nắp có ref riêng.
- E2E: helper `trayReady` chờ câu đọc "Mâm cơm: …" (chỉ có khi đủ thẻ) và transform các thẻ về đứng yên trước khi đọc tên/đo nút.

## Spec Change Log

- Thời gian chờ sau thẻ cuối 400ms → 600ms: spring chưa dừng hẳn thì nút đo được < 44px trong e2e.

## Review Triage Log

| # | Nguồn | Finding | Verdict | Bằng chứng | Route |
|---|---|---|---|---|---|
| 1 | blind, edge | Bàn phím/trình đọc không bỏ qua được: nút bỏ qua nằm ngoài dialog `aria-modal` | high | Spec đòi Enter | patch — nút ẩn trong dialog + Enter/Space; lớp chạm `aria-hidden`; test |
| 2 | blind | Nắp bật bị lớp mâm che, không theo thứ tự "nắp bật rồi mâm mở" | medium | Cùng tick | patch — mâm mở sau `LID_LEAD_MS`; test class nắp |
| 3 | edge | Hẹn giờ nắp ghi đè `timer.current`, không được dọn khi rời màn | low | | patch — ref riêng, dọn khi unmount |
| 4 | verif, blind | Nhánh giảm chuyển động không được kiểm (không bật lần lượt, mở khoá, đọc ngay) | medium | | patch — mở rộng test |
| 5 | blind | Test không kiểm thứ tự bật theo engine; chạm nền lúc bật; số thời gian viết cứng | low | | patch — kiểm tên theo thứ tự, dùng hằng export, test chạm nền |
| 6 | blind, edge | E2E đua thời gian (trạng thái chớp nhoáng, timeout 300ms, chạm giữa màn khi lớp đã mất) | medium | | patch — bỏ kiểm chớp nhoáng (unit lo), chờ lớp bỏ qua rồi chạm; `trayReady` chờ transform đứng yên |
| 7 | blind | Class `tray-overlay--revealing` không có CSS | low | | patch — bỏ class |
| 8 | blind | Mở khoá theo hẹn giờ thay vì `onAnimationComplete` | low | Hẹn giờ cố định giữ unit test xác định; e2e chờ transform đứng yên | reject |
| 9 | blind | `shown` không reset khi `revealing` bật lại lúc dialog còn mount | low | Chỉ `showResult` từ nút Quay (bị lớp mâm che) bật reveal, luôn là mount mới | reject |

## Verification

**Commands:**
- `cd web && npm run lint && npm run typecheck && npm test && npm run build && npm run test:e2e` -- expected: pass.
