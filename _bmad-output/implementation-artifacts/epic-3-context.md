# Epic 3 Context: Lịch sử & Cài đặt

<!-- Compiled from planning artifacts. Edit freely. Regenerate with compile-epic-context if planning docs change. -->

## Goal

Cả nhà xem lại các mâm đã chốt theo ngày (lên kế hoạch đi chợ, thấy cả tuần ăn gì), xoá mâm chốt nhầm để món được quay lại ngay; chỉnh số ngày tránh trùng, bật/tắt âm thanh và khôi phục món mặc định trong màn Cài đặt.

## Stories

- Story 3.1: Lịch sử mâm đã chốt
- Story 3.2: Xoá mâm trong lịch sử
- Story 3.3: Cài đặt: số ngày tránh trùng và âm thanh
- Story 3.4: Khôi phục món mặc định

## Requirements & Constraints

- Lịch sử (tab "Lịch sử", `/lich-su`): draw của household, mới nhất trước; mỗi hàng có ngày giờ (`meta`, giờ máy), ảnh nhỏ các món xếp theo `order`, tên các món; tải thêm khi cuộn (phân trang). Chạm một món mở Chi tiết; món đã xoá mềm vẫn mở được, tên/độ hiếm lấy từ snapshot `entries`. Trống: "Chưa chốt mâm nào. Qua tab Quay mở nồi thử nhé!".
- Xoá mâm: vuốt hàng lịch sử, xác nhận nút `danger`, xoá hẳn draw (draw chỉ create/delete); invalidate draw gần đây để món không còn bị tránh trùng.
- Cài đặt: icon bánh răng trên màn Quay mở màn Cài đặt. Số ngày tránh trùng 0–30 lưu `set_configs` (household, setKey, cooldownDays; unique `(household, setKey)`; API rule theo household), engine dùng thay `defaultCooldownDays` ngay lần quay kế. Âm thanh (mặc định tắt) lưu `localStorage`, đọc qua một hook chung Epic 4 dùng.
- Khôi phục món mặc định: xác nhận rồi upsert mọi món seed theo `(household, setKey, seedKey)` về nội dung seed và `deleted=false`; món tự thêm (`seedKey` rỗng) không đổi; ảnh upload của món seed bị bỏ (về ảnh seed); toast xác nhận.
- Một lớp modal, vùng chạm ≥ 44px, nhãn cho trình đọc màn hình, giọng Nồi Thần, chuỗi ở `copy.ts`.

## Technical Decisions

- `draws` (Story 1.8): `household, setKey, chosenAt (date, PocketBase trả dạng có dấu cách → `toIsoDate`), entries JSON snapshot [{itemId, groupKey, name, rarity, order}]`; list/view/delete theo household, update `null`, create giới hạn `chosenAt` trong @yesterday..@tomorrow. Key `queryKeys.draws(householdId, setKey)` (con `recent`, `any`).
- `items` update rule cấm đổi `setKey/seedKey/household`, delete rule `null`. Seed ở `SetDefinition.seed` (feature truyền vào `data/`, `data/` không import `sets/`).
- Mâm/Engine: cooldown từ `set_configs.cooldownDays` nếu có, không thì `defaultCooldownDays` (AD-7). Tuỳ chọn theo máy (âm thanh, giảm chuyển động) ở `localStorage`, không lên server (AD-3).
- Schema chỉ đổi qua migration có commit (AD-10). Chỉ `data/` gọi PocketBase (lint chặn).
- Ảnh protected: `useItemImages()` (file token); `ItemDetail` dùng lại; `ui/Modal`, `ui/toast`, `.button-danger`, thao tác vuốt như `DishCard`.

## UX & Interaction Patterns

- Hàng lịch sử: ngày (`meta`), ảnh nhỏ xếp cạnh nhau, tên món; vuốt để xoá (xác nhận). Màn Cài đặt mở từ bánh răng trên màn Quay.

## Cross-Story Dependencies

- 3.1 cần draws (1.8) + chi tiết (1.7, 2.4). 3.2 cần 3.1. 3.3 cần màn Quay + engine (1.2, 1.5, 1.8). 3.4 cần seed (1.4) và màn Cài đặt (3.3). Epic 4 dùng hook âm thanh của 3.3.
