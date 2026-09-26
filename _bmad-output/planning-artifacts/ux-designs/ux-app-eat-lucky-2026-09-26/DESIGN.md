---
name: Nồi Thần (app-eat-lucky)
description: App gia đình quay gacha ra mâm cơm dân dã Việt Nam (1 mặn, 1 rau, 1 canh) — vui vẻ, nghịch ngợm, nhẹ nhàng, không rườm rà.
status: final
updated: 2026-09-26
colors:
  # Cảm hứng: nồi cơm điện kiểu Việt (vỏ kem, hoa đỏ, nắp inox, đèn Cook/Warm) + căn bếp Việt (gạch bông, men xanh, đất nung)
  surface-base: '#FBF6EC'
  surface-raised: '#FFFFFF'
  ink-primary: '#3A2B22'
  ink-secondary: '#86735F'
  ink-disabled: '#C9BBAE'
  primary: '#D9433B'
  primary-pressed: '#B8322B'
  on-primary: '#FFFFFF'
  accent-tile: '#2F8F83'
  accent-warm: '#F2A541'
  accent-steel: '#B9C0C7'
  accent-clay: '#C8693F'
  border-soft: '#EFE3D0'
  rarity-common: '#9CC5A1'
  rarity-rare: '#4F97D6'
  rarity-legend: '#F2B531'
  season-spring: '#F7A6C1'
  season-summer: '#FFB547'
  season-autumn: '#D98A4E'
  season-winter: '#7FB3D5'
  season-allyear: '#B8A99A'
  group-man: '#C8693F'
  group-rau: '#6BAA5C'
  group-canh: '#E0A33A'
  tray: '#E9D3AE'
  danger: '#E5534B'
typography:
  # Font tròn, thân thiện, hỗ trợ đầy đủ dấu tiếng Việt
  display:
    fontFamily: 'Baloo 2, system-ui, sans-serif'
    fontSize: 32px
    fontWeight: 800
    lineHeight: 1.15
  title:
    fontFamily: 'Baloo 2, system-ui, sans-serif'
    fontSize: 22px
    fontWeight: 700
    lineHeight: 1.25
  body:
    fontFamily: 'Be Vietnam Pro, system-ui, sans-serif'
    fontSize: 16px
    fontWeight: 400
    lineHeight: 1.5
  label:
    fontFamily: 'Be Vietnam Pro, system-ui, sans-serif'
    fontSize: 14px
    fontWeight: 600
    lineHeight: 1.3
  meta:
    fontFamily: 'Be Vietnam Pro, system-ui, sans-serif'
    fontSize: 12px
    fontWeight: 500
    lineHeight: 1.3
rounded:
  sm: 10px
  md: 16px
  lg: 24px
  full: 9999px
spacing:
  '1': 4px
  '2': 8px
  '3': 12px
  '4': 16px
  '5': 24px
  '6': 32px
  '7': 48px
  margin-mobile: 16px
components:
  spin-button:
    background: '{colors.primary}'
    pressed: '{colors.primary-pressed}'
    text: '{colors.on-primary}'
    typography: '{typography.title}'
    rounded: '{rounded.full}'
    height: 64px
  gacha-pot:
    size: 220px
    note: 'Minh hoạ nồi đất/nồi cơm phẳng (flat), nắp nảy lên khi quay'
  dish-card:
    background: '{colors.surface-raised}'
    rounded: '{rounded.lg}'
    border-width: 4px
    border-color: 'theo độ hiếm — {colors.rarity-common} / {colors.rarity-rare} / {colors.rarity-legend}'
    image-ratio: '4:3'
  meal-tray:
    background: '{colors.tray}'
    rounded: '{rounded.lg}'
    note: 'Mâm tre đan, nhìn từ trên xuống; chứa 3 ô món xếp dọc'
  meal-slot:
    background: '{colors.surface-raised}'
    rounded: '{rounded.md}'
    border-width: 3px
    border-color: 'theo độ hiếm'
    thumb-size: 72px
    height: 96px
  group-tag:
    rounded: '{rounded.full}'
    typography: '{typography.meta}'
    note: 'Mặn {colors.group-man} · Rau {colors.group-rau} · Canh {colors.group-canh}'
  rarity-badge:
    rounded: '{rounded.full}'
    typography: '{typography.meta}'
  season-chip:
    rounded: '{rounded.full}'
    typography: '{typography.label}'
    height: 36px
  button-secondary:
    background: '{colors.surface-raised}'
    border-color: '{colors.border-soft}'
    text: '{colors.ink-primary}'
    rounded: '{rounded.full}'
    height: 48px
  input:
    background: '{colors.surface-raised}'
    border-color: '{colors.border-soft}'
    rounded: '{rounded.sm}'
    height: 48px
  tab-bar:
    background: '{colors.surface-raised}'
    active: '{colors.primary}'
    inactive: '{colors.ink-secondary}'
