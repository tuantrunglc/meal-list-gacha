import { defineConfig } from '@playwright/test'
import { ADMIN, BASE_URL, OWNER, PB_PORT, REMOTE } from './e2e/env.ts'

// E2E chạy bản build thật (vite preview) với PocketBase thật trên thư mục dữ liệu tạm, cổng riêng.
const PB_DIR = './e2e/.pb_data'

export default defineConfig({
  testDir: './e2e',
  workers: 1,
  // CI: chạy lại 1 lần test chập chờn, ghi trace lần chạy lại để soi (web/test-results được tải lên khi lỗi)
  retries: process.env.CI ? 1 : 0,
  use: {
    baseURL: BASE_URL,
    trace: 'on-first-retry',
    viewport: { width: 390, height: 844 },
    // dùng Chrome cài sẵn trên máy, không cần tải browser của Playwright
    channel: 'chrome',
  },
  // Có E2E_BASE_URL thì chạy trên bản đã deploy, không tự dựng server
  webServer: REMOTE ? [] : [
    {
      command: `rm -rf ${PB_DIR} && ../scripts/get-pocketbase.sh >/dev/null && ../.tools/pocketbase superuser upsert ${ADMIN.email} ${ADMIN.password} --dir ${PB_DIR} --migrationsDir ../server/pb_migrations && ../.tools/pocketbase serve --http 127.0.0.1:${PB_PORT} --dir ${PB_DIR} --migrationsDir ../server/pb_migrations --hooksDir ../server/pb_hooks --hooksWatch=false`,
      url: `http://127.0.0.1:${PB_PORT}/api/health`,
      reuseExistingServer: false,
      env: { NOI_OWNER_EMAIL: OWNER.email, NOI_OWNER_PASSWORD: OWNER.password, NOI_HOUSEHOLD_NAME: 'Nhà e2e' },
    },
    {
      command: 'npm run build && npx vite preview --port 4173 --strictPort',
      url: 'http://localhost:4173',
      reuseExistingServer: false,
      env: { PB_URL: `http://127.0.0.1:${PB_PORT}` },
    },
  ],
})
