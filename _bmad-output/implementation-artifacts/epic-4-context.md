# Epic 4 Context: Hồi hộp mở nồi

<!-- Compiled from planning artifacts. Edit freely. Regenerate with compile-epic-context if planning docs change. -->

## Goal

Làm cho khoảnh khắc mở nồi "đã" như mở gacha mà vẫn nhẹ nhàng, vui vẻ: nồi sôi rồi thẻ món bật ra lần lượt (món ⭐⭐⭐ ra cuối), mỗi bậc sao có hiệu ứng hình/âm thanh/rung riêng, đổi một món thì ô đó lật, và tôn trọng chế độ Giảm chuyển động. Không đổi luật nồi hay dữ liệu — chỉ nâng cấp trình diễn của màn Quay và Mâm cơm.

## Stories

- Story 4.1: Mở nồi, thẻ bật ra lần lượt
- Story 4.2: Hiệu ứng riêng theo độ hiếm
- Story 4.3: Âm thanh và rung
- Story 4.4: Giảm chuyển động

## Requirements & Constraints

- Quay: nồi sôi sùng sục (rung nhẹ), nắp nảy, hơi nước bốc lên 1,5–2 giây, không bỏ qua được.
- Mở nồi: nắp bật, thẻ bật lần lượt theo thứ tự engine trả (theo slotTemplate, món ⭐⭐⭐ dời xuống cuối), cách nhau ~0,5 giây, rồi xếp vào mâm giữ nguyên thứ tự đó. Chạm màn hình trong lúc bật → hiện cả mâm ngay. Thông báo aria-live về mâm chỉ phát một lần khi mâm đủ.
- Hiệu ứng theo độ hiếm (khi bật ra và cả khi 🎲 đổi món):
  - ⭐ Thường: thẻ nảy nhẹ + làn hơi nước nhỏ; "bụp" nhẹ; rung nhẹ.
  - ⭐⭐ Ngon: nắp lóe xanh dương trước khi bật; thẻ nảy + vệt sáng xanh quét viền + vài hạt gạo bắn ra; "ting"; rung vừa.
  - ⭐⭐⭐ Đặc biệt: nhá hàng ~0,8 giây (nồi rung mạnh, khe nắp sáng vàng, hơi nước cuộn) — chỉ một lần mỗi mâm dù nhiều món ⭐⭐⭐; tia sáng vàng xoay sau thẻ (độ mờ ≤ 40%), sao ✦ lấp lánh quanh viền, chữ "Đặc biệt!" nảy lên, thẻ bật chậm hơn một nhịp; "ting-ting-tinh"; rung mạnh 2 nhịp. Tối đa ~1,5 giây, chạm để bỏ qua.
  - Hiệu ứng chỉ trong khoảng 24px quanh thẻ, không phủ kín màn hình, không đổi màu nền.
- Đổi một món (🎲): chỉ ô đó lật ~0,6 giây, nồi không rung, rồi hiệu ứng theo bậc của món mới.
- Âm thanh mặc định tắt (công tắc ở Cài đặt, theo máy); tắt thì im lặng hoàn toàn. Mỗi file < 50KB, chỉ tải khi âm thanh đang bật.
- Rung chỉ khi có `navigator.vibrate`; iPhone/không hỗ trợ thì bỏ qua êm, không lỗi.
- Giảm chuyển động (`prefers-reduced-motion: reduce`): bỏ nồi sôi, tia sáng, hạt bay, flip; cả mâm hiện dần (fade) 300ms. Độ hiếm vẫn nhận ra qua màu viền và số sao (không chỉ bằng màu).

## Technical Decisions

- Animation dùng `motion` 13.4.4. Mọi animation đọc giảm chuyển động qua một hook chung (đã có `ui/useReducedMotion`).
- Rung chỉ gọi qua `ui/haptics.ts`. Âm thanh đọc bật/tắt qua `useSoundEnabled` (`ui/preferences.ts`); thư viện/định dạng âm thanh chưa chốt — chọn khi làm (ưu tiên Web Audio/HTMLAudio sẵn có, không thêm phụ thuộc nặng).
- Thứ tự bật thẻ là của engine (engine thuần, không đổi). Trạng thái mâm vẫn trong store zustand của `features/tray`; hiệu ứng không ghi server.
- Màu độ hiếm là token: `rarity-common` #9CC5A1, `rarity-rare` #4F97D6, `rarity-legend` #F2B531; `accent-warm` cho trạng thái đang nấu. Không viết cứng key Bộ trong `features/`/`engine/`; độ hiếm là số 1|2|3.
- Tuỳ chọn theo máy (âm thanh) chỉ ở `localStorage`, không lên server. Chuỗi UI ở `copy.ts`.

## UX & Interaction Patterns

- Mâm là một lớp phủ duy nhất (không chồng modal); focus/Esc/aria như hiện có phải giữ nguyên khi thêm hiệu ứng.
- Tinh thần: gian bếp Việt (nồi đất, hơi nước, hạt gạo), vui mà nhẹ; từ chối mọi thứ rối mắt của gacha.

## Cross-Story Dependencies

- 4.1 dựng chuỗi bật thẻ; 4.2 gắn hiệu ứng từng bậc vào chuỗi đó và vào 🎲; 4.3 gắn âm thanh/rung vào cùng các thời điểm; 4.4 rà toàn bộ nhánh giảm chuyển động (một phần đã có: mâm fade 300ms từ Epic 1).
- Dùng hook âm thanh của Story 3.3; nồi `GachaPot` và `MealTray` từ Epic 1.