---

## Brand & Style

Nồi Thần là cái bếp nhà mình biến thành trò chơi nhỏ. Mỗi bữa là một lần "mở nồi" xem hôm nay trời cho ăn gì. Kết quả mỗi lần mở nồi là **một mâm cơm gia đình**: 1 mặn, 1 rau, 1 canh. Tinh thần là **gia đình vui vẻ, nghịch ngợm**: hình minh hoạ phẳng, bo tròn, có chút tinh nghịch (nồi nảy nắp, món ăn "nhảy" ra). Tuyệt đối **không rườm rà**. Một màn hình, một hành động chính, nhiều khoảng thở.

Lấy chất "gacha" ở khoảnh khắc hồi hộp lúc mở nồi và niềm vui khi ra món hiếm. Không lấy phần rối mắt của game gacha như tiền ảo, banner, pop-up hay đếm ngược. Vật thể gacha trung tâm là **cái nồi**.

## Colors

Bảng màu lấy cảm hứng từ **chiếc nồi cơm điện quen thuộc của nhà Việt** và **căn bếp Việt Nam**.

- **Kem vỏ nồi (`surface-base`)**: nền chính, màu vỏ nồi cơm kiểu cũ, ấm và dịu mắt.
- **Đỏ hoa nồi (`primary`)**: màu hoa in trên vỏ nồi và đèn "Cook". Màu duy nhất cho hành động chính (nút **Mở nồi!**, Lưu). Không dùng để trang trí.
- **Cam đèn Warm (`accent-warm`)**: trạng thái "đang nấu / đang quay", toast "Đã lưu vào nồi!".
- **Xanh gạch bông (`accent-tile`)**: điểm nhấn phụ như chip đang chọn, liên kết, họa tiết gạch bông mờ ở nền màn Quay.
- **Bạc nắp inox (`accent-steel`)**: nắp nồi trong minh hoạ, đường viền phụ.
- **Đất nung (`accent-clay`)**: chi tiết minh hoạ bếp (kệ, chạn), không dùng cho chữ.
- **Màu độ hiếm**: xanh lá nhạt (Thường), xanh dương (Ngon), vàng (Đặc biệt). Chỉ dùng cho viền thẻ món và huy hiệu độ hiếm.
- **Màu mùa**: chỉ dùng cho chip lọc mùa và chấm nhỏ trên thẻ. Không phủ nền lớn.
- **Màu nhóm món** (Mặn đất nung · Rau xanh lá · Canh vàng nghệ): chỉ dùng cho nhãn nhóm nhỏ. Không trùng vai trò với màu độ hiếm.
- **Màu mâm tre (`tray`)**: nền của mâm cơm trong lớp phủ kết quả.
- **Đỏ (`danger`)**: chỉ dùng cho xác nhận xoá.

Tránh: gradient cầu vồng, nền tối kiểu casino, quá 2 màu sặc sỡ trên cùng một màn hình.

## Typography

- `display`: tên món khi mở nồi, lời chào trên màn Quay.
- `title`: tiêu đề màn, tên món trong chi tiết, chữ trên nút Quay.
- `body`: công thức, mô tả.
- `label`: chip, nút phụ, tab.
- `meta`: ngày trong lịch sử, huy hiệu độ hiếm.

Font tròn, dày cho tiêu đề (vui, thân thiện); font gọn, dễ đọc cho nội dung dài (công thức). Cả hai phải hiển thị chuẩn dấu tiếng Việt. Không viết HOA toàn bộ.

## Layout & Spacing

Thang khoảng cách 4 / 8 / 12 / 16 / 24 / 32 / 48. Lề màn hình `{spacing.margin-mobile}`. Một cột duy nhất. Nồi và nút Quay nằm ở nửa dưới màn hình (vùng ngón cái). Thư viện món là lưới 2 cột.

