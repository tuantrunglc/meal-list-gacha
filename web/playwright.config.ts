import { defineConfig } from '@playwright/test'

// Smoke test chạy bản build thật (index.html → main.tsx) qua vite preview.
export default defineConfig({
  testDir: './e2e',
  use: {
    baseURL: 'http://localhost:4173',
    viewport: { width: 390, height: 844 },
    // dùng Chrome cài sẵn trên máy, không cần tải browser của Playwright
    channel: 'chrome',
  },
  webServer: {
    command: 'npm run build && npx vite preview --port 4173 --strictPort',
    url: 'http://localhost:4173',
    reuseExistingServer: false,
  },
})
