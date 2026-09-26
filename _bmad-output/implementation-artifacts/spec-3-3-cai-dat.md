---
title: 'Story 3.3: Cài đặt: số ngày tránh trùng và âm thanh'
type: 'feature'
created: '2026-09-26'
status: 'in-progress'
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
- [ ] `server/pb_migrations/1790000006_set_configs.js` -- collection.
- [ ] `web/src/data/setConfig.ts` (+ test), `keys.ts` -- hook đọc/lưu.
- [ ] `web/src/ui/preferences.ts` (+ test) -- âm thanh theo máy.
- [ ] `web/src/features/settings/SettingsScreen.tsx` + `.css` (+ test), `web/src/app/App.tsx` -- màn + route.
- [ ] `web/src/features/spin/SpinScreen.tsx` + `.css` (+ test) -- bánh răng, cooldown từ cấu hình.
- [ ] `web/src/ui/copy.ts` -- chuỗi.
- [ ] `web/e2e/settings.spec.ts` -- lưu cooldown thật (tạo rồi cập nhật 1 bản ghi), âm thanh giữ sau tải lại.

**Acceptance Criteria:**
- Given `npm run lint && npm run typecheck && npm test && npm run build && npm run test:e2e`, then pass.

## Implementation Notes

## Spec Change Log

## Review Triage Log

## Verification

**Commands:**
- `cd web && npm run lint && npm run typecheck && npm test && npm run build && npm run test:e2e` -- expected: pass.
