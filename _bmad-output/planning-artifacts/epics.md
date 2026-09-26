---
stepsCompleted: [1, 2, 3, 4]
inputDocuments:
  - _bmad-output/planning-artifacts/architecture/architecture-app-eat-lucky-2026-09-26/ARCHITECTURE-SPINE.md
  - _bmad-output/planning-artifacts/ux-designs/ux-app-eat-lucky-2026-09-26/EXPERIENCE.md
  - _bmad-output/planning-artifacts/ux-designs/ux-app-eat-lucky-2026-09-26/DESIGN.md
---

# app-eat-lucky (Nồi Thần) - Epic Breakdown

## Overview

Tài liệu này chia app-eat-lucky thành epic và story, dựa trên UX (EXPERIENCE.md + DESIGN.md) và Architecture spine. **Không có PRD**, nên FR/NFR được rút ra từ EXPERIENCE.md (IA, Luật Gacha, Component Patterns, State Patterns, Key Flows).

## Requirements Inventory

### Functional Requirements

FR1: Chạm nút "Mở nồi!" để tạo một mâm cơm gồm 3 ô mặc định Mặn · Rau · Canh. Mỗi ô chỉ quay trong nhóm của nó, và trong một mâm không có hai món trùng nhau.
FR2: Độ hiếm tính riêng cho từng ô, 3 bậc với tỉ lệ Thường 60% · Ngon 30% · Đặc biệt 10%. Hệ thống quay ra bậc trước, rồi chọn ngẫu nhiên một món trong bậc và nhóm đó. Nếu bậc vừa trúng không còn món hợp lệ thì chuyển sang bậc gần nhất còn món.
FR3: Chip mùa (Xuân/Hạ/Thu/Đông/Quanh năm) chọn được một mùa, mặc định là mùa hiện tại theo tháng. Chỉ quay trong các món thuộc mùa đang chọn cộng với món "Quanh năm".
FR4: Tránh trùng: món nằm trong mâm đã chốt trong N ngày gần nhất (mặc định 3) không ra lại. Món đang khoá 🔒 không bị ảnh hưởng.
FR5: Khi một nhóm hết món hợp lệ, riêng ô đó hiện "Hết món [nhóm] mùa này rồi 😅" kèm nút Đổi mùa / Thêm món (nhóm được chọn sẵn). Các ô khác hiện bình thường.
FR6: Nút 🎲 "Đổi món này" quay lại riêng một ô, trong cùng nhóm.
FR7: Nút 🔒 "Giữ" bật/tắt trạng thái khoá của một ô.
FR8: Nút ＋ "Thêm món" thêm một ô mới và chọn nhóm cho nó (v1: Mặn/Rau/Canh). Ô thêm vào có nút ✕ để bỏ. 3 ô mặc định không bỏ được.
FR9: Nút "Đổi cả mâm" quay lại mọi ô chưa khoá, không ghi lịch sử, không giới hạn số lần.
FR10: Nút "Chốt mâm!" lưu cả mâm vào Lịch sử kèm ngày giờ. Từng món trong mâm được tính vào cửa sổ tránh trùng.
FR11: Chạm ô món, thẻ món hoặc món trong lịch sử để mở Chi tiết món: ảnh, tên, nhóm, độ hiếm, mùa, nguyên liệu, các bước, ghi chú, và nút Sửa. Món chưa có công thức thì hiện "Chưa có công thức, ghi lại bí kíp nè" kèm nút Sửa.
FR12: Thư viện món hiển thị lưới 2 cột, lọc được theo nhóm và mùa, tìm được theo tên. Tìm không thấy thì hiện "Không thấy món này. Thêm mới luôn?" kèm nút ＋ (tên đã điền sẵn).
FR13: Thêm/Sửa món với các trường: ảnh (Chụp ảnh / Chọn từ thư viện, tự nén và cắt 4:3, có xem trước), tên (bắt buộc), nhóm (bắt buộc), mùa (mặc định Quanh năm), độ hiếm (mặc định Thường), công thức (Nguyên liệu mỗi dòng một mục, Các bước đánh số và thêm/xoá được, Ghi chú tuỳ chọn). Lưu xong hiện toast "Đã lưu vào nồi!" và món mới nằm ở đầu lưới. Rời màn khi chưa lưu thì hỏi "Bỏ thay đổi?".
FR14: Xoá món bằng cách vuốt ở hàng món, luôn có xác nhận. Lịch sử cũ vẫn hiển thị được món đã xoá.
FR15: Lịch sử liệt kê các mâm đã chốt theo ngày, mỗi mâm có ảnh nhỏ và tên các món. Chạm vào một món để mở Chi tiết. Vuốt để xoá cả mâm (có xác nhận). Lịch sử trống thì hiện "Chưa chốt mâm nào. Qua tab Quay mở nồi thử nhé!".
FR16: Màn Cài đặt (icon bánh răng trên màn Quay) gồm: chỉnh số ngày tránh trùng, "Khôi phục món mặc định" (chỉ khôi phục món gốc, không động tới món tự thêm), bật/tắt âm thanh.
FR17: App có sẵn danh sách món dân dã đủ 3 nhóm, đủ 3 bậc, đủ các mùa. Người dùng sửa, xoá, thêm được.
FR18: Lần đầu mở app hiện một dòng gợi ý "Mở thử đi cả nhà!", không có hướng dẫn nhiều bước.
FR19: Tiêu đề màn Quay là "Bộ: Món ăn ▾", chừa sẵn chỗ cho bộ chọn Bộ gacha (v1 chưa bấm được).
FR20: Đăng nhập một lần bằng tài khoản do admin tạo, app nhớ phiên. Không có đăng ký.
FR21: Khi ghi thất bại vì mất mạng hoặc lỗi server (chốt mâm, lưu món, xoá), hiện thông báo thân thiện kèm nút thử lại. Thử lại không tạo bản ghi trùng.

### NonFunctional Requirements

