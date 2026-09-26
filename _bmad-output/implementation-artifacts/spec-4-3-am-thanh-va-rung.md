---
title: 'Story 4.3: Âm thanh và rung'
type: 'feature'
created: '2026-09-26'
status: 'done'
baseline_commit: 'd2731c0647af9b1e7d594940c26f947864ceb969'
route: 'dispatch'
review_loop_iteration: 0
context:
  - '{project-root}/_bmad-output/implementation-artifacts/epic-4-context.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** Mở nồi mới chỉ có hình; thiếu "bụp", "ting" và cảm giác rung trên tay.

**Approach:** Mỗi lần một thẻ bật ra (và khi 🎲 đổi món xong) phát âm thanh theo bậc nếu công tắc Âm thanh đang bật, và rung theo bậc trên máy có `navigator.vibrate`. Âm thanh dùng Web Audio với 3 file WAV nhỏ tự tạo, chỉ tải khi âm thanh đang bật; rung qua `ui/haptics.ts`.

## Boundaries & Constraints

**Always:**
- `web/public/sounds/{bup,ting,ting-ting-tinh}.wav` (mono 22,05kHz 16-bit, mỗi file < 50KB), tạo bằng script `scripts/make-sounds.py` (không cần thư viện ngoài).
- `ui/sound.ts`: `unlockAudio()` (tạo/resume `AudioContext` trong thao tác chạm của người dùng — iOS), `preloadSounds()`, `playRaritySound(r)`; tải + decode lười, cache theo bậc; không có Web Audio / tải lỗi / decode lỗi thì im lặng, không ném lỗi.
- `ui/haptics.ts`: `vibrateRarity(r)`: ⭐ nhẹ (15ms), ⭐⭐ vừa (35ms), ⭐⭐⭐ mạnh 2 nhịp (`[60, 80, 60]`); không có `navigator.vibrate` (iPhone) hoặc bị chặn thì bỏ qua êm.
- Thời điểm: cùng lúc thẻ bật (chuỗi 4.1/4.2) và khi 🎲 lật xong; giảm chuyển động (mâm hiện một lần) thì phản hồi một lần theo bậc cao nhất khi mâm hiện, 🎲 thì phản hồi ngay. Mở lại mâm cũ không phát. Bỏ qua chuỗi bật thì các thẻ còn lại không phát.
- Âm thanh tắt (mặc định) → không tải file, không phát gì. Chạm "Mở nồi!" khi âm thanh bật → `unlockAudio` + `preloadSounds`. Bật công tắc ở Cài đặt → unlock, tải và phát thử "ting".
- Rung không phụ thuộc công tắc âm thanh.

**Never:** Không thêm thư viện âm thanh; không tải file khi âm thanh tắt; không lưu gì lên server.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Âm thanh tắt | quay | không request `/sounds/`, không phát; vẫn rung (nếu có) | N/A |
| Âm thanh bật | quay, mâm ⭐,⭐⭐,⭐⭐⭐ | "bụp", "ting", "ting-ting-tinh" đúng lúc từng thẻ bật | N/A |
| iPhone | không có vibrate | không lỗi | N/A |
| Không Web Audio | trình duyệt cũ | im lặng, không lỗi | N/A |
| File lỗi | 404 / decode lỗi | im lặng, lần sau thử lại | N/A |
| Bật ở Cài đặt | chạm công tắc | phát thử "ting" | N/A |
| Giảm chuyển động | mâm có ⭐⭐⭐ | một lần "ting-ting-tinh" + rung 2 nhịp khi mâm hiện | N/A |

</frozen-after-approval>

## Code Map

- `web/src/features/tray/MealTray.tsx` -- `playBurst`, chuỗi bật, `flipThenBurst`.
- `web/src/features/spin/SpinScreen.tsx` -- `spin()`, `open()` (giảm chuyển động).
- `web/src/features/settings/SettingsScreen.tsx` -- công tắc âm thanh.
- `web/src/ui/preferences.ts` -- `useSoundEnabled`.

## Tasks & Acceptance

