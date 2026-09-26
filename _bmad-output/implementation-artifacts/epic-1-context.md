# Epic 1 Context: Mở nồi ra mâm cơm

<!-- Compiled from planning artifacts. Edit freely. Regenerate with compile-epic-context if planning docs change. -->

## Goal

Cả nhà mở website Nồi Thần trên điện thoại (đã deploy lên VPS), đăng nhập một lần rồi mở nồi ra mâm 1 mặn · 1 rau · 1 canh từ món mặc định. Trong mâm có thể đổi từng món, giữ món, thêm ô, đổi cả mâm, xem công thức và Chốt mâm để tránh trùng. Epic này cũng dựng toàn bộ nền tảng kiến trúc (dự án, registry Bộ gacha + Bộ `food`, engine thuần, schema PocketBase, lớp `data/`, Docker deploy) mà các epic sau gắn vào. Hiệu ứng mở nồi chỉ ở mức cơ bản (bản đầy đủ ở Epic 4).

## Stories

- Story 1.1: Khung website mobile-first
- Story 1.2: Luật nồi (engine gacha) và Bộ "Món ăn"
- Story 1.3: Đăng nhập một lần
- Story 1.4: Nồi có sẵn món mặc định
- Story 1.5: Mở nồi ra mâm cơm
- Story 1.6: Chỉnh mâm: đổi món, giữ món, thêm ô, đổi cả mâm
- Story 1.7: Xem chi tiết món và công thức
- Story 1.8: Chốt mâm và tránh trùng
- Story 1.9: Deploy website Nồi Thần lên VPS

## Requirements & Constraints

- Website mobile-first (không phải app, **không PWA**): chạy tốt trên Safari iOS và Chrome Android, một cột, lề 16px, cần mạng. Không manifest, không service worker, không persist query cache.
- Mâm mặc định 3 ô Mặn · Rau · Canh; mỗi ô quay trong nhóm của nó, không trùng món trong mâm. Độ hiếm từng ô: Thường 60 · Ngon 30 · Đặc biệt 10; bậc trống thì chuyển bậc gần nhất còn món (hoà lấy bậc thấp). Lọc theo mùa đang chọn + "Quanh năm", mặc định mùa theo tháng (Xuân 2–4, Hạ 5–7, Thu 8–10, Đông 11–1). Tránh trùng N ngày lịch (mặc định 3), món khoá 🔒 không bị ảnh hưởng. Nhóm hết món → riêng ô đó hiện trạng thái trống.
- Đổi món / Đổi cả mâm / Thêm ô không ghi server; chỉ "Chốt mâm!" ghi một draw.
- Ghi thất bại → thông báo thân thiện + thử lại không tạo trùng.
- Accessibility: vùng chạm ≥ 44pt/48dp, nút Quay 64px, mọi phần tử tương tác có nhãn; kết quả đọc qua aria-live; 🔒 báo "Đang giữ"/"Không giữ"; độ hiếm luôn kèm số sao; hỗ trợ cỡ chữ động. Tôn trọng `prefers-reduced-motion`.
- Bảo mật: mọi dữ liệu sau đăng nhập, phân quyền theo household, chỉ HTTPS. Dữ liệu trong volume Docker, có backup.
- Giọng văn: xưng "mình", gọi "cả nhà", câu ngắn, ≤ 1 emoji/câu, không viết HOA toàn bộ. Cấm tiền ảo, banner, pop-up, đếm ngược, hướng dẫn nhiều bước.
- Engine có unit test (vitest) cho phân bố tỉ lệ, tránh trùng, bậc trống với rng seed cố định.

## Technical Decisions

