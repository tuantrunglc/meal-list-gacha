---
title: 'Story 3.3: Cài đặt: số ngày tránh trùng và âm thanh'
type: 'feature'
created: '2026-09-26'
status: 'done'
baseline_commit: 'ec9abca87a5d0506bfde8ffe74f3cf07886fefd4'
route: 'dispatch'
review_loop_iteration: 0
context:
  - '{project-root}/_bmad-output/implementation-artifacts/epic-3-context.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** Số ngày tránh trùng đang cố định 3 và chưa có chỗ bật/tắt âm thanh.

**Approach:** Màn Cài đặt (mở từ bánh răng trên màn Quay) chỉnh số ngày tránh trùng 0–30 lưu vào `set_configs` của household + Bộ (engine dùng ngay lần quay kế), và công tắc Âm thanh lưu theo máy (`localStorage`) qua một hook chung cho Epic 4.

## Boundaries & Constraints

**Always:**
- Migration `set_configs`: `household` (relation), `setKey`, `cooldownDays` (số nguyên 0–30, bắt buộc), `updated`; unique `(household, setKey)`; list/view/delete theo household; create/update thêm kiểm body household; update không đổi `household`/`setKey`.
- `data/setConfig.ts`: `useSetConfig(setKey)` → `cooldownDays | null` (chưa có bản ghi = null); `useSaveCooldown(setKey)` upsert: có bản ghi thì update, chưa có thì create với ID tự sinh; create gặp trùng (máy khác vừa tạo) thì tìm lại rồi update; xong cập nhật cache + invalidate draw gần đây (cửa sổ đổi).
- `ui/preferences.ts`: `useSoundEnabled()` → `[enabled, setEnabled]`, mặc định tắt, lưu `localStorage` (khoá `noi-than:sound`), đồng bộ giữa các tab (`storage` event); `localStorage` hỏng/không có thì vẫn chạy (mặc định tắt, không crash).
- Màn Quay: nút bánh răng (44px, nhãn "Cài đặt") góc phải trên → `/cai-dat`; cửa sổ tránh trùng = `set_configs.cooldownDays` nếu có, không thì `defaultCooldownDays`; nút Quay chờ cả cấu hình.
- Màn Cài đặt (`/cai-dat`): nút "← Về màn Quay"; "Số ngày tránh trùng": nút −/+ (44px) và số hiện tại, giới hạn 0–30, câu giải thích ("Món đã chốt sẽ nghỉ N ngày rồi mới ra lại." / 0: "Không tránh trùng"), nút "Lưu" (chỉ bật khi đổi), lưu xong toast "Đã lưu."; lỗi + Thử lại. "Âm thanh": công tắc `role="switch"` `aria-checked`, đổi là lưu ngay.

**Never:** Không lưu âm thanh lên server. Chưa làm "Khôi phục món mặc định" (3.4). Không viết cứng key Bộ.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Mặc định | chưa có `set_configs` | hiện 3 (default của Bộ) | N/A |
| Lưu lần đầu | 3 → 5, Lưu | tạo bản ghi `cooldownDays=5`, toast | N/A |
| Lưu lần sau | 5 → 0, Lưu | cập nhật bản ghi (không tạo thêm) | N/A |
| Giới hạn | ở 30 bấm +, ở 0 bấm − | không vượt 0–30, nút tương ứng khoá | N/A |
| Engine dùng ngay | cooldown 0, vừa chốt X | lần quay kế X có thể ra | N/A |
| Hai máy cùng tạo | create trùng unique | tìm bản ghi, update | coi là thành công |
| Âm thanh | bật công tắc, tải lại trang | vẫn bật | localStorage lỗi → tắt, không crash |
| Lỗi mạng | lưu thất bại | lời nhắn + Thử lại | AppError |

</frozen-after-approval>

## Code Map

- `server/pb_migrations/1790000003_draws.js` -- mẫu rule; `1790000005_file_token.js` là migration mới nhất.
- `web/src/data/{draws,items,keys,ids,errors}.ts` -- mẫu hook, `isConflict`, `newId`.
- `web/src/features/spin/SpinScreen.tsx` -- `cooldownDays = set.defaultCooldownDays`; header có nút "Bộ".
- `web/src/app/App.tsx` -- routes.

## Tasks & Acceptance

