---
title: 'Story 2.3: Ảnh món'
type: 'feature'
created: '2026-09-26'
status: 'done'
baseline_commit: 'ac5ee0b1f3383fd72a4ce569138e76d9a227ca37'
route: 'dispatch'
review_loop_iteration: 0
context:
  - '{project-root}/_bmad-output/implementation-artifacts/epic-2-context.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** Món chỉ có đĩa trống; cả nhà muốn nồi dọn ra mâm bằng ảnh thật của nhà.

**Approach:** Ô ảnh trong form cho chọn "Chụp ảnh" / "Chọn từ thư viện"; ảnh được cắt 4:3, thu nhỏ và nén ngay trên trình duyệt, xem trước rồi mới lưu vào `items.image`. Ảnh `protected` hiển thị bằng file token lấy trong `data/`.

## Boundaries & Constraints

**Always:**
- `features/item-editor/imageProcessing.ts`: `cropRect(w, h)` (cắt giữa 4:3) và `targetSize(w, h)` (cạnh dài ≤ 1200, không phóng to) là hàm thuần; `processImage(file)` giải mã (`createImageBitmap`), vẽ canvas, xuất `image/webp` chất lượng ~0.82; trình duyệt không xuất được WebP (Safari trả PNG) thì xuất `image/jpeg` ~0.85; trả `File` + URL xem trước. Không đọc được / không phải ảnh / quá lớn (> 25MB) thì lỗi thân thiện "Ảnh này khó chịu quá, thử tấm khác nhé".
- `features/item-editor/ImagePicker.tsx`: ô ảnh 4:3 (xem trước hoặc đĩa trống "Thêm ảnh") là nút mở lựa chọn ngay trong form: "Chụp ảnh" (`input type=file accept=image/* capture=environment`), "Chọn từ thư viện" (`accept=image/*`), và "Bỏ ảnh" khi đang có ảnh; đang xử lý thì báo "Đang sửa ảnh…"; lỗi thì báo dưới ô ảnh, form giữ nguyên dữ liệu. Mọi nút ≥ 44px, có nhãn.
- Lưu: `useCreateItem` nhận `image?: File` và gửi multipart (SDK tự làm khi có `File`); trùng ID → `update` kèm ảnh.
- `data/files.ts`: `useFileToken()` lấy `pb.files.getToken()`, làm mới trước khi hết hạn (~2 phút); `useItemImages()` trả hàm `(item, size) => sources` gắn token. Lưới Thư viện và mâm dùng thumb `400x300`, Chi tiết dùng ảnh gốc; fallback ảnh upload → ảnh seed → đĩa trống giữ nguyên.
- Revoke URL xem trước khi đổi ảnh hoặc đóng form.

**Never:** Không upload ảnh gốc chưa nén. Không cho kéo chọn vùng cắt (cắt giữa tự động). Sửa ảnh của món đã có thuộc Story 2.4 (dùng chung `ImagePicker`).

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Ảnh ngang lớn | 4000×2000 | cắt giữa 4:3 → 1200×900 WebP (hoặc JPEG) | N/A |
| Ảnh dọc | 3000×4000 | cắt giữa 4:3 → 1200×900 | N/A |
| Ảnh nhỏ | 800×600 | giữ 800×600, không phóng to | N/A |
| File không phải ảnh | .txt đổi tên .jpg | báo "Ảnh này khó chịu quá, thử tấm khác nhé", form giữ nguyên | N/A |
| Lưu có ảnh | tạo món kèm ảnh | `items.image` có file; lưới hiện thumb, chi tiết hiện ảnh gốc | N/A |
| Bỏ ảnh | chọn rồi "Bỏ ảnh" | lưu không có ảnh (đĩa trống) | N/A |
| Ảnh protected | xem lưới | URL có token hợp lệ, tải được | token hết hạn → lấy lại |

</frozen-after-approval>

## Code Map

- `web/src/features/item-editor/ItemEditor.tsx` -- `DishImage` tạm ở ô ảnh; thêm `ImagePicker`, trường `image` trong state.
- `web/src/data/items.ts` -- `useCreateItem` (create/update), `itemImageSources(item, token, size)`.
- `web/src/features/{library/LibraryScreen,tray/MealTray,item-detail/ItemDetail}.tsx` -- đang gọi `itemImageSources` không token.
- `server/pb_migrations/1790000002_items.js` -- `image` protected, webp/jpeg/png ≤ 5MB, thumb 400x300.

## Tasks & Acceptance

