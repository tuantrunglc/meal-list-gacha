---
title: 'Story 1.2: Luật nồi (engine gacha) và Bộ "Món ăn"'
type: 'feature'
created: '2026-09-26'
status: 'done'
baseline_commit: 'dccddd19fb5b2d6bde40a9b00567e87735e9e6c8'
route: 'dispatch'
review_loop_iteration: 0
context:
  - '{project-root}/_bmad-output/implementation-artifacts/epic-1-context.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** Chưa có luật quay; mọi màn sau (mâm, đổi món, chốt) cần một nguồn luật duy nhất, test được.

**Approach:** Engine thuần trong `web/src/engine/` (không biết Bộ nào), cộng Bộ `food` là plugin đầu tiên đăng ký trong `web/src/sets/registry.ts`, kèm seed ≥ 30 món dân dã có công thức.

## Boundaries & Constraints

**Always:**
- Engine nhận một object `{ set, items, recentDraws, cooldownDays, slots, filters, now, rng }` và trả `{ slots, revealOrder }`. `slots` là mọi ô hiện có `{ id, groupKey, itemId | null, keep }`; ô `keep=true` (đang khoá, hoặc không phải ô cần quay lại) giữ nguyên món, không qua bộ lọc, nhưng món của nó vẫn tính vào "không trùng trong mâm". Cùng một hàm dùng cho mở nồi, 🎲, Đổi cả mâm, ＋ ô.
- Thứ tự lọc mỗi ô: nhóm → facet (giá trị chọn hoặc `universalValue`) → `deleted=false` → tránh trùng → không trùng mâm → quay bậc theo `rarityWeights` → bậc trống thì bậc gần nhất còn món (hoà lấy bậc thấp) → không còn gì thì `empty`.
- Tránh trùng: loại món có trong `entries` của draw mà `dayDiff(now, chosenAt) < cooldownDays`, `dayDiff` đếm theo **ngày lịch giờ máy** (0 = cùng ngày). `cooldownDays=0` thì không loại gì.
- `revealOrder`: theo thứ tự `slots`, ô có món bậc 3 dời xuống cuối (giữ thứ tự tương đối).
- `rng: () => number` trong [0,1); engine export `createSeededRng(seed)` cho test. Engine không gọi `Math.random`, `Date.now`, I/O.
- `sets/food`: `setKey 'food'`, nhãn "Món ăn"; groups `man/rau/canh` với nhãn Mặn/Rau/Canh và màu `var(--color-group-*)`; slotTemplate 3 ô không bỏ được; `rarityWeights {1:60,2:30,3:10}`; `defaultCooldownDays 3`; facet `season` giá trị `xuan/ha/thu/dong/quanh-nam` (nhãn, màu `var(--color-season-*)`), `universalValue 'quanh-nam'`, `defaultValue(now)` theo tháng: Xuân 2–4, Hạ 5–7, Thu 8–10, Đông 11–1; `parseAttrs` kiểm `{ingredients: string[], steps: string[], note?: string}`; seed ≥ 30 món, `seedKey` kebab ASCII duy nhất, đủ 3 nhóm × 3 bậc, mỗi mùa (kể cả quanh-nam) có món ở cả 3 nhóm, món có nguyên liệu và các bước ngắn gọn.
- Nhãn độ hiếm Thường/Ngon/Đặc biệt nằm ở `ui/copy.ts` (dùng chung mọi Bộ).