NFR1: Website mobile-first (không phải app, không PWA), chạy tốt trên Safari iOS và Chrome Android. Bố cục một cột, lề 16px. Cần có mạng.
NFR2: Accessibility: vùng chạm ≥ 44pt/48dp, nút Quay cao 64px. Mọi phần tử tương tác có nhãn cho trình đọc màn hình. Có kết quả thì đọc "Mâm cơm: Mặn [tên], [bậc]; Rau …; Canh …". Nút 🔒 báo "Đang giữ"/"Không giữ". Độ hiếm luôn kèm số sao, không chỉ dựa vào màu. Hỗ trợ cỡ chữ động, công thức đọc được ở cỡ chữ lớn nhất.
NFR3: Tôn trọng chế độ Giảm chuyển động (prefers-reduced-motion) ở mọi animation.
NFR4: Bảo mật: mọi dữ liệu nằm sau đăng nhập, phân quyền theo household, chỉ phục vụ qua HTTPS.
NFR5: Độ bền dữ liệu: dữ liệu nằm trong volume Docker, không mất khi dựng lại container. Có backup định kỳ và bản copy ngoài VPS.
NFR6: Giọng văn: xưng "mình", gọi "cả nhà", câu ngắn, tối đa 1 emoji mỗi câu, không viết HOA toàn bộ. Cấm tiền ảo, tích điểm, banner, pop-up quảng bá, đếm ngược, thông báo đẩy, hướng dẫn nhiều bước.
NFR7: Ảnh upload được nén WebP, cạnh dài ≤ 1200px. Lưới dùng thumb 400x300.
NFR8: Dễ mở rộng: thêm một Bộ gacha mới không phải sửa engine hay feature (chỉ thêm `sets/<setKey>/`).
NFR9: Engine gacha có unit test cho phân bố tỉ lệ, tránh trùng và bậc trống, dùng rng có seed cố định.

### Additional Requirements

- **Khởi tạo dự án (Epic 1 Story 1):** spine không chỉ định starter template có tên. Dựng `web/` bằng template chính thức `create-vite` (react-ts), dùng Vite 8.3.1, React 19.3.0, TypeScript 7.0.2, react-router 8.4.0, TanStack Query 5.104.0, zustand 5.0.15, motion 13.4.4, pocketbase SDK 0.28.1, vitest 5.0.2, Playwright 1.63.0. Cấu trúc thư mục theo Structural Seed: `web/src/{app,features,sets,engine,data,ui}`, `server/{pb_migrations,pb_hooks}`, `deploy/`.
- Luật phụ thuộc giữa các lớp (AD graph): `engine` không import gì; import `pocketbase` bên ngoài `data/` bị lint chặn (`no-restricted-imports`) (AD-5).
- Registry Bộ gacha + `SetDefinition` (setKey, groups, slotTemplate, rarityWeights, defaultCooldownDays, facets, attrsSchema, seed, renderer). Bộ `food` là plugin đầu tiên (AD-1).
- Engine gacha thuần, `rng` được tiêm vào, trả luôn thứ tự bật thẻ (món bậc 3 ra cuối) (AD-2).
- PocketBase 0.40.4. Các collection `households`, `items`, `draws`, `set_configs` và auth `users`, tạo bằng JS migration (AD-10). API rule theo household cho cả 5 thao tác (AD-3).
- Hook hoặc migration tạo sẵn household và tài khoản đầu tiên; tắt tự đăng ký (AD-3).
- ID do client sinh theo định dạng PocketBase; `items` xoá mềm; `draws` chỉ create/delete và lưu snapshot `entries` (AD-4).
- Chỉ `data/` gọi PocketBase qua hook TanStack Query; query key tập trung ở `data/keys.ts` (AD-5).
- Website online-only: không manifest, không service worker, không persist cache. Ghi lỗi thì báo `AppError` + thử lại với cùng ID (AD-6).
- Mâm đang mở nằm trong store zustand của `features/tray`; chỉ Chốt mâm mới ghi. `chosenAt` do client ghi; cooldown lấy `set_configs` rồi mới tới mặc định (AD-7).
- Seed có `seedKey` ổn định, unique index `(household, setKey, seedKey)`, khôi phục = upsert. Ảnh seed đặt ở `web/public/seed/` (AD-8).
- Ảnh cắt 4:3 WebP ở client, lưu trong file field với thumb `400x300`. Thứ tự fallback: ảnh upload → ảnh seed → đĩa trống (AD-9).
- Deploy: Dockerfile multi-stage (build web → alpine + PocketBase + pb_public + migrations + hooks), `docker compose` với volume `pb_data`, reverse proxy TLS (Caddy 2.11.4 nếu VPS chưa có), bật backup tích hợp của PocketBase. Front và back cùng một tag (AD-11).
- Môi trường dev: PocketBase chạy local + `vite dev` proxy `/api`.
- Quy ước: collection `snake_case`, field `camelCase`, key ổn định `kebab-case` ASCII, độ hiếm là số 1|2|3, thời gian ISO UTC, lỗi dạng `AppError`, chuỗi UI đặt ở `copy.ts`, rung gọi qua `ui/haptics.ts`.

### UX Design Requirements

