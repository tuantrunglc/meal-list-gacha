---
name: Nồi Thần (app-eat-lucky)
status: final
sources: []
updated: 2026-09-26
---

# Nồi Thần: Experience Spine

## Foundation

Một **website nhỏ** mở bằng trình duyệt điện thoại (mobile-first), không phải app cài đặt. Dữ liệu lưu trên **server tự host của nhà** (VPS), cần có mạng để dùng. v1 có một người dùng (chủ app), **đăng nhập một lần** rồi nhớ luôn. Dữ liệu được gom theo "Nhà" nên sau này có thể thêm thành viên và đồng bộ nhiều máy (xem ARCHITECTURE-SPINE). Chưa chọn UI system. `DESIGN.md` là chuẩn nhận diện hình ảnh, file này mô tả cách app hoạt động.

Mức độ: dùng trong gia đình. **Hướng mở rộng:** sau này có thể thêm các "bộ gacha" khác ngoài món ăn. Vì vậy mọi màn đều xoay quanh khái niệm **Bộ** (v1 chỉ có bộ "Món ăn").

## Information Architecture

| Màn | Vào từ | Mục đích |
|---|---|---|
| Quay | Mở app, tab 1 | Chọn mùa, mở nồi ra **mâm cơm** |
| Mâm cơm (lớp phủ) | Sau khi quay | 3 ô món (Mặn · Rau · Canh): đổi riêng, giữ 🔒, đổi cả mâm, Chốt mâm, xem công thức từng món |
| Chi tiết món | Kết quả, Thư viện, Lịch sử | Ảnh, độ hiếm, mùa, nguyên liệu, các bước nấu |
| Thêm / Sửa món | Nút ＋ ở Thư viện, nút Sửa ở Chi tiết | Upload ảnh, nhập tên, **nhóm món**, mùa, độ hiếm, công thức |
| Thư viện món | Tab 2 | Lưới món, lọc theo **nhóm** và mùa, tìm theo tên |
| Lịch sử | Tab 3 | Các **mâm** đã chốt theo ngày |
| Cài đặt | Icon bánh răng trên màn Quay | Số ngày tránh trùng, khôi phục món mặc định |

Thanh tab dưới cùng: **Quay · Món ăn · Lịch sử**. Chỉ mở chồng một lớp (modal), không bao giờ hai lớp.

→ Mock tham khảo: `mockups/quay-va-mam-com.html` (màn Quay + Mâm cơm). Nếu mock và file này mâu thuẫn thì file này đúng.

**Chừa chỗ mở rộng:** tiêu đề màn Quay là "Bộ: Món ăn ▾". v1 chưa bấm được. Khi có thêm bộ, chỗ này thành bộ chọn.

## Voice and Tone

Giọng vui, xưng "mình", gọi người dùng là "cả nhà", có chút nghịch.

| Nên | Không nên |
|---|---|
| "Mở nồi!" | "Bắt đầu quay" |
| "Nồi Thần dọn mâm: **Cá kho tộ · Rau muống xào tỏi · Canh chua**!" | "Kết quả: 3 món" |
| "Chốt mâm!" / "Đổi cả mâm" / "Đổi món này" | "Xác nhận" / "Huỷ" / "Quay lại" |
| "Món này chưa có ảnh, chụp một tấm cho đẹp nè" | "Không có hình ảnh" |
| "Mấy món gần đây nồi giấu đi rồi, khỏi lo trùng 😉" | "Đã lọc 3 mục trùng lặp" |
| Câu ngắn, emoji vừa phải (tối đa 1 emoji mỗi câu) | Emoji dày đặc, chữ HOA, dấu !!! |

## Component Patterns