**Never:**
- Không viết cứng `'man'`, `'rau'`, `'canh'`, `'xuan'`, `'ha'`, `'thu'`, `'dong'`, `'quanh-nam'` trong `src/engine/` và `src/features/`.
- Không thêm thư viện validate (zod…); không UI, không gọi PocketBase.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Phân bố | 10.000 lần quay 1 ô, đủ bậc, rng seed cố định | tỉ lệ bậc 1/2/3 lệch ≤ 2% so với 60/30/10 | N/A |
| Bậc trống | trúng bậc 2 nhưng nhóm chỉ có bậc 1 và 3 | lấy bậc 1 (hoà → thấp) | N/A |
| Hết món | nhóm không còn món hợp lệ | ô `itemId null`, `status 'empty'`, ô khác vẫn có món | N/A |
| Tránh trùng | draw hôm qua có X, cooldown 3 | X không ra; draw 3 ngày trước có X → X ra được | N/A |
| Khoá | ô keep với món X (X nằm trong cooldown, sai mùa) | ô giữ X; ô khác không ra X | N/A |
| Không trùng mâm | 2 ô cùng nhóm, nhóm chỉ còn 1 món | ô đầu có món, ô sau `empty` | N/A |
| Mùa | chọn `thu` | chỉ món tag `thu` hoặc `quanh-nam` | N/A |
| Xoá mềm | món `deleted=true` | không bao giờ ra | N/A |
| Thứ tự bật | Mặn bậc 3, Rau bậc 1, Canh bậc 2 | `revealOrder` = Rau, Canh, Mặn | N/A |

</frozen-after-approval>

## Code Map

- `web/src/engine/` đang trống (`.gitkeep`); lint cấm engine import lớp khác (`web/.oxlintrc.json`). `sets` được import `engine` (types).
- `web/src/ui/copy.ts` -- thêm `rarity` labels.
- `web/src/ui/tokens.css` -- đã có `--color-group-*`, `--color-season-*`, `--color-rarity-*`.
- Vitest: `web/vite.config.ts` include `src/**/*.test.{ts,tsx}`, `tests/**/*.test.ts`; thêm `env: { TZ: 'Asia/Ho_Chi_Minh' }` để test ngày lịch ổn định.

## Tasks & Acceptance

**Execution:**
- [x] `web/src/engine/types.ts` -- `Rarity`, `EngineItem`, `EngineSet` (groups, rarityWeights, facets có `universalValue`), `Slot`, `DrawInput`, `SlotResult`, `DrawResult`, `RecentDraw`.
- [x] `web/src/engine/rng.ts` -- `createSeededRng` (mulberry32).
- [x] `web/src/engine/dates.ts` -- `calendarDayDiff(now, iso)`.
- [x] `web/src/engine/draw.ts` + `web/src/engine/index.ts` -- `drawSlots(input)` theo Boundaries.
- [x] `web/src/engine/draw.test.ts` -- mọi hàng của ma trận.
- [x] `web/src/sets/types.ts` -- `SetDefinition extends EngineSet` (+ setKey, label, slotTemplate, defaultCooldownDays, facets có values/label/color/defaultValue, parseAttrs, seed).
- [x] `web/src/sets/food/{definition,seed,attrs}.ts` + `copy.ts` -- Bộ Món ăn.
- [x] `web/src/sets/registry.ts` -- `getSet`, `listSets`, `DEFAULT_SET_KEY`.
- [x] `web/src/sets/food/food.test.ts` -- seed hợp lệ và đủ phủ; mùa mặc định theo từng tháng; parseAttrs chấp nhận/từ chối.
- [x] `web/tests/no-hardcoded-keys.test.ts` -- quét `src/engine`, `src/features` không có các chuỗi key cấm (bỏ qua file test của engine).

**Acceptance Criteria:**
- Given `npm run lint && npm run typecheck && npm test && npm run build`, then tất cả pass.

## Implementation Notes

- `SetDefinition = Omit<EngineSet,'groups'|'facets'> & {...}`: groups/facets là bản mở rộng nên `foodSet` truyền thẳng vào `drawSlots` (có test tích hợp trong `food.test.ts`).
- Seed 51 món (18 Mặn, 17 Rau, 16 Canh); mỗi mùa cụ thể có đủ 3 bậc ở cả 3 nhóm, cộng món quanh năm.
- Ô `keep=true` mà `itemId=null` trả `status 'empty'`.
- `vite.config.ts` thêm `test.env.TZ = 'Asia/Ho_Chi_Minh'`; test `calendarDayDiff` chỉ pass khi TZ này có hiệu lực.

