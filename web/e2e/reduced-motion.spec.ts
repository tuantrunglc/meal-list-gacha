import { expect, test } from '@playwright/test'
import { login } from './helpers.ts'

test.use({ reducedMotion: 'reduce' })

test('giảm chuyển động: nồi đứng yên, mâm hiện đủ ngay (fade), không hiệu ứng, 🎲 không lật', async ({ page }) => {
  await login(page)
  const spin = page.getByRole('button', { name: 'Mở nồi!' })
  await expect(spin).toBeEnabled({ timeout: 15_000 })
  // nồi không "thở"; nút Quay không có transition khi nhấn
  expect(await page.locator('.gacha-pot').evaluate((el) => getComputedStyle(el).animationName)).toBe('none')
  expect(await spin.evaluate((el) => getComputedStyle(el).transitionDuration)).toBe('0s')
  // ghi lại mọi lần nồi/thẻ có class hiệu ứng (kể cả thoáng qua)
  await page.evaluate(() => {
    const w = window as unknown as { __fx: string[] }
    w.__fx = []
    new MutationObserver((ms) => {
      for (const m of ms) {
        const el = m.target as Element
        if (el.matches?.('.gacha-pot--teasing, .gacha-pot--opening, [data-rarity-burst]')) w.__fx.push(el.className.toString())
        for (const n of m.addedNodes) if (n instanceof Element && n.querySelector('[data-rarity-burst]')) w.__fx.push('burst')
      }
    }).observe(document.body, { subtree: true, childList: true, attributes: true, attributeFilter: ['class'] })
  })

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
  const before = (await first.locator('.meal-slot__name').textContent()) ?? ''
  expect(before).not.toBe('')
  const live = dialog.locator('[aria-live="polite"]')
  const said = (await live.textContent()) ?? ''
  await first.getByRole('button', { name: /^Đổi món này: / }).click()
  // đọc lại ô vừa đổi (đổi xong ngay)
  await expect(live).not.toHaveText(said)
  expect(await first.evaluate((el) => el.getAnimations({ subtree: true }).length)).toBe(0)
  await page.waitForTimeout(700)
  // suốt cả lượt: không lúc nào có nhá hàng / nắp bật / hiệu ứng
  expect(await page.evaluate(() => (window as unknown as { __fx: string[] }).__fx)).toEqual([])
})
