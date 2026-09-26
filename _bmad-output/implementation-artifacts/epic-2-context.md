# Epic 2 Context: Sổ món của nhà

<!-- Compiled from planning artifacts. Edit freely. Regenerate with compile-epic-context if planning docs change. -->

## Goal

Cả nhà xem thư viện món của Bộ đang chọn dạng lưới, lọc theo nhóm và mùa, tìm theo tên; thêm món ruột kèm ảnh chụp và công thức, sửa hoặc xoá (mềm) món. Món mới/sửa có hiệu lực ngay ở lần quay kế tiếp. Nút "Thêm món" ở ô hết món của mâm (Epic 1) được nối sang form này.

## Stories

- Story 2.1: Thư viện món
- Story 2.2: Thêm món mới kèm công thức
- Story 2.3: Ảnh món
- Story 2.4: Sửa món
- Story 2.5: Xoá món

## Requirements & Constraints

- Thư viện: lưới 2 cột `dish-card` (ảnh thumb 4:3, tên font display, nhãn nhóm, huy hiệu sao, chấm mùa, viền 4px màu độ hiếm, bo `lg`), chỉ món `deleted=false`, mới thêm/sửa gần nhất lên đầu. Lọc nhóm (Tất cả + nhóm) và mùa (Tất cả + giá trị facet) bằng cùng component chip với màn Quay; tìm theo tên không phân biệt hoa thường và dấu ("ca kho" khớp "Cá kho tộ"). Không có kết quả: "Không thấy món này. Thêm mới luôn?" kèm ＋ (tên điền sẵn). Chạm thẻ → Chi tiết món (dùng lại màn Story 1.7).
- Thêm/Sửa món: ảnh (Chụp ảnh / Chọn từ thư viện, cắt 4:3, nén WebP cạnh dài ≤ 1200px ngay trên trình duyệt, xem trước), tên (bắt buộc), nhóm (bắt buộc), mùa (mặc định Quanh năm), độ hiếm (mặc định Thường), công thức (Nguyên liệu mỗi dòng một mục, Các bước đánh số thêm/xoá được, Ghi chú tuỳ chọn). Thiếu tên/nhóm thì báo ngay tại trường. Lưu xong toast "Đã lưu vào nồi!" màu `accent-warm`, món nằm đầu lưới. Rời màn khi chưa lưu: "Bỏ thay đổi?". Lưu lỗi: báo thân thiện + thử lại, không tạo trùng.
- Ảnh lỗi: "Ảnh này khó chịu quá, thử tấm khác nhé", form giữ dữ liệu. Lưới/mâm dùng thumb 400x300, chi tiết dùng ảnh gốc; fallback ảnh upload → ảnh seed → đĩa trống.
- Chi tiết: nút Sửa; món chưa có nguyên liệu và bước: "Chưa có công thức, ghi lại bí kíp nè" + nút Sửa. Món seed sửa vẫn giữ `seedKey`.
- Xoá: vuốt thẻ/hàng hoặc "Xoá" trong Chi tiết, luôn xác nhận với nút màu `danger`; đặt `deleted=true`. Lịch sử cũ vẫn hiện tên/độ hiếm từ snapshot, ảnh vẫn tải được.
- Accessibility: vùng chạm ≥ 44px, mọi phần tử tương tác có nhãn, chỉ một lớp modal, cỡ chữ động. Giọng văn Nồi Thần, chuỗi ở `copy.ts`.

## Technical Decisions

- `items` (Story 1.4): `household, setKey, groupKey, name, rarity 1–3, tags JSON, image (file, 1 ảnh, webp/jpeg/png ≤ 5MB, thumb 400x300, protected), attrs JSON, seedKey, deleted`. Update rule không cho đổi `household/setKey/seedKey`; delete rule `null` (không xoá hẳn).
- Ảnh `protected`: URL cần file token (`pb.files.getToken()`), lấy trong `data/` và truyền vào `itemImageSources(item, token, size)`.
- ID do client sinh (`newId`), trùng ID khi gửi lại coi là thành công. `attrs` kiểm bằng `SetDefinition.parseAttrs`. Mutation tự invalidate `queryKeys.items`.
- Plugin Bộ: nhóm/mùa/nhãn lấy từ `SetDefinition`; phần công thức là `DetailView` của Bộ; trình soạn `attrs` cũng thuộc Bộ. Không viết cứng key Bộ trong `features/` (có test quét).
- Chỉ `data/` gọi PocketBase; lint chặn theo đồ thị phụ thuộc.

## UX & Interaction Patterns

- Tab "Món ăn" (`/mon-an`). Nút ＋ nổi để thêm món. Toast dùng `accent-warm`. Nút xoá màu `danger`.
- Chip nhóm/mùa dùng `ui/ChipGroup`; thẻ món `dish-card`; ảnh `ui/DishImage`.

## Cross-Story Dependencies

- 2.1 cần `useItems`, `ItemDetail` (Epic 1). 2.2 cần 2.1 (điểm vào) và nối "Thêm món" ở ô hết món (Story 1.5/1.6). 2.3 cần form 2.2. 2.4 dùng lại form 2.2 + chi tiết 1.7. 2.5 cần 2.1 và chi tiết.
- Lịch sử (Epic 3) dựa vào snapshot `entries` và xoá mềm của 2.5.
