import { expect, test } from '@playwright/test'
import { login } from './helpers.ts'

test('mở nồi ra mâm cơm 3 ô, đóng mâm', async ({ page }) => {
  await login(page)
  const spin = page.getByRole('button', { name: 'Mở nồi!' })
  await expect(spin).toBeEnabled({ timeout: 15_000 })
  await spin.click()
  await expect(page.getByRole('button', { name: 'Nồi đang sôi…' })).toBeVisible()
  const dialog = page.getByRole('dialog', { name: 'Mâm cơm' })
  await expect(dialog).toBeVisible({ timeout: 5_000 })
  await expect(dialog.getByRole('listitem')).toHaveCount(3)
  await expect(page.locator('[aria-live="polite"]')).toContainText('Mâm cơm: ')
  await dialog.getByRole('button', { name: 'Để sau' }).click()
  await expect(dialog).toHaveCount(0)
})
