---
title: 'Story 3.4: Khôi phục món mặc định'
type: 'feature'
created: '2026-09-26'
status: 'done'
baseline_commit: '0463d7df921ee9901f13317df86c01df59bb0a3f'
route: 'dispatch'
review_loop_iteration: 0
context:
  - '{project-root}/_bmad-output/implementation-artifacts/epic-3-context.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** Món gốc lỡ sửa hỏng hoặc xoá thì không có cách lấy lại; nồi vơi dần món dân dã.

**Approach:** Màn Cài đặt có mục "Khôi phục món mặc định": xác nhận rồi upsert mọi món seed của Bộ theo `(household, setKey, seedKey)` về đúng nội dung seed, `deleted=false`, bỏ ảnh upload (về ảnh seed); món tự thêm không đụng tới; toast xác nhận.

## Boundaries & Constraints

**Always:**
- `data/items.ts`: `useRestoreSeed(set: SeedSource)` — tải lại mọi bản ghi của Bộ; với mỗi món seed: có bản ghi → nếu khác seed (tên, nhóm, độ hiếm, tags, attrs, `deleted`, có ảnh upload) thì `update` về seed + `deleted=false` + `image=null`, giống rồi thì bỏ qua (không đổi thứ tự thư viện); chưa có → tạo như `seedSet`. Chạy song song có giới hạn; idempotent nên Thử lại là chạy lại toàn bộ. Xong invalidate danh sách món. `ready` theo household.
- Chỉ đụng bản ghi có `seedKey` thuộc seed của Bộ; món `seedKey` rỗng không bao giờ bị đọc để ghi.
- Màn Cài đặt: mục "Món mặc định" với câu giải thích và nút "Khôi phục món mặc định" (secondary, 48px) → `ConfirmDialog` "Khôi phục món mặc định?" / "Các món gốc sẽ về như ban đầu: tên, công thức, ảnh; món đã xoá quay lại nồi. Món nhà tự thêm vẫn giữ nguyên." / "Khôi phục" / "Đang khôi phục…"; đang chạy thì khoá; lỗi hiện trong hộp + Thử lại; xong đóng hộp, toast "Nồi đủ món gốc rồi nè!".

**Never:** Không xoá hẳn bản ghi nào. Không đổi món tự thêm. Không viết cứng key Bộ trong `features/`/`data/`.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Món seed đã xoá | seed X `deleted=true` | X `deleted=false`, về nội dung seed | N/A |
| Món seed bị sửa | đổi tên + có ảnh upload | tên seed, ảnh upload bị bỏ | N/A |
| Món seed nguyên vẹn | giống seed | không gọi update | N/A |
| Thiếu bản ghi | seed Y chưa có bản ghi | tạo Y | trùng seedKey (máy khác) → bỏ qua |
| Món tự thêm | `seedKey` rỗng | không đổi | N/A |
| Lỗi giữa chừng | update lỗi mạng | hộp giữ, lời nhắn + Thử lại chạy lại (idempotent) | AppError |
| Huỷ | "Thôi" | không gọi server | N/A |

</frozen-after-approval>

## Code Map

- `web/src/data/items.ts` -- `seedSet`, `mapLimit`, `fetchAll`, `useDeleteItem` (mẫu mutation).
- `web/src/features/settings/SettingsScreen.tsx` -- thêm mục.
- `web/src/ui/ConfirmDialog.tsx`, `ui/toast.ts`, `ui/copy.ts`.

## Tasks & Acceptance

**Execution:**
- [x] `web/src/data/items.ts` (+ test) -- `useRestoreSeed`.
- [x] `web/src/features/settings/SettingsScreen.tsx` + `.css` (class `settings__action`) (+ test), `web/src/ui/copy.ts` -- mục khôi phục.
- [x] `web/e2e/restore.spec.ts` -- xoá + sửa món seed, thêm món tự tạo; khôi phục → món seed về như cũ, món tự tạo giữ nguyên, đủ món gốc trong thư viện.

**Acceptance Criteria:**
- Given `npm run lint && npm run typecheck && npm test && npm run build && npm run test:e2e`, then pass.

## Implementation Notes

- So sánh với seed bằng JSON khoá đã sắp xếp (thứ tự khoá `attrs` từ server có thể khác); món giống seed không bị `update` nên không nhảy lên đầu thư viện.
- Cập nhật trước, tạo món thiếu sau (dùng lại `seedSet`, trùng seedKey bỏ qua).
- `onRestored` ở mức hook để toast vẫn hiện nếu màn đã rời; `onSettled` luôn invalidate (lỗi giữa chừng thì danh sách vẫn phản ánh phần đã khôi phục).

## Spec Change Log

## Review Triage Log

| # | Nguồn | Finding | Verdict | Bằng chứng | Route |
|---|---|---|---|---|---|
| 1 | blind, edge | Một update lỗi: các worker khác vẫn ghi sau khi đã báo lỗi; thử lại có thể chồng lên | medium | `Promise.all` reject sớm | patch — `mapLimit` dừng nhận việc mới, chờ việc đang chạy rồi mới ném lỗi đầu; test |
| 2 | edge | Tạo trùng seedKey (máy khác vừa tạo, đã sửa/xoá) bị bỏ qua mà vẫn báo xong | medium | | patch — lượt hai tải lại và đưa bản đó về seed; test |
| 3 | edge | Seed không có `attrs` → JSON bỏ khoá, công thức đã sửa không bị xoá | low | | patch — `attrs ?? null`; test |
| 4 | verif | `matchesSeed` chỉ ghim ảnh/xoá; bỏ so tên/công thức/độ hiếm/nhóm/tags không test nào hỏng | medium | | patch — test bảng từng trường |
| 5 | blind | Hộp xác nhận không nói ảnh bị bỏ hẳn và nhóm/độ hiếm cũng về gốc | medium | | patch — sửa câu |
| 6 | blind | Thiếu test `reset` khi Thôi, `ready=false`, `onRestored` | low | | patch |
| 7 | blind | Nút khôi phục dùng class của nút Lưu | low | | patch — `settings__action` |
| 8 | blind, edge | E2E: không kiểm đủ 2 món seed; chú thích dọn dẹp sai | low | | patch |
| 9 | edge | Spec ghi có sửa `.css` nhưng diff không có | low | | patch — nay có class mới |
| 10 | blind, edge | Hai bản ghi cùng seedKey / seedKey đã rút khỏi Bộ | reject | Unique index `(household, setKey, seedKey)`; món seed đã rút giữ nguyên là chủ ý | reject |
| 11 | blind | Chỉ khôi phục Bộ mặc định | reject | Hiện chỉ có một Bộ; màn Cài đặt theo Bộ đang dùng | reject |
| 12 | blind | Invalidate hẹp (chỉ items) | reject | Lịch sử/mâm đọc tên-ảnh từ cùng query items | reject |
| 13 | blind | Toast giống nhau dù không có gì đổi | reject | Kết quả vẫn đúng: nồi đủ món gốc | reject |
| 14 | edge | E2E song song / >500 món / món tự thêm tích luỹ | reject | `workers: 1`; e2e ít món; xoá mềm là chủ ý (AD-4), các spec khác cũng vậy | reject |

## Verification

**Commands:**
- `cd web && npm run lint && npm run typecheck && npm test && npm run build && npm run test:e2e` -- expected: pass.