UX-DR1: Chuyển token trong frontmatter DESIGN.md (colors, typography, rounded, spacing) thành CSS variables/theme. Nạp font Baloo 2 và Be Vietnam Pro, hiển thị đủ dấu tiếng Việt. Chỉ có một mức đổ bóng mềm.
UX-DR2: Thanh tab dưới cùng 3 tab Quay · Món ăn · Lịch sử, có icon và chữ, tab đang chọn màu `primary`.
UX-DR3: Nút Quay `spin-button`: viên thuốc, nền `primary`, cao 64px, chữ "Mở nồi!" (title), có trạng thái pressed, khoá trong lúc đang quay.
UX-DR4: Minh hoạ nồi đất `gacha-pot` (220px): lúc đứng yên thì "thở" nhẹ; lúc quay thì sôi sùng sục (rung nhẹ), nắp nảy, hơi nước bốc lên trong 1,5–2 giây, không bỏ qua được.
UX-DR5: Thẻ món `dish-card`: ảnh 4:3, tên (display), huy hiệu độ hiếm, chấm mùa, viền 4px theo màu độ hiếm, bo `rounded.lg`.
UX-DR6: Mâm cơm `meal-tray` (nền `tray`) chứa các ô `meal-slot` (cao 96px, thumb 72px, nhãn nhóm, tên, sao, nút tròn 🎲 và 🔒). Ô đang giữ thì nền nhạt đi và 🔒 tô màu `accent-tile`. Nút Đổi cả mâm và Chốt mâm! nằm dưới mâm.
UX-DR7: Component nhỏ: `group-tag` (Mặn/Rau/Canh với màu nhóm), `rarity-badge` (⭐/⭐⭐/⭐⭐⭐ kèm chữ), `season-chip` (cao 36px, có chấm màu mùa, chip đang chọn được tô nền), `button-secondary` (48px), `input` (48px).
UX-DR8: Ảnh món trống: minh hoạ đĩa trống kèm chữ "Thêm ảnh", không bao giờ hiện icon ảnh lỗi.
UX-DR9: Chuỗi mở nồi: nắp bật ra, thẻ bật lần lượt Mặn → Rau → Canh, mỗi thẻ cách nhau khoảng 0,5 giây, món ⭐⭐⭐ ra cuối. Chạm màn hình để bỏ qua. Sau khi mở xong, mâm giữ nguyên thứ tự bật ra.
UX-DR10: Hiệu ứng theo độ hiếm (hình, âm thanh, rung) theo bảng Motion: ⭐ nảy nhẹ + hơi nước + "bụp"; ⭐⭐ nắp lóe xanh + vệt sáng + hạt gạo + "ting"; ⭐⭐⭐ nhá hàng 0,8 giây (chỉ chạy 1 lần mỗi mâm) + tia sáng vàng xoay (độ mờ ≤ 40%) + sao ✦ + chữ "Đặc biệt!" + "ting-ting-tinh" + rung 2 nhịp. Hiệu ứng chỉ trong khoảng 24px quanh thẻ, ⭐⭐⭐ tối đa khoảng 1,5 giây, chạm để bỏ qua. Áp dụng cả khi 🎲 đổi món.
UX-DR11: Đổi một món: chỉ ô đó lật (flip) khoảng 0,6 giây, nồi không rung.
UX-DR12: Giảm chuyển động: bỏ hiệu ứng nồi sôi, tia sáng, hạt bay; cả mâm hiện dần (fade) trong 300ms. Độ hiếm vẫn nhận ra qua màu viền và số sao.
UX-DR13: Rung (haptic) chỉ có trên máy hỗ trợ (`navigator.vibrate`), còn iPhone thì bỏ qua êm, không báo lỗi.
UX-DR14: Âm thanh mặc định tắt, bật được trong Cài đặt.
UX-DR15: Trạng thái: lần đầu mở, nhóm hết món, món chưa có ảnh, chưa có công thức, lịch sử trống, tìm không thấy, ảnh lỗi ("Ảnh này khó chịu quá, thử tấm khác nhé"), rời màn chưa lưu ("Bỏ thay đổi?"). Chữ đúng như bảng State Patterns.
UX-DR16: Toast "Đã lưu vào nồi!" dùng màu `accent-warm`.
UX-DR17: Vuốt để xoá (hàng món, hàng lịch sử) luôn có xác nhận, nút xoá màu `danger`.
UX-DR18: Chỉ mở chồng một lớp modal, không bao giờ hai lớp.
UX-DR19: Khi có kết quả, thông báo cho trình đọc màn hình qua aria-live.
UX-DR20: Bộ chọn ảnh: Chụp ảnh / Chọn từ thư viện, cắt 4:3, có xem trước trước khi lưu.
UX-DR21: Trình soạn công thức: danh sách Nguyên liệu (mỗi dòng một mục), Các bước đánh số (thêm/xoá bước), Ghi chú tuỳ chọn.
UX-DR22: Nền màn Quay có hoạ tiết gạch bông mờ (`accent-tile`). Mỗi màn chỉ có một hành động chính màu `primary`.

### FR Coverage Map

FR1: Epic 1 - Mở nồi ra mâm 3 ô
FR2: Epic 1 - Độ hiếm từng ô, bậc trống
FR3: Epic 1 - Chip mùa, mặc định theo tháng
FR4: Epic 1 - Tránh trùng N ngày
FR5: Epic 1 - Ô hết món (Đổi mùa; nút Thêm món nối sang form ở Epic 2)
FR6: Epic 1 - 🎲 Đổi món này
FR7: Epic 1 - 🔒 Giữ
FR8: Epic 1 - ＋ Thêm ô / ✕ bỏ ô
FR9: Epic 1 - Đổi cả mâm
FR10: Epic 1 - Chốt mâm
FR11: Epic 1 - Chi tiết món (xem); Epic 2 - nút Sửa, trạng thái chưa có công thức
FR12: Epic 2 - Thư viện, lọc, tìm
FR13: Epic 2 - Thêm/Sửa món, ảnh, công thức
FR14: Epic 2 - Xoá món (xoá mềm)
FR15: Epic 3 - Lịch sử
FR16: Epic 3 - Cài đặt (số ngày, khôi phục món mặc định, âm thanh)
FR17: Epic 1 - Seed món mặc định
FR18: Epic 1 - Gợi ý lần đầu mở
FR19: Epic 1 - "Bộ: Món ăn ▾" (registry Bộ)
FR20: Epic 1 - Đăng nhập một lần
FR21: Epic 1 - Ghi lỗi báo thân thiện + thử lại không trùng (story 1.8)

## Epic List

### Epic 1: Mở nồi ra mâm cơm
Cả nhà mở website trên điện thoại (đã deploy lên VPS), đăng nhập một lần rồi mở nồi ra mâm 1 mặn 1 rau 1 canh từ món mặc định. Trong mâm có thể đổi từng món, giữ món, thêm ô, đổi cả mâm, xem công thức và Chốt mâm để tránh trùng. Hiệu ứng mở nồi ở mức cơ bản.
**FRs covered:** FR1–FR10, FR11 (xem), FR17, FR18, FR19, FR20, FR21
**Nền tảng kiến trúc:** dựng dự án, registry Bộ + bộ `food`, engine thuần, schema + API rule PocketBase, lớp `data/`, Docker deploy (AD-1…AD-8, AD-10, AD-11)

