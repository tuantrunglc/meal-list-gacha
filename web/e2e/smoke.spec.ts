import { expect, test } from '@playwright/test'
import { login } from './helpers.ts'

test('đăng nhập rồi thấy màn Quay và thanh tab', async ({ page }) => {
  await login(page)
  await expect(page.getByRole('heading', { name: 'Nay ăn gì cả nhà?' })).toBeVisible()
  await expect(page.getByRole('link', { name: 'Quay' })).toHaveAttribute('aria-current', 'page')
})

test('đổi tab sang Món ăn', async ({ page }) => {
  await login(page)
  await page.getByRole('link', { name: 'Món ăn' }).click()
  await expect(page).toHaveURL(/\/mon-an$/)
  await expect(page.getByRole('heading', { name: 'Sổ món của nhà' })).toBeVisible()
  await expect(page.getByRole('link', { name: 'Món ăn' })).toHaveAttribute('aria-current', 'page')
})
