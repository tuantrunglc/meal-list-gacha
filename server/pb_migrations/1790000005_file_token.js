/// <reference path="../pb_data/types.d.ts" />

// File token xem ảnh protected: 12 giờ (mặc định ~3 phút). URL ảnh chứa token, token đổi
// là mọi ảnh phải tải lại; token dài hạn giữ cache trình duyệt trong suốt bữa ăn.
migrate(
  (app) => {
    const users = app.findCollectionByNameOrId('users')
    users.fileToken.duration = 12 * 60 * 60
    app.save(users)
  },
  (app) => {
    const users = app.findCollectionByNameOrId('users')
    users.fileToken.duration = 180
    app.save(users)
  },
)