## Elevation & Depth

Chỉ có một mức đổ bóng mềm, ấm, cho thẻ món và nút Quay, để chúng trông như "nhấc lên được". Còn lại phân tầng bằng tông nền (`surface-base` và `surface-raised`). Không dùng bóng gắt hay nhiều lớp.

## Shapes

Mọi thứ đều bo tròn. `rounded.sm` cho ô nhập, `rounded.md` cho thẻ nhỏ và hàng danh sách, `rounded.lg` cho thẻ món khi mở nồi, `rounded.full` cho nút, chip và huy hiệu. Không có góc vuông. Ảnh món bo theo khung chứa.

## Components

→ Mock tham khảo: `mockups/quay-va-mam-com.html`. Nếu mock và file này mâu thuẫn thì file này đúng.

- **Nồi gacha** (`gacha-pot`): minh hoạ nồi đất phẳng ở giữa màn Quay. Khi đứng yên thì "thở" nhẹ. Khi quay thì sôi sùng sục (rung nhẹ), nắp nảy lên, hơi nước bốc lên.
- **Nút Quay** (`spin-button`): nút viên thuốc lớn, màu đỏ hoa nồi, chữ "Mở nồi!". Luôn là thứ nổi bật nhất trên màn hình.
- **Thẻ món** (`dish-card`): ảnh 4:3 ở trên, tên món (`display`), huy hiệu độ hiếm, chấm mùa. Viền dày theo màu độ hiếm. Món Đặc biệt có thêm ánh lấp lánh ở viền.
- **Mâm cơm** (`meal-tray`): mâm tre bo tròn, chứa các ô món xếp dọc. Nút **Đổi cả mâm** và **Chốt mâm!** nằm dưới mâm.
- **Ô món** (`meal-slot`): ảnh vuông nhỏ bên trái; ở giữa là nhãn nhóm, tên món, sao độ hiếm; bên phải là hai nút tròn 🎲 (đổi món) và 🔒 (giữ). Khi ô đang giữ thì nền nhạt đi và biểu tượng 🔒 được tô màu `accent-tile`. Viền ô theo màu độ hiếm, ô Đặc biệt có lấp lánh.
- **Hiệu ứng theo độ hiếm** (hình ảnh):
  - ⭐ Thường: chỉ có viền `rarity-common`, không phát sáng.
  - ⭐⭐ Ngon: viền `rarity-rare`, một vệt sáng trắng-xanh quét qua viền, hạt gạo trắng nhỏ.
  - ⭐⭐⭐ Đặc biệt: viền `rarity-legend` phát sáng; tia sáng vàng hình quạt (rất nhạt, độ mờ ≤ 40%) xoay sau thẻ; sao ✦ vàng lấp lánh; nhãn "Đặc biệt!" màu `rarity-legend` chữ nâu đậm.
  - Hiệu ứng chỉ nằm trong khoảng 24px quanh thẻ, không đổi màu nền màn hình.
- **Nhãn nhóm** (`group-tag`): viên thuốc nhỏ ghi Mặn / Rau / Canh.
- **Huy hiệu độ hiếm**: ⭐ Thường · ⭐⭐ Ngon · ⭐⭐⭐ Đặc biệt.
- **Chip mùa**: Xuân / Hạ / Thu / Đông / Quanh năm, mỗi chip có một chấm màu mùa. Chip đang chọn được tô nền.
- **Ảnh món trống**: khi món chưa có ảnh thì hiện minh hoạ đĩa trống kèm chữ "Thêm ảnh". Không hiện icon ảnh lỗi.
- **Thanh tab**: 3 tab có icon và chữ, tab đang chọn màu `primary`.

## Do's and Don'ts

| Nên | Không nên |
|---|---|
| Một hành động chính mỗi màn (nút Quay) | Nhiều nút sặc sỡ cạnh tranh nhau |
| Minh hoạ phẳng, bo tròn, vui | Hiệu ứng 3D nặng, particle tràn màn hình |
| Màu độ hiếm chỉ ở viền và huy hiệu | Đổi màu nền cả màn theo độ hiếm |
| Nhiều khoảng trắng | Nhồi thông tin, banner, pop-up |
| Ảnh thật của món do người dùng chụp | Ảnh stock bóng bẩy kiểu nhà hàng |