**Execution:**
- [x] `server/pb_migrations/1790000006_set_configs.js` -- collection.
- [x] `web/src/data/setConfig.ts` (+ test), `keys.ts` -- hook đọc/lưu.
- [x] `web/src/ui/preferences.ts` (+ test) -- âm thanh theo máy.
- [x] `web/src/features/settings/SettingsScreen.tsx` + `.css` (+ test), `web/src/app/App.tsx` -- màn + route.
- [x] `web/src/features/spin/SpinScreen.tsx` + `.css` (+ test) -- bánh răng, cooldown từ cấu hình.
- [x] `web/src/ui/copy.ts` -- chuỗi.
- [x] `web/e2e/settings.spec.ts` -- lưu cooldown thật (tạo rồi cập nhật 1 bản ghi), âm thanh giữ sau tải lại.

**Acceptance Criteria:**
- Given `npm run lint && npm run typecheck && npm test && npm run build && npm run test:e2e`, then pass.

## Implementation Notes

- `cooldownDays` không `required` trong migration: PocketBase coi 0 là rỗng với số bắt buộc; giới hạn 0..30 do `min/max` + `onlyInt`.
- Upsert phía client: tìm → update; không có thì create với ID client; trùng `(household, setKey)` (máy khác vừa tạo) thì tìm lại và update.
- Lưu xong: `setQueryData` cho cấu hình và invalidate draws (cửa sổ tránh trùng đổi).
- Nút Quay chờ cả cấu hình để không quay bằng số ngày mặc định rồi mới đổi.
- `useSoundEnabled`: `useSyncExternalStore` + sự kiện `storage`; localStorage bị chặn thì nhớ trong phiên.
- Test SpinScreen bọc `MemoryRouter` vì có `Link` bánh răng.

## Spec Change Log

## Review Triage Log

| # | Nguồn | Finding | Verdict | Bằng chứng | Route |
|---|---|---|---|---|---|
| 1 | blind, edge, verif | Tải cấu hình lỗi → nút Quay khoá mãi, không báo | medium | | patch — alert + Thử lại gọi `config.refetch`; test |
| 2 | edge | Cài đặt: household lỗi → "đang tải" mãi | medium | Query cấu hình bị tắt | patch — hiện lỗi household + Thử lại; test |
| 3 | edge | Tải lại nền lỗi làm mất stepper và số đang chỉnh | low | | patch — chỉ thay bằng lỗi khi chưa có dữ liệu; test |
| 4 | edge, blind | Chuỗi "đang tải" mượn của Thư viện; nhãn bánh răng trùng tiêu đề | low | | patch — `copy.settings.loading`, nhãn "Mở cài đặt" |
| 5 | verif | Luật `set_configs` (người ngoài, không đổi household/setKey, 0..30) chưa test | medium | Mẫu ở commit/items spec | patch — e2e server |
| 6 | verif, blind | Dạng lỗi trùng `(household, setKey)` chỉ test bằng lỗi giả | medium | | patch — e2e POST trùng thật, kiểm `validation_not_unique` |
| 7 | edge, blind | E2E phụ thuộc trạng thái sạch; xoá không kiểm | low | | patch — dọn trước khi chạy, kiểm kết quả xoá |
| 8 | blind | Test "lỗi lưu" / "đang lưu" khó đọc; thiếu test đang tải, `ready=false` | low | | patch — thêm test |
| 9 | blind | Thứ tự import `Link` | low | | patch |
| 10 | blind | Cache mâm gần đây không theo số ngày | reject | Key `recent` đã chứa `cooldownDays` (draws.ts:52) | reject |
| 11 | edge | Trùng ID client bị coi như trùng household+Bộ | low | ID 15 ký tự ngẫu nhiên; tìm lại không thấy thì ném lỗi gốc | reject |
| 12 | edge | Máy khác lưu trong lúc đang chỉnh → ghi đè | low | Cài đặt một con số, ai lưu sau thắng là chấp nhận được | reject |
| 13 | blind | Rời màn khi chưa Lưu mất số đang chỉnh | low | Một con số, không đáng hỏi "Bỏ thay đổi?" | reject |
| 14 | blind | Stepper mỗi lần một ngày | low | Phạm vi 0..30, mặc định 3 | reject |
| 15 | blind | `Object.assign(mutation, { ready })` | low | Quy ước sẵn có của mọi mutation | reject |
| 16 | blind | `setKey` không kiểm theo Bộ đã biết; thiếu field thì lưu 0 | low | Client luôn gửi giá trị; server không biết registry Bộ | reject |
| 17 | edge | Test âm thanh để lại localStorage | low | Mỗi test một context mới | reject |

## Verification

**Commands:**
- `cd web && npm run lint && npm run typecheck && npm test && npm run build && npm run test:e2e` -- expected: pass.
