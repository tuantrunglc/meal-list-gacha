/// <reference types="vitest/config" />
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    // PocketBase chạy local ở cổng mặc định khi dev
    proxy: {
      '/api': 'http://127.0.0.1:8090',
    },
  },
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    // e2e/ do Playwright chạy
    include: ['src/**/*.test.{ts,tsx}', 'tests/**/*.test.ts'],
  },
})