**Execution:**
- [x] `scripts/make-sounds.py`, `web/public/sounds/*.wav` (kiểm kích thước trong e2e).
- [x] `web/src/ui/sound.ts`, `web/src/ui/haptics.ts` (+ test).
- [x] `web/src/features/tray/MealTray.tsx`, `spin/SpinScreen.tsx`, `settings/SettingsScreen.tsx` (+ test) -- gọi phản hồi.
- [x] `web/e2e/sound.spec.ts` -- tắt thì không tải file; bật thì tải và phát không lỗi.

**Acceptance Criteria:**
- Given `npm run lint && npm run typecheck && npm test && npm run build && npm run test:e2e`, then pass.

## Implementation Notes

- Sau review: `resume()` khi `state !== 'running'` (iOS `interrupted`); decode hỗ trợ cả callback (Safari cũ) lẫn Promise; tải xong trễ hơn `LATE_MS` (400ms) thì bỏ, không phát lệch nhịp; 🎲 và "Đổi cả mâm" mở khoá âm thanh trong lần chạm; "Đổi cả mâm" và "bỏ qua" phản hồi một lần theo bậc cao nhất.
- Sửa kèm: `e2e/items.spec.ts` đổi tên một món seed ngẫu nhiên mà không trả lại → thư viện e2e chập chờn khi trúng "Cá kho tộ".

- Web Audio thay vì `<audio>`: âm thanh phát theo hẹn giờ (sau lần chạm), iOS chỉ cho phát sau khi `AudioContext` được resume trong thao tác chạm → `unlockAudio()` gọi ngay trong `spin()` và khi bật công tắc.
- `ui/feedback.ts` gộp rung + âm thanh; MealTray đọc công tắc âm thanh qua ref để hẹn giờ luôn dùng giá trị mới nhất.
- Kích thước file (< 50KB) kiểm trong e2e qua HTTP (tsconfig app không có kiểu Node cho `fs`). File: bup 9,7KB, ting 24KB, ting-ting-tinh 46KB.

## Spec Change Log

## Review Triage Log

| # | Nguồn | Finding | Verdict | Bằng chứng | Route |
|---|---|---|---|---|---|
| 1 | blind, edge | Safari cũ: `decodeAudioData` chỉ callback → im lặng mãi | medium | | patch — bọc cả hai dạng, kết quả rỗng là lỗi; test |
| 2 | blind, edge | iOS `interrupted` không được resume | medium | | patch — resume khi khác `running`, cả lúc phát; test |
| 3 | blind, edge | 🎲 / mâm mở lại không mở khoá âm thanh | medium | | patch — `unlockOnTap` trong 🎲 và Đổi cả mâm; test |
| 4 | blind | Đổi cả mâm không phản hồi | low | | patch — một lần theo bậc cao nhất của ô vừa đổi; test |
| 5 | blind | Bỏ qua nuốt ⭐⭐⭐ | low | | patch — một lần theo bậc cao nhất của thẻ chưa bật; test |
| 6 | blind, edge | Tải trễ phát lệch nhịp / phát sau khi đã tắt | low | | patch — bỏ nếu trễ > 400ms; test |
| 7 | verif | `rarityFeedback` chưa có test; giảm chuyển động chỉ test khi tắt tiếng | medium | | patch — `feedback.test.ts`; test giảm chuyển động + tiếng |
| 8 | blind | Không có kiểm âm thanh thật sự phát trong e2e | low | | patch — đếm `AudioBufferSourceNode.start` |
| 9 | blind | File ting-ting-tinh sát 50KB, script không tự kiểm | low | | patch — assert trong script |
| 10 | blind | Settings không kiểm thứ tự unlock trước play | low | | patch — kiểm `invocationCallOrder` |
| 11 | blind | File âm thanh không có trong diff | reject | Diff loại file nhị phân; file được commit cùng story | reject |
| 12 | blind | Rung không có công tắc tắt | reject | UX: rung trên máy hỗ trợ, không có tuỳ chọn; ghi nhận cho sau | reject |
| 13 | edge | Bật giảm chuyển động giữa chuỗi bật vẫn phản hồi từng thẻ | reject | Hiếm; phản hồi đúng lúc thẻ hiện vẫn hợp lý | reject |

## Verification

**Commands:**
- `cd web && npm run lint && npm run typecheck && npm test && npm run build && npm run test:e2e` -- expected: pass.