**Execution:**
- [x] `web/src/features/item-editor/imageProcessing.ts` (+ test hàm thuần) -- cắt/thu/nén.
- [x] `web/src/features/item-editor/ImagePicker.tsx` + `.css` (+ test với `processImage` mock) -- ô ảnh.
- [x] `web/src/features/item-editor/ItemEditor.tsx` -- gắn ảnh vào form + lưu.
- [x] `web/src/data/items.ts`, `web/src/data/files.ts` (+ test) -- gửi ảnh, file token, `useItemImages`.
- [x] Lưới/mâm/chi tiết -- dùng `useItemImages`.
- [x] `web/e2e/image.spec.ts` -- chọn ảnh thật (tạo bằng canvas), kiểm cỡ 4:3 ≤ 1200, lưu, thumb tải được với token; file hỏng báo lỗi.

**Acceptance Criteria:**
- Given `npm run lint && npm run typecheck && npm test && npm run build && npm run test:e2e`, then pass.

## Implementation Notes

- `createImageBitmap(file, { imageOrientation: 'from-image' })` để ảnh chụp dọc từ điện thoại không bị xoay sai.
- Unit test mock `data/files` toàn cục trong `src/test/setup.ts` (component không cần server); `data/files.test.tsx` dùng `vi.unmock`.
- E2E tạo ảnh PNG thật bằng canvas, kiểm 4000×2000 → 1200×900, file protected không token bị chặn, thumb có token tải được; dọn món tự tạo sau mỗi test.

## Spec Change Log

## Review Triage Log

| # | Nguồn | Finding | Verdict | Bằng chứng | Route |
|---|---|---|---|---|---|
| 1 | blind, edge, verif | Token đổi mỗi 90 giây → URL mọi ảnh đổi → tải lại, nháy | medium | Token nằm trong URL, `img key={src}` | patch — migration `1790000005_file_token.js` đặt file token 12 giờ; client chỉ làm mới gần hết hạn theo `exp`, không refetch khi focus; test `refreshDelay` |
| 2 | blind, edge | Chưa có token/lỗi token: gọi URL protected không token → 403 | medium | | patch — không token thì bỏ ảnh upload, dùng seed/đĩa trống; test |
| 3 | blind | Mock toàn cục trả `[]` che fallback ảnh seed | medium | | patch — mock gọi `itemImageSources` thật với token giả |
| 4 | edge | Bấm Lưu khi ảnh đang xử lý → lưu thiếu ảnh; đóng form lúc đó mất ảnh không hỏi | medium | | patch — `onBusyChange`, khoá Lưu/đóng khi đang xử lý; test |
| 5 | blind, edge | Đóng form khi đang xử lý: URL xem trước không được revoke, setState sau unmount | low | | patch — cờ mounted, revoke ảnh làm xong muộn |
| 6 | edge | Thử lại (trùng ID) sau khi "Bỏ ảnh" vẫn giữ ảnh cũ trên server | medium | update không gửi `image` | patch — update gửi `image: null` khi không có ảnh; test |
| 7 | verif, blind | Đường gửi ảnh (create + update khi trùng ID) chưa test | medium | | patch — test gửi đúng File |
| 8 | verif, blind | Nhánh JPEG khi Safari không xuất WebP chưa chạy | medium | | patch — test canvas giả lập (WebP, PNG→JPEG, giải mã lỗi) |
| 9 | verif | Chi tiết dùng ảnh gốc + token, mâm dùng thumb chưa kiểm | medium | | patch — e2e mở chi tiết: có token, không thumb, 1200×900 |
| 10 | verif | Chỉ chọn ảnh chưa được tính là "đã sửa" trong test | medium | | patch — test (kèm ảnh được gửi khi lưu) |
| 11 | edge | Kích thước 0 → vùng cắt NaN | low | | patch — chặn |
| 12 | blind | "Đang sửa ảnh…" không được đọc; lỗi còn sau khi Bỏ ảnh | low | | patch — `role=status` ẩn; xoá lỗi khi bỏ ảnh |
| 13 | blind, edge | E2E dọn quá rộng (mọi món tự tạo) | low | | patch — chỉ dọn món tên có "E2E" |
| 14 | edge | CSS `.item-editor__image` thừa | low | | patch — xoá |
| 15 | blind, edge | Ảnh nhiều megapixel nhưng nhẹ vẫn giải mã full | low | Ảnh điện thoại ≤ 50MP vẫn xử lý được; giới hạn 25MB | reject |
| 16 | blind | HEIC trên Chromium báo lỗi chung | low | Safari iOS tự đổi sang JPEG khi chọn ảnh | reject |
| 17 | blind | Thời hạn token viết cứng | false | Nay đọc `exp` trong token | reject |

## Verification

**Commands:**
- `cd web && npm run lint && npm run typecheck && npm test && npm run build && npm run test:e2e` -- expected: pass.
