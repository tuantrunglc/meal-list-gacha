import { expect, test } from '@playwright/test'
import { login, trayReady } from './helpers.ts'

test('mở nồi ra mâm cơm 3 ô, đóng mâm', async ({ page }) => {
  await login(page)
  const spin = page.getByRole('button', { name: 'Mở nồi!' })
  await expect(spin).toBeEnabled({ timeout: 15_000 })
  await spin.click()
  await expect(page.getByRole('button', { name: 'Nồi đang sôi…' })).toBeVisible()
  const dialog = page.getByRole('dialog', { name: 'Mâm cơm' })
  await expect(dialog).toBeVisible({ timeout: 5_000 })
  // thẻ bật lần lượt (chi tiết thời gian ở unit test); cuối cùng đủ mâm và đọc một lần
  await expect(dialog.getByRole('listitem')).toHaveCount(3)
  await expect(dialog.locator('[aria-live="polite"]')).toContainText('Mâm cơm: ')
  await dialog.getByRole('button', { name: 'Để sau' }).click()
  await expect(dialog).toHaveCount(0)
})

test('chạm khi thẻ đang bật: hiện cả mâm ngay', async ({ page }) => {
  await login(page)
  const spin = page.getByRole('button', { name: 'Mở nồi!' })
  await expect(spin).toBeEnabled({ timeout: 15_000 })
  await spin.click()
  const dialog = page.getByRole('dialog', { name: 'Mâm cơm' })
  await expect(dialog).toBeVisible({ timeout: 5_000 })
  // lớp bỏ qua phủ cả màn khi đang bật: chạm vào giữa màn
  const skip = page.getByTestId('reveal-skip')
  await expect(skip).toBeAttached()
  const box = page.viewportSize()!
  await page.mouse.click(box.width / 2, box.height / 2)
  await expect(skip).toHaveCount(0)
  await expect(dialog.getByRole('listitem')).toHaveCount(3)
  await expect(dialog.getByRole('button', { name: 'Chốt mâm!' })).toBeEnabled()
  await expect(dialog).toBeVisible()
})

test('chỉnh mâm: giữ + đổi cả mâm, thêm/bỏ ô, nút ≥ 44px', async ({ page }) => {
  await login(page)
  await expect(page.getByRole('button', { name: 'Mở nồi!' })).toBeEnabled({ timeout: 15_000 })
  await page.getByRole('button', { name: 'Mở nồi!' }).click()
  const dialog = page.getByRole('dialog', { name: 'Mâm cơm' })
  await expect(dialog).toBeVisible()
  await trayReady(page)

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

test('chi tiết món: mở từ mâm, một lớp modal, chữ lớn không tràn ngang', async ({ page }) => {
  await login(page)
  await expect(page.getByRole('button', { name: 'Mở nồi!' })).toBeEnabled({ timeout: 15_000 })
  await page.getByRole('button', { name: 'Mở nồi!' }).click()
  const dialog = page.getByRole('dialog')
  await trayReady(page)
  const open = dialog.getByRole('button', { name: /^Xem công thức: / }).first()
  const name = (await open.locator('.meal-slot__name').textContent())!
  await open.click()
  await expect(page.getByRole('dialog', { name: `Chi tiết món ${name}` })).toBeVisible()
  await expect(page.getByRole('dialog')).toHaveCount(1)
  await expect(dialog.getByRole('heading', { level: 2, name })).toBeFocused()
  await expect(dialog.getByRole('heading', { name: 'Các bước' })).toBeVisible()

  // Cỡ chữ lớn nhất: phóng root font lên 200%
  await page.addStyleTag({ content: 'html { font-size: 200% !important; }' })
  const overflow = await page.evaluate(() => {
    const d = document.querySelector('[role="dialog"]') as HTMLElement
    return { doc: document.documentElement.scrollWidth - window.innerWidth, dialog: d.scrollWidth - d.clientWidth }
  })
  expect(overflow.doc).toBeLessThanOrEqual(0)
  expect(overflow.dialog).toBeLessThanOrEqual(0)

  await dialog.getByRole('button', { name: '← Về mâm' }).click()
  await expect(dialog.getByRole('button', { name: new RegExp(`^Xem công thức: .*${name}`) })).toBeFocused()
})