| Thành phần | Dùng ở | Quy tắc hành vi |
|---|---|---|
| Nút Quay | Quay | Chạm để quay. Bị khoá trong lúc đang quay. Nếu không còn món hợp lệ thì hiện trạng thái trống. |
| Nồi gacha | Quay | Chỉ để trang trí và phản hồi khi quay. Chỉ quay bằng nút, không có lắc điện thoại. |
| Chip mùa | Quay, Thư viện | Chọn một chip. Mặc định là **mùa hiện tại** (tự nhận theo tháng) cộng thêm món "Quanh năm". |
| Ô món (trong mâm) | Mâm cơm | Mỗi ô gắn một nhóm (Mặn / Rau / Canh). Chạm vào ô để mở Chi tiết món. Nút 🎲 **Đổi món này** quay lại riêng ô đó (cùng nhóm). Nút 🔒 **Giữ** khoá món, bấm lại để mở khoá. |
| Nút ＋ Thêm món | Mâm cơm | Thêm một ô, chọn nhóm (v1: Mặn / Rau / Canh). Ô thêm vào có nút ✕ để bỏ. 3 ô mặc định không bỏ được. |
| Nút Đổi cả mâm | Mâm cơm | Quay lại mọi ô **chưa khoá**, không ghi lịch sử. Không giới hạn số lần. |
| Nút Chốt mâm | Mâm cơm | Lưu cả mâm vào Lịch sử kèm ngày giờ. **Từng món** trong mâm bị loại khỏi vòng quay trong N ngày. |
| Thẻ món | Thư viện | Chạm để mở Chi tiết món. Có nhãn nhóm. |
| Chọn ảnh | Thêm / Sửa món | Chọn giữa Chụp ảnh và Chọn từ thư viện. Tự nén và cắt 4:3, có xem trước. |
| Trình soạn công thức | Thêm / Sửa món | Hai phần: **Nguyên liệu** (danh sách, mỗi dòng một mục) và **Các bước** (đánh số, thêm hoặc xoá bước). Ghi chú tự do là tuỳ chọn. |
| Hàng lịch sử | Lịch sử | Ngày (`meta`), 3 ảnh nhỏ xếp cạnh nhau, tên các món. Chạm vào một món để xem Chi tiết. Vuốt để xoá cả mâm (có xác nhận). |

## Luật Gacha

- **Mâm cơm**: mặc định gồm 3 ô là **1 Mặn** (thịt, cá, trứng, đậu, tôm…), **1 Rau** (xào, luộc, nộm, dưa…) và **1 Canh**. Mỗi món thuộc đúng một nhóm. Mỗi ô chỉ quay trong nhóm của nó. Một mâm không có hai món trùng nhau.
- **Độ hiếm**: tính **riêng từng ô**. 3 bậc, tỉ lệ ra **Thường 60% · Ngon 30% · Đặc biệt 10%**. Hệ thống quay bậc trước, rồi chọn ngẫu nhiên một món trong bậc và nhóm đó.
- **Tránh trùng**: món nằm trong mâm đã **chốt** trong **3 ngày** gần nhất không ra lại. Món đang khoá 🔒 không bị ảnh hưởng. Số ngày chỉnh được trong Cài đặt.
- **Lọc mùa**: chỉ quay trong các món thuộc mùa đang chọn và món "Quanh năm".
- **Bậc trống**: nếu bậc vừa quay trúng không còn món hợp lệ trong nhóm, chuyển sang bậc gần nhất còn món.
- **Món mặc định**: app có sẵn danh sách món dân dã (đủ 3 nhóm, đủ 3 bậc, đủ các mùa). Người dùng sửa, xoá hoặc thêm được. "Khôi phục món mặc định" trong Cài đặt chỉ khôi phục món gốc, không động tới món tự thêm.

## State Patterns

| Trạng thái | Màn | Cách xử lý |
|---|---|---|
| Lần đầu mở | Quay | Có sẵn món mặc định. Hiện một dòng gợi ý: "Mở thử đi cả nhà!" Không có hướng dẫn nhiều bước. |
| Đang quay | Quay | Nồi rung khoảng 1,5–2 giây, nút khoá, không bỏ qua được (chạm lần nữa không có tác dụng). |
| Nhóm hết món hợp lệ | Mâm cơm | Ô đó hiện "Hết món **Canh** mùa này rồi 😅" kèm hai nút **Đổi mùa** / **Thêm món** (nhóm đã chọn sẵn). Các ô khác vẫn hiện bình thường. |
| Món chưa có ảnh | Mọi nơi | Minh hoạ đĩa trống kèm "Thêm ảnh". |
| Món chưa có công thức | Chi tiết | "Chưa có công thức, ghi lại bí kíp nè" kèm nút Sửa. |
| Lịch sử trống | Lịch sử | "Chưa chốt mâm nào. Qua tab Quay mở nồi thử nhé!" |
| Tìm không thấy | Thư viện | "Không thấy món này. Thêm mới luôn?" kèm nút ＋ (tên đã điền sẵn). |
| Lưu món | Thêm / Sửa | Bắt buộc có tên món và **nhóm**. Mùa mặc định "Quanh năm", độ hiếm mặc định Thường. Lưu xong có toast "Đã lưu vào nồi!" |
| Rời màn khi chưa lưu | Thêm / Sửa | Hỏi lại: "Bỏ thay đổi?" |
| Ảnh quá lớn / lỗi | Thêm / Sửa | Tự nén. Nếu lỗi thì báo "Ảnh này khó chịu quá, thử tấm khác nhé". |

