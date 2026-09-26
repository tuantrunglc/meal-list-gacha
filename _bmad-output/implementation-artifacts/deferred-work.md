# Deferred Work

- source_spec: `_bmad-output/implementation-artifacts/spec-1-3-dang-nhap-mot-lan.md`
  summary: Test tự động cho migration tạo chủ app khi thiếu biến môi trường và khi user đã tồn tại.
  evidence: E2E luôn chạy với dữ liệu trống và đủ env nên chỉ đi nhánh tạo mới; cần thêm một cấu hình khởi động PocketBase (không env / có user sẵn) và kiểm server vẫn healthy, không tạo trùng. Mức độ nếu có lỗi: medium (server không khởi động), chưa kiểm.

- source_spec: `_bmad-output/implementation-artifacts/spec-1-9-deploy-len-vps.md`
  summary: Chạy tự động `scripts/e2e-container.sh` (và bộ kiểm tra thường) trong CI khi có CI/CD.
  evidence: Hiện kiểm tra image production chỉ chạy khi có người gọi script; spine để CI/CD vào Deferred.
