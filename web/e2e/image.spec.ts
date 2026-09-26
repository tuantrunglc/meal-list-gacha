import { expect, test, type Page } from '@playwright/test'
import { API } from './env.ts'
import { login } from './helpers.ts'

const token = (page: Page) => page.evaluate(() => JSON.parse(localStorage.getItem('pocketbase_auth') ?? '{}').token as string)

/** Tạo một ảnh PNG thật bằng canvas trong trình duyệt. */
async function makePng(page: Page, w: number, h: number): Promise<Buffer> {
  const b64 = await page.evaluate(
    ([w, h]) => {
      const c = document.createElement('canvas')
      c.width = w
      c.height = h
      const ctx = c.getContext('2d')!
      ctx.fillStyle = '#c8693f'
      ctx.fillRect(0, 0, w, h)
      ctx.fillStyle = '#f2b531'
      ctx.fillRect(w / 4, h / 4, w / 2, h / 2)
      return c.toDataURL('image/png').split(',')[1]
    },
    [w, h],
  )
  return Buffer.from(b64, 'base64')
}

async function openEditor(page: Page) {
  await login(page)
  await page.getByRole('link', { name: 'Món ăn' }).click()
  await page.locator('.library__grid li').first().waitFor({ timeout: 15_000 })
  await page.getByRole('button', { name: 'Thêm món' }).click()
  return page.getByRole('dialog', { name: 'Thêm món' })
}

test.afterEach(async ({ page }) => {
  const t = await token(page)
  if (!t) return
  const list = await (await page.request.get(`${API}/collections/items/records?perPage=500&filter=${encodeURIComponent("seedKey = '' && deleted = false && name ~ 'E2E'")}`, { headers: { Authorization: t } })).json()
  for (const it of list.items as { id: string }[]) {
    await page.request.patch(`${API}/collections/items/records/${it.id}`, { headers: { Authorization: t }, data: { deleted: true } })
  }
})

test('ảnh món: cắt 4:3, cạnh dài ≤ 1200, nén, lưu, lưới dùng thumb có token', async ({ page }) => {
  const dialog = await openEditor(page)
  await dialog.getByRole('button', { name: 'Thêm ảnh món' }).click()
  await page.getByTestId('image-gallery').setInputFiles({ name: 'mon.png', mimeType: 'image/png', buffer: await makePng(page, 4000, 2000) })
  const preview = dialog.locator('.image-picker__preview img')
  await expect(preview).toHaveAttribute('src', /^blob:/)
  const dims = await preview.evaluate((img: HTMLImageElement) => img.decode().then(() => [img.naturalWidth, img.naturalHeight]))
  expect(dims).toEqual([1200, 900])

  const name = `E2E món có ảnh ${Date.now()}`
  await dialog.getByLabel('Tên món').fill(name)
  await dialog.getByRole('radio', { name: 'Rau' }).click()
  await dialog.getByRole('button', { name: 'Lưu' }).click()
  await expect(dialog).toHaveCount(0)

  const t = await token(page)
  const rec = (await (await page.request.get(`${API}/collections/items/records?filter=${encodeURIComponent(`name = "${name}"`)}`, { headers: { Authorization: t } })).json()).items[0]
  expect(rec.image).toMatch(/\.(webp|jpg)$/)
  // ảnh protected: không token thì không tải được
  const noToken = await page.request.get(`${API}/files/${rec.collectionId}/${rec.id}/${rec.image}`)
  expect(noToken.status()).toBeGreaterThanOrEqual(400)

  // lưới hiện thumb 400x300 có token, tải được
  const card = page.locator('.library__grid li').first()
  await expect(card).toContainText(name)
  const img = card.locator('img')
  await expect(img).toHaveAttribute('src', /thumb=400x300.*token=|token=.*thumb=400x300/)
  const ok = await img.evaluate((el: HTMLImageElement) => el.decode().then(() => el.naturalWidth > 0))
  expect(ok).toBe(true)

  // chi tiết dùng ảnh gốc (không thumb), có token, đúng 1200×900
  await card.getByRole('button').click()
  const full = page.getByRole('dialog').locator('.item-detail__image img')
  await expect(full).toHaveAttribute('src', /token=/)
  await expect(full).not.toHaveAttribute('src', /thumb=/)
  const fullDims = await full.evaluate((el: HTMLImageElement) => el.decode().then(() => [el.naturalWidth, el.naturalHeight]))
  expect(fullDims).toEqual([1200, 900])
})

test('file hỏng thì báo lỗi thân thiện, form giữ nguyên', async ({ page }) => {
  const dialog = await openEditor(page)
  await dialog.getByLabel('Tên món').fill('E2E giữ tên này')
  await dialog.getByRole('button', { name: 'Thêm ảnh món' }).click()
  await page.getByTestId('image-gallery').setInputFiles({ name: 'hong.jpg', mimeType: 'image/jpeg', buffer: Buffer.from('không phải ảnh') })
  await expect(dialog.getByRole('alert')).toHaveText('Ảnh này khó chịu quá, thử tấm khác nhé')
  await expect(dialog.getByLabel('Tên món')).toHaveValue('E2E giữ tên này')
})