## Spec Change Log

## Review Triage Log

| # | Nguồn | Finding | Verdict | Bằng chứng | Route |
|---|---|---|---|---|---|
| 1 | verif | Test "Khoá" không chứng minh món ô giữ bị loại khỏi ô khác (bỏ `inTray.add` vẫn pass) | medium | Reviewer tắt dòng đó, 23 test vẫn xanh | patch — test ô giữ là ứng viên duy nhất; test Khoá dùng cooldown 3 |
| 2 | verif | "Facet thiếu trong filters thì không lọc" chưa có test | medium | Mọi test `filters:{}` dùng tag universal | patch — thêm test |
| 3 | blind | Thiếu test biên cooldown (2 ngày trước, cooldown 3) | low | Chỉ test diff 1 và 3 | patch — thêm test |
| 4 | blind | Không kiểm Bộ khi đăng ký (setKey trùng, slotTemplate/facet/seed hợp lệ) | medium | Chỉ `food.test.ts` kiểm tay cho food; kiến trúc cần nhiều Bộ | patch — `sets/registry.test.ts` chạy cho mọi Bộ |
| 5 | blind, edge | Test AD-1 dễ lách: key chép tay, chỉ bắt chuỗi trong nháy | medium | `{ man: 1 }`, `x.canh` lọt | patch — key lấy từ registry, bắt thêm `.key` và `key:`; chuyển sang `src/test/` dùng `import.meta.glob` |
| 6 | blind | `EngineSet.groups` không được engine dùng | low | Không có chỗ đọc | patch — bỏ khỏi `EngineSet` |
| 7 | blind, edge | Ô `keep` với `itemId null` mãi `empty` | low | Đúng hành vi, chưa ghi | patch — ghi rõ trên `Slot.keep` + test |
| 8 | blind | Seed: nguyên liệu thiếu gia vị so với các bước; dấu "," trong một mục | low | `canh-chua-ca`, riêu cua, cua rau đay | patch — bổ sung nguyên liệu |
| 9 | blind, edge | Trọng số 0/NaN → luôn bậc 3 | low | Chỉ xảy ra khi định nghĩa Bộ sai | reject — đã chặn bằng test #4 (trọng số > 0) |
| 10 | edge | `chosenAt` không parse được → NaN, lọt cooldown | low | `chosenAt` do chính client ghi ISO | reject |
| 11 | edge | `chosenAt` ở tương lai → chặn lâu | low | Chỉ khi lệch đồng hồ; chặn món vừa ăn là an toàn | reject |
| 12 | edge | rng trả NaN → crash | false | Hợp đồng rng là [0,1) | reject |
| 13 | edge, blind | Món ô giữ không còn trong `items` → `kept` rarity null | low | Store mâm (1.5/1.6) giữ snapshot món | reject |
| 14 | edge | 2 ô giữ cùng món | false | Engine không bao giờ tạo trạng thái đó | reject |
| 15 | edge | filter chuỗi rỗng | false | Không có caller dùng "" | reject |
| 16 | edge, blind | `parseFoodAttrs` nhận chuỗi rỗng/mảng thưa | low | JSON từ PocketBase không có mảng thưa; trim thuộc form Story 2.2 | reject |
| 17 | blind | Engine có thể import `sets/food` | false | Lint chặn `**/sets/**` trong engine | reject |
| 18 | blind | `test.env.TZ` không tin cậy | false | Test `calendarDayDiff` fail dưới UTC, pass ở đây → TZ có hiệu lực | reject |
| 19 | blind | `copy.rarity` không gắn kiểu `Rarity` | low | `ui` không được import `engine` theo đồ thị phụ thuộc | reject |
| 20 | blind | Seed trùng ý/món cần ủ lâu/độ hiếm chủ quan | low | Nội dung, người dùng sửa được | reject |

## Verification

**Commands:**
- `cd web && npm run lint && npm run typecheck && npm test && npm run build` -- expected: pass.
