import { expect, type Page } from '@playwright/test'
import { OWNER } from './env.ts'

export async function login(page: Page) {
  await page.goto('/')
  await page.getByLabel('Email').fill(OWNER.email)
  await page.getByLabel('Mật khẩu').fill(OWNER.password)
  await page.getByRole('button', { name: 'Vào bếp thôi!' }).click()
  await page.getByRole('navigation', { name: 'Điều hướng chính' }).waitFor()
}

/** Chờ mâm vừa mở bật đủ thẻ (mâm chỉ đọc câu "Mâm cơm: …" khi đã đủ). */
export async function trayReady(page: Page) {
  const dialog = page.getByRole('dialog', { name: 'Mâm cơm' })
  await expect(dialog.locator('[aria-live="polite"]')).toContainText('Mâm cơm: ', { timeout: 10_000 })
  // hiệu ứng bật thẻ đã dừng hẳn (đo kích thước nút không lệch vì đang co giãn)
  await page.waitForFunction(() =>
    [...document.querySelectorAll<HTMLElement>('.meal-slot')].every((el) => {
      const t = getComputedStyle(el).transform
      if (t === 'none') return true
      // spring dừng ở sai số rất nhỏ: coi như đứng yên
      const [a, b, c, d, e, f] = t.replace(/^matrix\(|\)$/g, '').split(',').map(Number)
      return Math.abs(a - 1) < 0.01 && Math.abs(d - 1) < 0.01 && Math.abs(b) < 0.01 && Math.abs(c) < 0.01 && Math.abs(e) < 0.5 && Math.abs(f) < 0.5
    }),
  )
  return dialog
}
