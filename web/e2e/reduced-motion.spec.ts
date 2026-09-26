import { expect, test } from '@playwright/test'
import { login } from './helpers.ts'

test.use({ reducedMotion: 'reduce' })

test('giảm chuyển động: nồi đứng yên, mâm hiện đủ ngay (fade), không hiệu ứng, 🎲 không lật', async ({ page }) => {
  await login(page)
  const spin = page.getByRole('button', { name: 'Mở nồi!' })
  await expect(spin).toBeEnabled({ timeout: 15_000 })
  // nồi không "thở"
  expect(await page.locator('.gacha-pot').evaluate((el) => getComputedStyle(el).animationName)).toBe('none')

  await spin.click()
  const dialog = page.getByRole('dialog', { name: 'Mâm cơm' })
  // ~0,3s: mâm hiện đủ một lần, không lớp bỏ qua, không nhá hàng / hiệu ứng
  await expect(dialog.getByRole('listitem')).toHaveCount(3, { timeout: 1_500 })
  await expect(page.getByTestId('reveal-skip')).toHaveCount(0)
  await expect(page.locator('.gacha-pot--teasing, .gacha-pot--opening')).toHaveCount(0)
  await expect(page.locator('[data-rarity-burst]')).toHaveCount(0)
  await expect(dialog.locator('[aria-live="polite"]')).toContainText('Mâm cơm: ')
  // mâm hiện bằng fade (không trượt)
  expect(await page.locator('.tray-dialog').evaluate((el) => getComputedStyle(el).animationName)).toBe('tray-fade')

  // 🎲: đổi ngay, không có animation nào chạy trên ô
  const first = dialog.getByRole('listitem').first()
  const before = await first.locator('.meal-slot__name').textContent()
  await first.getByRole('button', { name: /^Đổi món này: / }).click()
  await expect(first.locator('.meal-slot__name')).not.toHaveText(before!)
  expect(await first.evaluate((el) => el.getAnimations().length)).toBe(0)
  await expect(page.locator('[data-rarity-burst]')).toHaveCount(0)
})