## Interaction Primitives

- Chạm để làm mọi thứ. Nút Quay là hành động chính duy nhất trên màn Quay.
- Vuốt để xoá ở hàng lịch sử và hàng món (luôn có xác nhận).
- Rung nhẹ (haptic) mỗi khi một thẻ bật ra, rung mạnh hơn khi ra món Đặc biệt. **Chỉ có trên máy hỗ trợ (Android).** iPhone không rung được từ website, nên hiệu ứng hình và âm thanh là phản hồi chính.
- **Cấm:** tiền ảo, tích điểm, banner, pop-up quảng bá, đếm ngược, thông báo đẩy kéo người dùng quay lại, hướng dẫn nhiều bước.

## Motion

- **Quay:** nồi sôi sùng sục (rung nhẹ), nắp nảy, hơi nước bốc lên. Kéo dài 1,5–2 giây.
- **Mở nồi:** nắp bật ra, **3 thẻ bật ra lần lượt** theo thứ tự Mặn → Rau → Canh, mỗi thẻ cách nhau khoảng 0,5 giây, rồi xếp vào mâm. Nếu có món ⭐⭐⭐ thì món đó **ra cuối** cho hồi hộp. Chạm màn hình để bỏ qua và hiện cả mâm ngay. Viền mỗi thẻ sáng lên theo màu độ hiếm. Sau khi mở xong, mâm **giữ nguyên thứ tự bật ra** (món ⭐⭐⭐ nằm dưới cùng). Mỗi bậc sao có hiệu ứng riêng (xem bảng dưới).
- **Hiệu ứng riêng theo độ hiếm** (áp dụng cho từng thẻ khi bật ra, và cả khi 🎲 đổi món):

  | Độ hiếm | Trước khi bật | Lúc thẻ bật ra | Âm thanh / rung |
  |---|---|---|---|
  | ⭐ Thường | Không có | Thẻ nảy nhẹ, một làn hơi nước nhỏ | "Bụp" nhẹ · rung nhẹ |
  | ⭐⭐ Ngon | Nắp nồi lóe **xanh dương** | Thẻ nảy, một vệt sáng xanh quét ngang viền, vài hạt gạo nhỏ bắn ra | "Ting" · rung vừa |
  | ⭐⭐⭐ Đặc biệt | Nồi rung mạnh hơn, khe nắp **phát sáng vàng**, hơi nước cuộn lên (nhá hàng khoảng 0,8 giây) | Tia sáng vàng xoay chầm chậm sau thẻ, sao ✦ lấp lánh quanh viền, chữ "Đặc biệt!" nảy lên, thẻ bật chậm hơn một nhịp | "Ting-ting-tinh" · rung mạnh 2 nhịp |

  Hiệu ứng chỉ nằm quanh thẻ, **không phủ kín màn hình** (giữ tinh thần nhẹ nhàng). Hiệu ứng ⭐⭐⭐ kéo dài tối đa khoảng 1,5 giây, chạm để bỏ qua. Nhiều món ⭐⭐⭐ trong cùng một mâm thì mỗi món vẫn có hiệu ứng riêng, nhưng nhá hàng chỉ chạy một lần.
- **Đổi một món:** chỉ ô đó lật lại (flip) khoảng 0,6 giây. Nồi không rung.
- **Giảm chuyển động:** khi hệ thống bật Reduce Motion thì bỏ hiệu ứng nồi sôi, tia sáng và hạt bay; cả mâm hiện dần (fade) trong 300ms. Độ hiếm vẫn nhận ra qua màu viền và số sao.
- Âm thanh **mặc định tắt**, bật được trong Cài đặt.

## Accessibility Floor

- Vùng chạm tối thiểu 44pt / 48dp. Nút Quay cao 64px.
- Mọi phần tử tương tác có nhãn cho trình đọc màn hình. Khi có kết quả, đọc thông báo: "Mâm cơm: Mặn [tên], [bậc]; Rau [tên], [bậc]; Canh [tên], [bậc]". Nút 🔒 báo trạng thái "Đang giữ" / "Không giữ".
- Độ hiếm không chỉ thể hiện bằng màu, luôn kèm số sao ⭐.
- Hỗ trợ cỡ chữ động. Công thức vẫn đọc được ở cỡ chữ lớn nhất.
- Tôn trọng chế độ Giảm chuyển động (xem Motion).