- **Stack (ghim phiên bản):** Node 26.x, TypeScript 7.0.2, Vite 8.3.1, React 19.3.0, react-router 8.4.0, @tanstack/react-query 5.104.0, zustand 5.0.15, motion 13.4.4, pocketbase JS SDK 0.28.1, PocketBase server 0.40.4, vitest 5.0.2, @playwright/test 1.63.0, Caddy 2.11.4 (nếu VPS chưa có proxy). `web/` dựng bằng `create-vite` template react-ts.
- **Cấu trúc:** `web/src/{app,features,sets,engine,data,ui}`, `web/public/seed/`, `server/{pb_migrations,pb_hooks}`, `deploy/{Dockerfile,compose.yml,Caddyfile}`. Features: `spin`, `tray`, `library`, `item-editor`, `item-detail`, `history`, `settings`.
- **Chiều phụ thuộc:** app → features → {sets, engine, data, ui}; sets → {engine, ui}; data → {engine, pocketbase}. `engine` không import gì trong dự án. Import `pocketbase` ngoài `data/` bị ESLint `no-restricted-imports` chặn.
- **Bộ gacha là plugin:** `SetDefinition` (setKey, groups key+nhãn+màu, slotTemplate, rarityWeights, defaultCooldownDays, facets, attrsSchema, seed, renderer) đăng ký ở `sets/registry.ts`, đọc qua `getSet(setKey)`. Cấm viết cứng `'man'/'rau'/'canh'` hay giá trị mùa trong `engine/` và `features/`.
- **Engine thuần:** hàm nhận `(set, items, recentDraws, lockedSlots, filters, now, rng)`, rng tiêm vào, không I/O / `Math.random` / giờ thật. Trả luôn thứ tự bật thẻ (bậc 3 ra cuối).
- **PocketBase:** collection `households` (name, members→users), auth `users` tắt tự đăng ký, `items` (household, setKey, groupKey, name, rarity 1–3, tags JSON, image file thumb 400x300, attrs JSON, seedKey, deleted), `draws` (household, setKey, chosenAt, entries JSON snapshot `[{itemId, groupKey, name, rarity, order}]`, chỉ create/delete), `set_configs`. Mọi rule: `household.members.id ?= @request.auth.id`; create/update kiểm thêm body. Schema chỉ đổi qua JS migration commit trong repo.
- **Dữ liệu:** ID do client sinh (15 ký tự `[a-z0-9]`), lỗi trùng ID coi là thành công; `items` xoá mềm; seed định danh bằng `seedKey`, unique `(household, setKey, seedKey)`.
- **Data layer:** chỉ `data/` gọi PocketBase, qua hook TanStack Query; query key tập trung ở `data/keys.ts`; mutation tự invalidate. Lỗi dạng `AppError {code, message}` giọng Nồi Thần.
- **Mâm đang mở** nằm trong store zustand của `features/tray`. Cooldown: `set_configs.cooldownDays` nếu có, không thì `defaultCooldownDays`. `chosenAt` ISO UTC do client ghi, logic ngày theo giờ máy.
- **Ảnh:** fallback ảnh upload → `web/public/seed/<seedKey>.webp` → minh hoạ đĩa trống "Thêm ảnh".
- **Quy ước:** collection `snake_case` số nhiều, field `camelCase`, key ổn định `kebab-case` ASCII, độ hiếm là số 1|2|3, chuỗi UI trong `ui/copy.ts` hoặc `sets/<setKey>/copy.ts`, rung qua `ui/haptics.ts`, animation đọc reduced-motion qua một hook chung.
- **Deploy:** Dockerfile multi-stage (build web → alpine + PocketBase + pb_public + migrations + hooks), `docker compose` với volume `pb_data`, TLS qua reverse proxy, bật backup tích hợp; front/back cùng tag. Dev: PocketBase local + `vite dev` proxy `/api`.

## UX & Interaction Patterns

- Token DESIGN.md → CSS variables. Màu chính: nền `surface-base #FBF6EC`, `surface-raised #FFF`, chữ `ink-primary #3A2B22` / `ink-secondary #86735F`, `primary #D9433B` (chỉ cho hành động chính), `accent-tile #2F8F83`, `accent-warm #F2A541`, độ hiếm common/rare/legend `#9CC5A1/#4F97D6/#F2B531`, nhóm man/rau/canh `#C8693F/#6BAA5C/#E0A33A`, mùa, `tray #E9D3AE`, `danger #E5534B`. Font Baloo 2 (display/title) và Be Vietnam Pro (body/label/meta), đủ dấu tiếng Việt. Bo `sm 10 / md 16 / lg 24 / full`. Spacing 4/8/12/16/24/32/48. Chỉ một mức bóng mềm.
- Thanh tab dưới cùng: Quay · Món ăn · Lịch sử, có icon + chữ, tab đang chọn màu `primary`. Chỉ mở chồng một lớp modal.
- Màn Quay: tiêu đề "Bộ: Món ăn ▾" (chưa bấm được), chip mùa, nồi đất 220px "thở", nút "Mở nồi!" viên thuốc 64px ở vùng ngón cái, nền gạch bông mờ, gợi ý lần đầu "Mở thử đi cả nhà!". Bánh răng Cài đặt trên màn Quay.
- Mâm cơm (lớp phủ, nền `tray`): ô `meal-slot` cao 96px, thumb 72px, nhãn nhóm, tên, sao, nút tròn 🎲 và 🔒; ô giữ thì nền nhạt và 🔒 màu `accent-tile`. "Đổi cả mâm" và "Chốt mâm!" dưới mâm.

## Cross-Story Dependencies

- 1.1 là nền cho mọi story (cấu trúc, lint, token, tab shell, vitest).
- 1.2 (engine + registry `food`) cần trước 1.4–1.8.
- 1.3 (migration households/users, pb client, `useCurrentHousehold`) cần trước 1.4 và 1.8.
- 1.4 (items + seed) cần trước 1.5; 1.5 cần trước 1.6, 1.7, 1.8.
- 1.9 đóng gói toàn bộ; Epic 2–4 dựng trên shell, registry và data layer của Epic 1.