### Epic 2: Sổ món của nhà
Xem thư viện món, lọc theo nhóm và mùa, tìm theo tên. Thêm món ruột kèm ảnh chụp và công thức, sửa hoặc xoá món. Món mới được đưa vào vòng quay ngay.
**FRs covered:** FR11 (Sửa, chưa có công thức), FR12, FR13, FR14
**Ghi chú:** AD-4 (xoá mềm), AD-9 (ảnh). Nút "Thêm món" ở ô hết món của Epic 1 được nối sang form này.

### Epic 3: Lịch sử & Cài đặt
Xem lại các mâm đã chốt theo ngày, xoá mâm. Chỉnh số ngày tránh trùng, khôi phục món mặc định, bật/tắt âm thanh.
**FRs covered:** FR15, FR16

### Epic 4: Hồi hộp mở nồi
Làm cho khoảnh khắc mở nồi "đã" hơn: thẻ bật lần lượt, món ⭐⭐⭐ ra cuối, hiệu ứng riêng cho từng bậc sao, flip khi đổi món, âm thanh, rung (Android), chế độ giảm chuyển động.
**FRs covered:** (nâng cấp FR1, FR6) · UX-DR9–UX-DR14

## Epic 1: Mở nồi ra mâm cơm

Cả nhà mở website trên điện thoại (đã deploy lên VPS), đăng nhập một lần rồi mở nồi ra mâm 1 mặn 1 rau 1 canh từ món mặc định. Trong mâm có thể đổi từng món, giữ món, thêm ô, đổi cả mâm, xem công thức và Chốt mâm để tránh trùng.

### Story 1.1: Khung website mobile-first

As a chủ app,
I want mở website trên điện thoại, thấy đúng màu và font của Nồi Thần cùng 3 tab,
So that có khung sẵn để các tính năng gắn vào.

**Acceptance Criteria:**

**Given** repo trống
**When** dựng `web/` bằng `create-vite` (template react-ts) với đúng phiên bản ghi trong spine
**Then** có cấu trúc `web/src/{app,features,sets,engine,data,ui}`, `server/{pb_migrations,pb_hooks}`, `deploy/`
**And** ESLint có rule `no-restricted-imports` chặn import `pocketbase` bên ngoài `web/src/data/` (AD-5), đồng thời chặn `engine/` import bất kỳ lớp nào khác

**Given** app chạy `vite dev`
**When** mở trên điện thoại
**Then** token của DESIGN.md (colors, typography, rounded, spacing, một mức bóng) có dạng CSS variables, font Baloo 2 và Be Vietnam Pro hiển thị đủ dấu tiếng Việt (UX-DR1)
**And** thanh tab dưới cùng có Quay · Món ăn · Lịch sử, tab đang chọn màu `primary`, mỗi tab ≥ 48dp và có nhãn cho trình đọc màn hình (UX-DR2, NFR2)

**Given** bản build production
**When** mở trên Chrome Android và Safari iOS
**Then** hiển thị đúng một cột, lề 16px, có `<title>`, favicon và `theme-color` là `surface-base`. Không có manifest hay service worker (NFR1, AD-6)
**And** `vitest` chạy được với ít nhất một test mẫu

### Story 1.2: Luật nồi (engine gacha) và Bộ "Món ăn"

As a chủ app,
I want nồi quay đúng luật của nhà (nhóm, mùa, độ hiếm, tránh trùng, bậc trống),
So that kết quả công bằng và giống hệt nhau ở mọi màn.

**Acceptance Criteria:**

**Given** `web/src/engine/` không import gì trong dự án
**When** gọi hàm quay mâm với `(set, items, recentDraws, lockedSlots, filters, now, rng)`
**Then** mỗi ô chỉ nhận món thuộc `groupKey` của ô, món có tag bằng mùa đang chọn hoặc `quanh-nam`, món `deleted=false`, món không nằm trong draw có `chosenAt` thuộc N ngày lịch gần nhất, và không trùng món khác trong mâm (FR1, FR3, FR4, AD-2)
**And** ô đang khoá giữ nguyên món, không qua bộ lọc

**Given** `rarityWeights` `{1:60, 2:30, 3:10}` và rng có seed cố định
**When** quay 10.000 lần trên tập món đủ bậc
**Then** tỉ lệ mỗi bậc nằm trong ±2% so với trọng số (FR2, NFR9)
**And** khi bậc trúng không còn món thì chuyển sang bậc gần nhất còn món (hoà thì lấy bậc thấp hơn), còn hết sạch món thì ô trả `empty` (FR5)

**Given** kết quả một mâm
**When** engine trả về
**Then** kèm thứ tự bật thẻ: theo `slotTemplate` (Mặn → Rau → Canh), món bậc 3 dời xuống cuối (AD-2)

**Given** `web/src/sets/registry.ts`
**When** đăng ký Bộ `food`
**Then** `SetDefinition` có `setKey: 'food'`, groups `man/rau/canh` kèm nhãn và màu, `slotTemplate` 3 ô không bỏ được, `rarityWeights`, `defaultCooldownDays: 3`, facet mùa `xuan/ha/thu/dong/quanh-nam` với hàm mùa mặc định theo tháng (Xuân 2–4, Hạ 5–7, Thu 8–10, Đông 11–1), `attrsSchema` `{ingredients, steps, note?}`, và seed ≥ 30 món dân dã có `seedKey`, đủ 3 nhóm × 3 bậc × các mùa (AD-1, AD-8, FR17)
**And** trong `engine/` và `features/` không có chuỗi `'man'`, `'rau'`, `'canh'` hay giá trị mùa viết cứng

### Story 1.3: Đăng nhập một lần

