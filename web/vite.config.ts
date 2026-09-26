/// <reference types="vitest/config" />
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// PocketBase chạy local khi dev (npm run pb); e2e dùng cổng riêng qua PB_URL
const proxy = { '/api': process.env.PB_URL ?? 'http://127.0.0.1:8090' }

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: { proxy },
  preview: { proxy },
  test: {
    environment: 'jsdom',
    // logic ngày lịch theo giờ máy: cố định múi giờ cho test ổn định
    env: { TZ: 'Asia/Ho_Chi_Minh' },
    setupFiles: ['./src/test/setup.ts'],
    // e2e/ do Playwright chạy
    include: ['src/**/*.test.{ts,tsx}', 'tests/**/*.test.ts'],
  },
})
