import { expect, test, type Page } from '@playwright/test'
import { API } from './env.ts'
import { login } from './helpers.ts'

const token = (page: Page) => page.evaluate(() => JSON.parse(localStorage.getItem('pocketbase_auth') ?? '{}').token as string)

async function getItem(page: Page, filter: string) {
  const res = await page.request.get(`${API}/collections/items/records?filter=${encodeURIComponent(filter)}`, {
    headers: { Authorization: await token(page) },
  })
  const found = (await res.json()).items[0] as { id: string; name: string; rarity: number; seedKey: string; image: string } | undefined
  if (!found) throw new Error(`Không thấy món: ${filter}`)
  return found
}

async function makePng(page: Page): Promise<Buffer> {
  const b64 = await page.evaluate(() => {
    const c = document.createElement('canvas')
    c.width = 1600
    c.height = 1200
    c.getContext('2d')!.fillRect(0, 0, 1600, 1200)
    return c.toDataURL('image/png').split(',')[1]
  })
  return Buffer.from(b64, 'base64')
}

async function openLibraryDetail(page: Page, name: string) {
  await page.getByRole('link', { name: 'Món ăn' }).click()
  await page.getByLabel('Tìm món').fill(name)
  // đúng thẻ của món này (tên có thể là chuỗi con của món khác)
  await page.locator('.library__grid').getByRole('button', { name: new RegExp(`^${name},`) }).click()
}

test('sửa món seed: đổi tên + độ hiếm, seedKey giữ nguyên; đổi ảnh rồi bỏ ảnh', async ({ page }) => {
  await login(page)
  await page.getByRole('link', { name: 'Món ăn' }).click()
  await page.locator('.library__grid li').first().waitFor({ timeout: 15_000 })
  const before = await getItem(page, 'seedKey = "canh-bi-do"')
  try {
  await openLibraryDetail(page, before.name)
  await page.getByRole('dialog').getByRole('button', { name: 'Sửa' }).click()
  let dialog = page.getByRole('dialog', { name: 'Sửa món' })
  const newName = `E2E ${before.name} kiểu nhà`
  await dialog.getByLabel('Tên món').fill(newName)
  await dialog.getByRole('radio', { name: '⭐⭐⭐ Đặc biệt' }).click()
  await dialog.getByRole('button', { name: 'Thêm ảnh món' }).click()
  await page.getByTestId('image-gallery').setInputFiles({ name: 'a.png', mimeType: 'image/png', buffer: await makePng(page) })
  await expect(dialog.locator('.image-picker__preview img')).toHaveAttribute('src', /^blob:/)
  await dialog.getByRole('button', { name: 'Lưu' }).click()
  await expect(page.getByRole('status').filter({ hasText: 'Đã lưu vào nồi!' })).toBeVisible()
  // quay lại chi tiết của món vừa sửa
  await expect(page.getByRole('dialog', { name: `Chi tiết món ${newName}` })).toBeVisible()

  const after = await getItem(page, `id = "${before.id}"`)
  expect(after).toMatchObject({ name: newName, rarity: 3, seedKey: 'canh-bi-do' })
  expect(after.image).not.toBe('')

  // bỏ ảnh
  await page.getByRole('dialog').getByRole('button', { name: 'Sửa' }).click()
  dialog = page.getByRole('dialog', { name: 'Sửa món' })
  await dialog.getByRole('button', { name: 'Đổi ảnh món' }).click()
  await dialog.getByRole('button', { name: 'Bỏ ảnh' }).click()
  await dialog.getByRole('button', { name: 'Lưu' }).click()
  await expect(page.getByRole('dialog', { name: `Chi tiết món ${newName}` })).toBeVisible()
  expect((await getItem(page, `id = "${before.id}"`)).image).toBe('')

  } finally {
    // trả lại như cũ cho các test khác, kể cả khi test hỏng giữa chừng
    const res = await page.request.patch(`${API}/collections/items/records/${before.id}`, {
      headers: { Authorization: await token(page) },
      data: { name: before.name, rarity: before.rarity, image: null },
    })
    expect(res.ok()).toBe(true)
  }
})