As a chủ app,
I want đăng nhập một lần bằng tài khoản của nhà rồi app nhớ luôn,
So that dữ liệu trên VPS không ai khác xem được.

**Acceptance Criteria:**

**Given** PocketBase 0.40.4 chạy local cho dev (`vite dev` proxy `/api`)
**When** chạy các migration trong `server/pb_migrations/`
**Then** có collection `households` (name, members → users) và auth `users` đã tắt tự đăng ký. Một migration hoặc hook tạo household đầu tiên và tài khoản chủ app từ biến môi trường (AD-3, AD-10)
**And** API rule của `households` chỉ cho thành viên xem

**Given** chưa đăng nhập
**When** mở app
**Then** hiện màn đăng nhập gọn (email + mật khẩu, lời văn theo giọng Nồi Thần), sai thông tin thì báo lỗi thân thiện dạng `AppError` (FR20, NFR6)
**And** đăng nhập xong thì vào màn Quay, đóng/mở lại app vẫn còn phiên, token được làm mới tự động

**Given** code feature
**When** cần dữ liệu
**Then** chỉ đi qua `web/src/data/` (pb client, `keys.ts`, hook TanStack Query), bao gồm `useCurrentHousehold()` (AD-5)

### Story 1.4: Nồi có sẵn món mặc định

As a chủ app,
I want mở app lần đầu là nồi đã có sẵn món dân dã,
So that mở nồi được ngay mà không phải nhập gì.

**Acceptance Criteria:**

**Given** migration tạo collection `items` (household, setKey, groupKey, name, rarity 1–3, tags JSON, image file, attrs JSON, seedKey, deleted), unique index `(household, setKey, seedKey)`, API rule 5 thao tác theo household (AD-3, AD-4, AD-8)
**When** household chưa có món nào của Bộ `food`
**Then** client nạp seed của Bộ vào `items` bằng ID do client sinh (15 ký tự `[a-z0-9]`), không tạo trùng khi hai máy nạp cùng lúc (unique index + coi lỗi trùng là thành công)
**And** `useItems(setKey)` trả món `deleted=false` của household

**Given** món seed chưa có ảnh upload
**When** hiển thị
**Then** dùng ảnh tĩnh `web/public/seed/<seedKey>.webp` nếu có, không thì hiện minh hoạ đĩa trống kèm "Thêm ảnh" (AD-8, AD-9, UX-DR8)

### Story 1.5: Mở nồi ra mâm cơm

As a chủ app,
I want chạm "Mở nồi!" để nồi dọn ra một mâm 1 mặn 1 rau 1 canh,
So that khỏi phải nghĩ hôm nay ăn gì.

**Acceptance Criteria:**

**Given** màn Quay
**When** mở app
**Then** tiêu đề là "Bộ: Món ăn ▾" (hiển thị, chưa bấm được, lấy từ registry), có chip mùa (UX-DR7) với mùa hiện tại được chọn sẵn, nồi đất 220px "thở" nhẹ, nút "Mở nồi!" cao 64px màu `primary` ở vùng ngón cái, nền có hoạ tiết gạch bông mờ (FR3, FR19, UX-DR3, UX-DR4, UX-DR22)
**And** lần đầu mở (chưa có draw nào) thì hiện dòng "Mở thử đi cả nhà!" (FR18)

**Given** chạm "Mở nồi!"
**When** nồi đang quay (sôi sùng sục cơ bản khoảng 1,5 giây)
**Then** nút bị khoá, chạm tiếp không có tác dụng
**And** xong thì mở lớp phủ Mâm cơm (`meal-tray`) với 3 ô `meal-slot` theo thứ tự engine trả về, mỗi ô có nhãn nhóm, ảnh nhỏ, tên, huy hiệu sao và viền màu độ hiếm (FR1, FR2, UX-DR6)

**Given** một nhóm hết món hợp lệ
**When** mâm được dọn
**Then** riêng ô đó hiện "Hết món [nhóm] mùa này rồi 😅" kèm nút "Đổi mùa" (mở chip mùa để chọn lại), các ô khác vẫn hiện bình thường (FR5)

**Given** có kết quả
**When** mâm hiện ra
**Then** thông báo qua aria-live: "Mâm cơm: Mặn [tên], [bậc]; Rau [tên], [bậc]; Canh [tên], [bậc]" (UX-DR19, NFR2)
**And** trạng thái mâm nằm trong store zustand của `features/tray`, không gọi ghi lên server (AD-7)

### Story 1.6: Chỉnh mâm: đổi món, giữ món, thêm ô, đổi cả mâm

As a chủ app,
I want giữ món ưng, đổi món chưa ưng, thêm món phụ,
So that mâm vừa ý cả nhà trước khi chốt.

**Acceptance Criteria:**

**Given** mâm đang mở
**When** chạm 🔒 ở một ô
**Then** ô chuyển sang trạng thái giữ (nền nhạt, 🔒 màu `accent-tile`), trình đọc màn hình báo "Đang giữ", chạm lại thì mở khoá và báo "Không giữ" (FR7, UX-DR6)

**Given** một ô chưa khoá
**When** chạm 🎲 "Đổi món này"
**Then** chỉ ô đó được quay lại trong cùng nhóm, không trùng các món khác trong mâm (FR6)

**Given** mâm đang mở
**When** chạm "Đổi cả mâm"
**Then** mọi ô chưa khoá được quay lại, ô đã khoá giữ nguyên, không ghi lịch sử, không giới hạn số lần (FR9)

**Given** mâm đang mở
**When** chạm ＋ "Thêm món" rồi chọn nhóm (Mặn/Rau/Canh lấy từ SetDefinition)
**Then** thêm một ô mới đã quay sẵn trong nhóm đó, có nút ✕ để bỏ. 3 ô mặc định không có ✕ (FR8)
**And** mọi nút có vùng chạm ≥ 44pt và có nhãn cho trình đọc màn hình (NFR2)

### Story 1.7: Xem chi tiết món và công thức

As a chủ app,
I want chạm vào một món trong mâm để xem ảnh, nguyên liệu và các bước nấu,
So that biết nhà có đủ đồ để nấu không.

