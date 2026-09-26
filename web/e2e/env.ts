// Hằng số dùng chung giữa playwright.config.ts và các spec.
// Mặc định: PocketBase riêng cho e2e (cổng 8097) + vite preview.
// E2E_BASE_URL: chạy trên một container dựng riêng cho e2e (scripts/e2e-container.sh),
// web và API cùng một origin. E2E tạo/xoá dữ liệu nên chỉ cho phép địa chỉ máy mình,
// trừ khi đặt E2E_ALLOW_REMOTE=1.
export const PB_PORT = 8097

const remote = process.env.E2E_BASE_URL?.trim().replace(/\/+$/, '') || undefined
if (remote && !/^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(remote) && process.env.E2E_ALLOW_REMOTE !== '1') {
  throw new Error(`E2E_BASE_URL=${remote} không phải máy mình: e2e sẽ ghi dữ liệu. Đặt E2E_ALLOW_REMOTE=1 nếu chắc chắn.`)
}

export const REMOTE = remote !== undefined
export const BASE_URL = remote ?? 'http://localhost:4173'
export const API = remote ? `${remote}/api` : `http://127.0.0.1:${PB_PORT}/api`
export const OWNER = { email: 'chu-app@e2e.test', password: 'mat-khau-e2e-123' }
export const ADMIN = { email: 'admin@e2e.test', password: 'mat-khau-admin-123' }
