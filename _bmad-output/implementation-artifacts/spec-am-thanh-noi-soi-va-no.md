---
title: 'Âm thanh nồi sôi rung và nổ "bùm"'
type: 'feature'
created: '2026-09-26'
status: 'done'
route: 'oneshot'
review_loop_iteration: 0
context:
  - '{project-root}/_bmad-output/implementation-artifacts/spec-4-3-am-thanh-va-rung.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** Khi bấm "Mở nồi!", nồi đất rung/sôi rồi bật nắp nhưng hoàn toàn im lặng — chỉ có tiếng khi từng thẻ bật. Người dùng muốn nghe nồi rung lục cục rồi nổ "bùm". Ngoài ra tiếng phát thử khi bật công tắc ở Cài đặt lần đầu có thể bị bỏ vì tải file lâu hơn `LATE_MS` (400ms).

**Approach:** Thêm 2 file âm thanh tự tạo trong `scripts/make-sounds.py`: `rung.wav` (tiếng nồi sôi ùng ục + nắp lục cục, lặp liền mạch) và `bum.wav` (tiếng nổ trầm + nắp bật). Trong `ui/sound.ts` thêm phát lặp có thể dừng và phát một lần; `SpinScreen` phát tiếng rung suốt lúc nồi sôi (kể cả nhá hàng ⭐⭐⭐), dừng và phát "bùm" đúng lúc nắp bật. Chỉ khi công tắc Âm thanh bật; giảm chuyển động (nồi không bật nắp) thì không phát tiếng nồi, giữ phản hồi theo bậc như cũ. Tiếng phát thử ở Cài đặt không bị giới hạn trễ.

</frozen-after-approval>

## Implementation Notes

- File mới: `web/public/sounds/soi.wav` (1s lặp liền mạch, 44KB, mức 0.45 để "bùm" nổi bật) và `bum.wav` (0.7s, 31KB); 3 file cũ không đổi (script tất định). Tên `soi` thay cho "rung" trong intent vì "rung" trong code đã là rung máy (haptics).
- `ui/sound.ts`: tổng quát theo tên âm thanh; `startPotRumble()` trả hàm dừng (loop qua GainNode, hạ nhỏ ~40ms rồi dừng — không "tách"); tải chậm thì bắt đầu khi tải xong nếu chưa dừng; `playPotBoom()` (giới hạn `LATE_MS`); `playRaritySound(r, { late })` cho phát thử, chờ tối đa 3s.
- `SpinScreen`: bắt đầu rung sau `draw`, chỉ khi âm thanh bật và không giảm chuyển động; `popLid` dừng rung rồi "bùm" (chỉ khi đã rung); rời màn thì dừng.
- Test: unit (sound, SpinScreen, Settings) + e2e đếm 6 lần phát (sôi + bùm + 4 thẻ... theo mâm e2e). Toàn bộ lint/typecheck/test/build/e2e qua.

## Review Triage Log

| # | Finding | Verdict | Xử lý |
|---|---|---|---|
| 1 | Comment ⭐⭐⭐ lệch chỗ trong make-sounds.py | low | patch |
| 2 | Dừng loop bằng `stop()` cứng gây tiếng tách | medium | patch — GainNode + hạ nhỏ; test |
| 3 | Rung bắt đầu muộn sát lúc nổ nghe như lỗi | low | reject — chỉ lần đầu tải trên mạng chậm; bị "bùm" che |
| 4 | Phát thử `late` không giới hạn, có thể kêu sau khi đã tắt | low | patch — giới hạn 3s; test |
| 5 | Tab nền: setTimeout bị bóp, loop kêu lâu | low | reject — hiếm, tab nền trình duyệt thường tự tắt tiếng/treo audio |
| 6 | Rung bắt đầu trước `draw` | low | patch — dời sau `draw` |
| 7 | Spec chưa hoàn tất | false | đang trong quy trình, hoàn tất ở bước này |
| 8 | Spec 4.3 / epic context vẫn nói 3 file | reject | tài liệu lịch sử đã done; spec này ghi nhận thay đổi |
| 9 | Thiếu test đường không ⭐⭐⭐, rung tải lỗi | low | patch — thêm test |
| 10 | e2e không kiểm loop được dừng | low | reject — unit test đã kiểm dừng |
| 11 | "rung" trùng nghĩa rung máy | low | patch — đổi thành `soi` |
| 12 | Không có master gain, có thể clip khi chồng tiếng | maybe-false | reject — bùm đã tắt dần khi thẻ bật; chỉ low nếu đúng |
| 13 | Tải thêm ~75KB khi bật âm thanh | low | reject — một lần, có cache |