**Acceptance Criteria:**

**Given** mâm đang mở
**When** chạm vào vùng thông tin của một ô
**Then** mở Chi tiết món: ảnh 4:3 (theo fallback của AD-9), tên, nhãn nhóm, huy hiệu độ hiếm, mùa, danh sách Nguyên liệu, Các bước đánh số, Ghi chú (FR11)
**And** chữ công thức vẫn đọc được ở cỡ chữ lớn nhất của hệ thống (NFR2)

**Given** Chi tiết món mở từ mâm
**When** đóng lại
**Then** quay về đúng mâm như cũ (khoá và thứ tự không đổi)
**And** không bao giờ có hai lớp modal chồng nhau (UX-DR18)

### Story 1.8: Chốt mâm và tránh trùng

As a chủ app,
I want chốt mâm để lưu lại bữa hôm nay,
So that mấy ngày tới nồi không ra lại đúng mấy món đó.

**Acceptance Criteria:**

**Given** migration tạo collection `draws` (household, setKey, chosenAt, entries JSON), API rule theo household, không có thao tác update (AD-3, AD-4)
**When** chạm "Chốt mâm!"
**Then** gọi đúng một mutation tạo draw với ID do client sinh, `chosenAt` là ISO UTC, `entries` là snapshot `[{itemId, groupKey, name, rarity, order}]` theo thứ tự trên mâm (FR10, AD-7)
**And** lớp phủ đóng lại, có phản hồi ngắn đúng giọng Nồi Thần, và mâm trong store được xoá

**Given** đã chốt mâm có món X hôm nay
**When** quay lại trong vòng `defaultCooldownDays` (3) ngày lịch
**Then** X không ra ở bất kỳ ô nào, trừ khi đang được khoá 🔒 (FR4)
**And** `useRecentDraws` chỉ lấy draw trong cửa sổ, và được invalidate sau khi chốt

**Given** mất mạng hoặc server lỗi khi chạm "Chốt mâm!"
**When** mutation thất bại
**Then** mâm vẫn giữ nguyên, hiện thông báo thân thiện kèm nút "Thử lại" (FR21, AD-6)
**And** thử lại dùng đúng ID cũ; nếu server báo trùng ID thì coi là đã chốt thành công, không tạo hai draw

### Story 1.9: Deploy website Nồi Thần lên VPS

As a chủ app,
I want chạy app trên VPS của nhà bằng Docker,
So that cả nhà mở được trên điện thoại ở bất cứ đâu.

**Acceptance Criteria:**

**Given** `deploy/Dockerfile` multi-stage
**When** build
**Then** ra một image alpine chứa binary PocketBase 0.40.4, `pb_public` (website đã build), `pb_migrations`, `pb_hooks`. Front và back cùng một tag (AD-11)

**Given** `deploy/compose.yml` và `deploy/Caddyfile`
**When** chạy `docker compose up -d` trên VPS
**Then** app phục vụ qua HTTPS trên domain cấu hình bằng biến môi trường, dữ liệu nằm trong volume `pb_data`, dựng lại container không mất dữ liệu (NFR4, NFR5)
**And** migration tự chạy khi khởi động, tài khoản admin và tài khoản chủ app lấy từ biến môi trường (không commit secret)

**Given** PocketBase đang chạy
**When** cấu hình xong
**Then** backup định kỳ tích hợp được bật, và README có hướng dẫn copy backup ra ngoài VPS và cách deploy bản mới (NFR5)

## Epic 2: Sổ món của nhà

Xem thư viện món, lọc theo nhóm và mùa, tìm theo tên. Thêm món ruột kèm ảnh chụp và công thức, sửa hoặc xoá món. Món mới được đưa vào vòng quay ngay.

### Story 2.1: Thư viện món

As a chủ app,
I want xem tất cả món của nhà dạng lưới, lọc và tìm được,
So that nhanh chóng tìm lại một món.

**Acceptance Criteria:**

**Given** tab "Món ăn"
**When** mở
**Then** hiện lưới 2 cột các thẻ món (`dish-card`: ảnh thumb 400x300 theo fallback AD-9, tên, nhãn nhóm, huy hiệu sao, chấm mùa, viền màu độ hiếm), chỉ gồm món `deleted=false` của Bộ đang chọn (FR12, UX-DR5, UX-DR7)
**And** mới thêm/sửa gần nhất nằm đầu lưới

**Given** thư viện đang mở
**When** chọn chip nhóm (Tất cả/Mặn/Rau/Canh) và chip mùa (dùng chung component với màn Quay, có thêm "Tất cả")
**Then** lưới chỉ còn món khớp cả hai bộ lọc; nhóm và mùa đọc từ SetDefinition (AD-1)

**Given** ô tìm kiếm
**When** gõ tên (không phân biệt hoa thường và dấu, "ca kho" khớp "Cá kho tộ")
**Then** lưới lọc theo tên ngay khi gõ
**And** không có kết quả thì hiện "Không thấy món này. Thêm mới luôn?" (UX-DR15)

**Given** một thẻ món
**When** chạm
**Then** mở Chi tiết món (dùng lại màn của Story 1.7)

### Story 2.2: Thêm món mới kèm công thức

As a chủ app,
I want thêm món ruột của nhà với nhóm, mùa, độ hiếm và công thức,
So that món đó được vào nồi.

**Acceptance Criteria:**

**Given** thư viện
**When** chạm nút ＋
**Then** mở form Thêm món: tên, nhóm (bắt buộc), mùa (mặc định Quanh năm), độ hiếm (mặc định Thường), trình soạn công thức gồm Nguyên liệu (mỗi dòng một mục, thêm/xoá dòng), Các bước (đánh số tự động, thêm/xoá bước), Ghi chú tuỳ chọn (FR13, UX-DR21)
**And** ô ảnh hiện minh hoạ đĩa trống "Thêm ảnh" (chức năng ảnh làm ở Story 2.3)

**Given** thiếu tên hoặc nhóm
**When** chạm Lưu
**Then** không lưu, báo ngay tại trường thiếu với giọng thân thiện