## Inspiration & Anti-patterns

- **Lấy từ game gacha:** khoảnh khắc hồi hộp lúc mở, viền màu theo độ hiếm, lấp lánh khi ra món hiếm.
- **Lấy từ gian bếp Việt:** nồi đất, hơi nước, mâm cơm gia đình 1 mặn 1 rau 1 canh, món dân dã quen thuộc.
- **Từ chối:** mọi thứ phức tạp và rối mắt của game gacha như tiền ảo, banner sự kiện, pity counter hiện lên màn hình, nhiều lớp menu. App phải **nhẹ nhàng, vui vẻ**.

## Key Flows

### Flow 1: Nay ăn gì? (Nguyentrung, 17h, đứng trước tủ lạnh phân vân)

1. Mở app, thấy màn Quay. Chip mùa tự chọn sẵn mùa **Thu**.
2. Chạm **Mở nồi!**
3. Nồi sôi sùng sục (rung nhẹ), nắp nảy, hơi nước bốc lên.
4. Nắp bật ra. Thẻ **Rau muống xào tỏi ⭐** bật ra trước, rồi **Canh chua ⭐⭐**.
5. **Cao trào:** thẻ cuối bật ra, viền vàng lấp lánh: **Cá kho tộ ⭐⭐⭐**. "Nồi Thần dọn mâm!"
6. Chạm ô Cá kho tộ để xem công thức, nhận ra nhà còn thiếu cá.
7. Quay lại mâm. Bấm 🔒 giữ Rau muống và Canh chua, rồi chạm 🎲 **Đổi món này** ở ô Mặn. Ô lật lại, ra **Trứng chiên hành ⭐**.
8. Chạm **Chốt mâm!** Cả mâm được lưu vào Lịch sử, và 3 món này sẽ không ra lại trong 3 ngày tới.

Nhánh lỗi: nhóm Canh hết món hợp lệ trong mùa Thu thì riêng ô Canh hiện trạng thái trống kèm **Đổi mùa** / **Thêm món**.

### Flow 2: Thêm món ruột của nhà (Nguyentrung, cuối tuần, vừa nấu xong nồi thịt kho trứng)

1. Mở tab **Món ăn**, chạm ＋.
2. Chạm ô ảnh, chọn **Chụp ảnh**, chụp nồi thịt kho vừa nấu, xem trước ảnh đã cắt 4:3.
3. Nhập tên "Thịt kho trứng kiểu mẹ", chọn nhóm **Mặn**, mùa **Quanh năm** và độ hiếm **Đặc biệt**.
4. Nhập nguyên liệu (mỗi dòng một thứ) và 5 bước nấu.
5. Chạm **Lưu**.
6. **Cao trào:** toast "Đã lưu vào nồi!", thẻ món mới xuất hiện ở đầu lưới với ảnh thật của nhà mình.

### Flow 3: Tuần này ăn gì rồi? (Nguyentrung, sáng thứ Hai lên kế hoạch đi chợ)

1. Mở tab **Lịch sử**, thấy mỗi ngày một mâm kèm 3 ảnh nhỏ.
2. Chạm một món để mở lại công thức.
3. **Cao trào:** nhìn một lượt thấy cả tuần đủ mặn, rau, canh, không món nào trùng.

## Open Questions

- `[ASSUMPTION]` Nhóm "Mặn" gồm cả cá, trứng, đậu, tôm. Nút ＋ thêm ô (v1 chỉ 3 nhóm). Có đủ ba cách chỉnh mâm (cả mâm, từng món, giữ 🔒). Độ hiếm tính riêng từng món. Chốt mâm thì từng món tránh trùng 3 ngày. Người dùng đã duyệt mock ngày 2026-09-26.

Đã xác nhận (2026-09-26): vật thể gacha là **nồi đất** · kết quả là **mâm cơm 1 mặn 1 rau 1 canh** · mở nồi thì 3 thẻ bật ra lần lượt, món ⭐⭐⭐ ra cuối · độ hiếm 3 bậc 60/30/10 · tránh trùng 3 ngày · chỉ quay bằng nút (bỏ lắc điện thoại, 2026-09-26), âm thanh mặc định tắt · màu theo nồi cơm điện và căn bếp Việt.
