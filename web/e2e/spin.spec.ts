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

test('chỉnh mâm: giữ + đổi cả mâm, thêm/bỏ ô, nút ≥ 44px', async ({ page }) => {
  await login(page)
  await expect(page.getByRole('button', { name: 'Mở nồi!' })).toBeEnabled({ timeout: 15_000 })
  await page.getByRole('button', { name: 'Mở nồi!' }).click()
  const dialog = page.getByRole('dialog', { name: 'Mâm cơm' })
  await expect(dialog).toBeVisible()

  const lock = dialog.getByRole('button', { name: /: Không giữ$/ }).first()
  const label = (await lock.getAttribute('aria-label'))!
  const name = label.replace(': Không giữ', '')
  await lock.click()
  await expect(dialog.getByRole('button', { name: `${name}: Đang giữ` })).toBeVisible()
  for (let i = 0; i < 3; i++) await dialog.getByRole('button', { name: 'Đổi cả mâm' }).click()
  await expect(dialog.getByText(name, { exact: true })).toBeVisible()

  const expectTargets = async () => {
    for (const btn of await dialog.getByRole('button').all()) {
      const box = await btn.boundingBox()
      expect(box!.height).toBeGreaterThanOrEqual(44)
      expect(box!.width).toBeGreaterThanOrEqual(44)
    }
  }
  await expectTargets()

  await dialog.getByRole('button', { name: '＋ Thêm món' }).click()
  // bộ chọn nhóm đang mở: đo cả nút nhóm và "Thôi"
  await expectTargets()
  await dialog.getByRole('group', { name: 'Thêm món nhóm nào?' }).getByRole('button', { name: 'Canh' }).click()
  await expect(dialog.getByRole('listitem')).toHaveCount(4)
  // có ô thêm: đo cả nút ✕
  await expectTargets()
  await dialog.getByRole('button', { name: /^Bỏ ô Canh/ }).click()
  await expect(dialog.getByRole('listitem')).toHaveCount(3)
})