**Given** form hợp lệ
**When** chạm Lưu
**Then** tạo `items` với ID do client sinh, `attrs` được kiểm theo `attrsSchema`, `seedKey` rỗng; hiện toast "Đã lưu vào nồi!" màu `accent-warm`; thẻ món mới nằm đầu lưới (UX-DR16, AD-4)
**And** lần quay kế tiếp món này đã có thể ra; lưu lỗi thì báo thân thiện và cho thử lại (FR21)

**Given** form có thay đổi chưa lưu
**When** rời màn
**Then** hỏi "Bỏ thay đổi?" (UX-DR15)

**Given** tìm không thấy ở thư viện (Story 2.1)
**When** chạm "Thêm mới luôn?"
**Then** mở form với tên đã điền sẵn

**Given** ô "Hết món [nhóm] mùa này rồi 😅" trên mâm
**When** hiện
**Then** có thêm nút "Thêm món", mở form với nhóm và mùa đang chọn điền sẵn (FR5)

### Story 2.3: Ảnh món

As a chủ app,
I want chụp hoặc chọn ảnh món ăn của nhà,
So that nồi dọn ra mâm bằng ảnh thật.

**Acceptance Criteria:**

**Given** form Thêm/Sửa món
**When** chạm ô ảnh
**Then** chọn được "Chụp ảnh" (camera) hoặc "Chọn từ thư viện" (UX-DR20)

**Given** đã chọn một ảnh
**When** xử lý
**Then** ảnh được cắt 4:3, nén WebP cạnh dài ≤ 1200px ngay trên trình duyệt, có xem trước trước khi lưu (AD-9, NFR7)
**And** lưu thì upload vào file field `items.image`, collection có khai báo thumb `400x300`; lưới và mâm dùng thumb, chi tiết dùng ảnh gốc

**Given** ảnh lỗi hoặc không đọc được
**When** xử lý
**Then** báo "Ảnh này khó chịu quá, thử tấm khác nhé", form giữ nguyên dữ liệu (UX-DR15)

**Given** món đã có ảnh
**When** sửa và chọn ảnh khác hoặc bỏ ảnh
**Then** ảnh cũ được thay hoặc xoá, hiển thị quay về đúng fallback (ảnh seed → đĩa trống)

### Story 2.4: Sửa món

As a chủ app,
I want sửa lại tên, nhóm, mùa, độ hiếm, công thức của một món,
So that sổ món đúng với cách nhà mình nấu.

**Acceptance Criteria:**

**Given** Chi tiết món
**When** chạm nút Sửa
**Then** mở form (cùng form với Story 2.2) đã điền sẵn dữ liệu, lưu thì update món, hiện "Đã lưu vào nồi!" (FR11, FR13)
**And** món seed khi sửa vẫn giữ nguyên `seedKey`

**Given** món chưa có nguyên liệu và các bước
**When** mở Chi tiết
**Then** hiện "Chưa có công thức, ghi lại bí kíp nè" kèm nút Sửa (FR11, UX-DR15)

**Given** món vừa sửa đang nằm trong mâm hiện tại
**When** quay lại mâm
**Then** ô hiển thị tên/ảnh/độ hiếm mới (dữ liệu được invalidate qua `data/keys.ts`, AD-5)

### Story 2.5: Xoá món

As a chủ app,
I want xoá món nhà không nấu nữa,
So that nồi không dọn ra món đó.

**Acceptance Criteria:**

**Given** thư viện dạng lưới
**When** vuốt thẻ/hàng món (hoặc chạm "Xoá" trong Chi tiết)
**Then** hiện xác nhận với nút màu `danger`; đồng ý thì đặt `deleted=true`, không xoá hẳn (FR14, UX-DR17, AD-4)
**And** món biến mất khỏi thư viện và vòng quay

**Given** món đã xoá từng nằm trong mâm đã chốt
**When** xem lại draw đó
**Then** vẫn hiện tên và độ hiếm từ snapshot `entries`, ảnh vẫn tải được

## Epic 3: Lịch sử & Cài đặt

Xem lại các mâm đã chốt theo ngày, xoá mâm. Chỉnh số ngày tránh trùng, khôi phục món mặc định, bật/tắt âm thanh.

### Story 3.1: Lịch sử mâm đã chốt

As a chủ app,
I want xem lại các mâm đã chốt theo ngày,
So that lên kế hoạch đi chợ và thấy cả tuần ăn gì.

**Acceptance Criteria:**

**Given** tab "Lịch sử"
**When** mở
**Then** danh sách draw của household, mới nhất trước, mỗi hàng có ngày giờ (`meta`, giờ máy), các ảnh nhỏ xếp cạnh nhau theo `order`, và tên các món (FR15)
**And** tải thêm khi cuộn (phân trang), không tải hết một lần

**Given** một món trong hàng lịch sử
**When** chạm
**Then** mở Chi tiết món; nếu món đã bị xoá thì vẫn mở được với dữ liệu hiện có (xoá mềm), tên/độ hiếm lấy snapshot

**Given** chưa có draw nào
**When** mở tab
**Then** hiện "Chưa chốt mâm nào. Qua tab Quay mở nồi thử nhé!" (UX-DR15)

### Story 3.2: Xoá mâm trong lịch sử

As a chủ app,
I want xoá một mâm chốt nhầm,
So that các món trong đó được quay lại ngay.

**Acceptance Criteria:**

**Given** một hàng lịch sử
**When** vuốt để xoá
**Then** hiện xác nhận với nút màu `danger`; đồng ý thì xoá hẳn draw (draw chỉ create/delete, AD-4) (FR15, UX-DR17)
**And** `useRecentDraws` được invalidate, các món trong mâm đó không còn bị tránh trùng

### Story 3.3: Cài đặt: số ngày tránh trùng và âm thanh

As a chủ app,
I want chỉnh số ngày tránh trùng và bật/tắt âm thanh,
So that nồi hợp với nhịp ăn của nhà.

**Acceptance Criteria:**

