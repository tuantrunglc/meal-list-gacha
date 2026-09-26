import { expect, test, type Page } from '@playwright/test'
import { API } from './env.ts'
import { login } from './helpers.ts'

// Dọn món tự tạo (xoá mềm) để test khác vẫn thấy đúng bộ món seed
async function softDeleteCustom(page: Page) {
  const token = await page.evaluate(() => JSON.parse(localStorage.getItem('pocketbase_auth') ?? '{}').token as string)
  if (!token) return
  const list = await (await page.request.get(`${API}/collections/items/records?perPage=500&filter=${encodeURIComponent("seedKey = '' && deleted = false")}`, { headers: { Authorization: token } })).json()
  for (const it of list.items as { id: string }[]) {
    await page.request.patch(`${API}/collections/items/records/${it.id}`, { headers: { Authorization: token }, data: { deleted: true } })
  }
}

test.afterEach(async ({ page }) => softDeleteCustom(page))

test('thêm món: validate, lưu thật, toast, món mới đầu lưới, chi tiết đúng dữ liệu', async ({ page }) => {
  await login(page)
  await page.getByRole('link', { name: 'Món ăn' }).click()
  await page.locator('.library__grid li').first().waitFor({ timeout: 15_000 })
  await page.getByRole('button', { name: 'Thêm món' }).click()
  const dialog = page.getByRole('dialog', { name: 'Thêm món' })
  await expect(dialog).toBeVisible()

  await dialog.getByRole('button', { name: 'Lưu' }).click()
  await expect(dialog.getByText('Món này tên gì nè?')).toBeVisible()

  const name = `Thịt kho trứng kiểu mẹ ${Date.now()}`
  await dialog.getByLabel('Tên món').fill(name)
  await dialog.getByRole('radio', { name: 'Mặn' }).click()
  await dialog.getByRole('radio', { name: '⭐⭐⭐ Đặc biệt' }).click()
  await dialog.getByLabel('Nguyên liệu 1', { exact: true }).fill('thịt ba chỉ')
  await dialog.getByRole('button', { name: '＋ Thêm nguyên liệu' }).click()
  await dialog.getByLabel('Nguyên liệu 2', { exact: true }).fill('trứng vịt')
  await dialog.getByLabel('Bước 1', { exact: true }).fill('Luộc trứng')
  await dialog.getByRole('button', { name: 'Lưu' }).click()

  await expect(page.getByRole('status').filter({ hasText: 'Đã lưu vào nồi!' })).toBeVisible()
  await expect(dialog).toHaveCount(0)
  await expect(page.locator('.library__grid li').first()).toContainText(name)

  await expect(page.locator('.library__grid li').first()).toContainText('Đặc biệt')
  // mở chi tiết thấy công thức vừa nhập
  await page.locator('.library__grid li').first().getByRole('button').click()
  const detail = page.getByRole('dialog')
  await expect(detail.getByText('trứng vịt')).toBeVisible()
  await expect(detail.getByText('Luộc trứng')).toBeVisible()
  await expect(detail.locator('ul li')).toHaveCount(2)
})

test('tìm không thấy → Thêm mới luôn? điền sẵn tên; sửa rồi rời thì hỏi Bỏ thay đổi?', async ({ page }) => {
  await login(page)
  await page.getByRole('link', { name: 'Món ăn' }).click()
  await page.locator('.library__grid li').first().waitFor({ timeout: 15_000 })
  await page.getByLabel('Tìm món').fill('pizza hải sản')
  await page.getByRole('status').getByRole('button', { name: /Thêm món/ }).click()
  const dialog = page.getByRole('dialog', { name: 'Thêm món' })
  await expect(dialog.getByLabel('Tên món')).toHaveValue('pizza hải sản')
  // tên điền sẵn là giá trị ban đầu: phải sửa gì đó mới tính là "đã thay đổi"
  await dialog.getByLabel('Tên món').fill('pizza hải sản nhà làm')
  await page.keyboard.press('Escape')
  await expect(page.getByRole('alertdialog', { name: 'Bỏ thay đổi?' })).toBeVisible()
  await page.getByRole('button', { name: 'Ở lại' }).click()
  await expect(dialog.getByLabel('Tên món')).toHaveValue('pizza hải sản nhà làm')
  await dialog.getByRole('button', { name: 'Thôi' }).click()
  await page.getByRole('button', { name: 'Bỏ', exact: true }).click()
  await expect(page.getByRole('dialog')).toHaveCount(0)
})
