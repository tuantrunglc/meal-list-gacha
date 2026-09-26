import { expect, test } from '@playwright/test'
import { login } from './helpers.ts'

test('thư viện: lưới 2 cột, lọc, tìm không dấu, mở chi tiết', async ({ page }) => {
  await login(page)
  await page.getByRole('link', { name: 'Món ăn' }).click()
  const grid = page.locator('.library__grid')
  await expect(grid.getByRole('listitem').first()).toBeVisible({ timeout: 15_000 })

  // 2 cột: hai thẻ đầu cùng hàng
  const [a, b] = await Promise.all([0, 1].map((i) => grid.getByRole('listitem').nth(i).boundingBox()))
  expect(Math.abs(a!.y - b!.y)).toBeLessThan(2)
  expect(b!.x).toBeGreaterThan(a!.x + a!.width - 1)

  await page.getByLabel('Tìm món').fill('ca kho')
  await expect(grid.getByRole('listitem')).toHaveCount(1)
  await expect(grid).toContainText('Cá kho tộ')
  await page.getByLabel('Tìm món').fill('')

  // e2e thêm món tự dọn (xoá mềm) nên thư viện đúng 51 món seed
  await expect(grid.getByRole('listitem')).toHaveCount(51)

  await page.getByRole('radio', { name: 'Canh' }).click()
  await expect(grid.getByRole('listitem')).toHaveCount(16)
  await expect(grid.locator('.group-tag')).toHaveText(Array(16).fill('Canh'))

  await page.getByLabel('Tìm món').fill('pizza')
  await expect(page.getByRole('status')).toContainText('Không thấy món này. Thêm mới luôn?')
  await page.getByLabel('Tìm món').fill('')

  const first = grid.getByRole('button').first()
  const name = (await first.locator('.dish-card__name').textContent())!
  await first.click()
  await expect(page.getByRole('dialog', { name: `Chi tiết món ${name}` })).toBeVisible()
  await expect(page.getByRole('heading', { level: 2, name })).toBeFocused()
  await page.keyboard.press('Escape')
  await expect(page.getByRole('dialog')).toHaveCount(0)
  await expect(first).toBeFocused()
})