**Given** icon bánh răng trên màn Quay
**When** chạm
**Then** mở màn Cài đặt (FR16)

**Given** migration tạo `set_configs` (household, setKey, cooldownDays; unique `(household, setKey)`; API rule theo household) (AD-3, AD-10)
**When** chỉnh số ngày tránh trùng (0–30)
**Then** upsert `set_configs` của Bộ hiện tại; engine dùng giá trị này thay cho `defaultCooldownDays` ngay ở lần quay kế tiếp (AD-7)

**Given** công tắc Âm thanh (mặc định tắt)
**When** bật/tắt
**Then** lưu vào `localStorage` của máy (tuỳ chọn theo máy, AD-3), đọc qua một hook chung mà Epic 4 sẽ dùng (UX-DR14)

### Story 3.4: Khôi phục món mặc định

As a chủ app,
I want khôi phục các món gốc lỡ sửa hỏng hoặc xoá,
So that nồi lại đủ món dân dã như ban đầu.

**Acceptance Criteria:**

**Given** màn Cài đặt
**When** chạm "Khôi phục món mặc định" và xác nhận
**Then** với mỗi món trong seed của Bộ: upsert theo `(household, setKey, seedKey)`, đưa về nội dung seed và `deleted=false` (FR16, AD-8)
**And** món tự thêm (`seedKey` rỗng) không bị thay đổi; ảnh đã upload cho món seed bị bỏ, quay về ảnh seed

**Given** khôi phục xong
**When** mở thư viện
**Then** thấy đủ món gốc, có toast xác nhận đúng giọng Nồi Thần

## Epic 4: Hồi hộp mở nồi

Làm cho khoảnh khắc mở nồi "đã" hơn: thẻ bật lần lượt, món ⭐⭐⭐ ra cuối, hiệu ứng riêng cho từng bậc sao, flip khi đổi món, âm thanh, rung (Android), chế độ giảm chuyển động.

### Story 4.1: Mở nồi, thẻ bật ra lần lượt

As a chủ app,
I want nồi sôi sùng sục rồi từng món bật ra một,
So that có cảm giác hồi hộp như mở gacha.

**Acceptance Criteria:**

**Given** chạm "Mở nồi!"
**When** nồi quay
**Then** nồi sôi sùng sục (rung nhẹ), nắp nảy, hơi nước bốc lên trong 1,5–2 giây, không bỏ qua được (UX-DR4)

**Given** quay xong
**When** mở nồi
**Then** nắp bật ra, thẻ bật ra lần lượt theo thứ tự engine trả về (Mặn → Rau → Canh, món ⭐⭐⭐ cuối), cách nhau khoảng 0,5 giây, rồi xếp vào mâm giữ nguyên thứ tự đó (UX-DR9)
**And** chạm màn hình trong lúc bật thì hiện cả mâm ngay; thông báo aria-live chỉ phát một lần khi mâm đủ

**Given** animation
**When** cài đặt
**Then** dùng `motion` 13.4.4, không phủ kín màn hình, không đổi màu nền

### Story 4.2: Hiệu ứng riêng theo độ hiếm

As a chủ app,
I want mỗi bậc sao có hiệu ứng riêng,
So that ra món Đặc biệt thấy "đã".

**Acceptance Criteria:**

**Given** một thẻ bật ra
**When** bậc là ⭐ / ⭐⭐ / ⭐⭐⭐
**Then** ⭐: thẻ nảy nhẹ + làn hơi nước nhỏ; ⭐⭐: nắp lóe xanh dương trước khi bật, vệt sáng xanh quét viền, vài hạt gạo bắn ra; ⭐⭐⭐: nhá hàng 0,8 giây (nồi rung mạnh, khe nắp sáng vàng, hơi nước cuộn), tia sáng vàng xoay (độ mờ ≤ 40%), sao ✦ lấp lánh, chữ "Đặc biệt!" nảy lên, thẻ bật chậm hơn một nhịp (UX-DR10)
**And** hiệu ứng nằm trong khoảng 24px quanh thẻ; ⭐⭐⭐ tối đa khoảng 1,5 giây, chạm để bỏ qua; nhiều món ⭐⭐⭐ thì nhá hàng chỉ một lần

**Given** chạm 🎲 "Đổi món này"
**When** ô được quay lại
**Then** chỉ ô đó lật (flip) khoảng 0,6 giây, nồi không rung, rồi chạy hiệu ứng theo bậc của món mới (UX-DR11)

### Story 4.3: Âm thanh và rung

As a chủ app,
I want nghe "bụp", "ting" và cảm nhận rung khi thẻ bật,
So that khoảnh khắc mở nồi sống động hơn.

**Acceptance Criteria:**

**Given** âm thanh đang bật trong Cài đặt (Story 3.3)
**When** thẻ bật ra
**Then** ⭐ phát "bụp" nhẹ, ⭐⭐ "ting", ⭐⭐⭐ "ting-ting-tinh"; âm thanh tắt thì im lặng hoàn toàn (UX-DR14)
**And** file âm thanh nhỏ (< 50KB mỗi file), tải lười khi bật âm thanh

**Given** máy có `navigator.vibrate` (Android)
**When** thẻ bật ra
**Then** rung nhẹ cho ⭐, rung vừa cho ⭐⭐, rung mạnh 2 nhịp cho ⭐⭐⭐, gọi qua `ui/haptics.ts` (UX-DR13)
**And** iPhone (không có API) thì bỏ qua êm, không lỗi

### Story 4.4: Giảm chuyển động

As a người nhạy cảm với chuyển động,
I want app tôn trọng chế độ Giảm chuyển động của máy,
So that dùng thoải mái.

**Acceptance Criteria:**

**Given** hệ thống bật Reduce Motion (`prefers-reduced-motion: reduce`)
**When** mở nồi, đổi món
**Then** bỏ hiệu ứng nồi sôi, tia sáng, hạt bay, flip; cả mâm hiện dần (fade) trong 300ms (UX-DR12, NFR3)
**And** độ hiếm vẫn nhận ra qua màu viền và số sao; mọi animation đọc qua một hook chung
