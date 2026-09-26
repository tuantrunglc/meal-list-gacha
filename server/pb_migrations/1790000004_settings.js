/// <reference path="../pb_data/types.d.ts" />

// Cấu hình vận hành (AD-10, AD-11): backup định kỳ tích hợp, tin header của reverse proxy.
migrate(
  (app) => {
    const settings = app.settings()
    settings.meta.appName = 'Nồi Thần'
    // Backup lúc 3 giờ sáng giờ Việt Nam mỗi ngày (cron của PocketBase tính theo UTC: 20:00 UTC),
    // giữ 7 bản (nằm trong pb_data/backups)
    settings.backups.cron = '0 20 * * *'
    settings.backups.cronMaxKeep = 7
    // Đứng sau một reverse proxy (Caddy/nginx): proxy nối IP thật vào cuối X-Forwarded-For,
    // phần đầu do client tự gửi được nên lấy IP bên phải
    settings.trustedProxy.headers = ['X-Forwarded-For']
    settings.trustedProxy.useLeftmostIP = false
    app.save(settings)
  },
  (app) => {
    const settings = app.settings()
    // Về mặc định của PocketBase
    settings.meta.appName = 'Acme'
    settings.backups.cron = ''
    settings.backups.cronMaxKeep = 3
    settings.trustedProxy.headers = []
    settings.trustedProxy.useLeftmostIP = false
    app.save(settings)
  },
)
