import { expect, test, type Page } from '@playwright/test'
import { API } from './env.ts'
import { login } from './helpers.ts'

const token = (page: Page) => page.evaluate(() => JSON.parse(localStorage.getItem('pocketbase_auth') ?? '{}').token as string)

/** Tạo một món tự thêm qua API để xoá (không đụng món seed). */
async function makeItem(page: Page, name: string) {
  const t = await token(page)
  const hh = (await (await page.request.get(`${API}/collections/households/records`, { headers: { Authorization: t } })).json()).items[0].id
  const res = await page.request.post(`${API}/collections/items/records`, {
    headers: { Authorization: t },
    data: { household: hh, setKey: 'food', groupKey: 'rau', name, rarity: 1, tags: ['quanh-nam'], attrs: { ingredients: [], steps: [] }, seedKey: '', deleted: false },
  })
  expect(res.ok()).toBe(true)
  return (await res.json()) as { id: string }
}

async function isDeleted(page: Page, id: string) {
  const r = await page.request.get(`${API}/collections/items/records/${id}`, { headers: { Authorization: await token(page) } })
  return ((await r.json()) as { deleted: boolean }).deleted
}

test('xoá từ chi tiết: xoá mềm, biến mất khỏi lưới, toast', async ({ page }) => {
  await login(page)
  const name = `E2E xoá ${Date.now()}`
  const { id } = await makeItem(page, name)
  await page.getByRole('link', { name: 'Món ăn' }).click()
  await page.getByLabel('Tìm món').fill(name)
  await page.locator('.library__grid').getByRole('button', { name: new RegExp(`^${name},`) }).click()
  await page.getByRole('dialog').getByRole('button', { name: 'Xoá' }).click()
  const confirm = page.getByRole('alertdialog', { name: `Xoá món ${name}?` })
  await confirm.getByRole('button', { name: 'Xoá' }).click()
  await expect(page.getByRole('status').filter({ hasText: 'Đã bỏ món khỏi nồi.' })).toBeVisible()
  // bỏ ô tìm: lưới đầy đủ vẫn không còn thẻ món này
  await page.getByLabel('Tìm món').fill('')
  await expect(page.locator('.library__grid li').first()).toBeVisible()
  await expect(page.locator('.library__grid').getByRole('button', { name: new RegExp(`^${name},`) })).toHaveCount(0)
  expect(await isDeleted(page, id)).toBe(true)
})

test('vuốt thẻ sang trái mở xác nhận; Thôi thì không xoá', async ({ page }) => {
  await login(page)
  const name = `E2E vuốt ${Date.now()}`
  const { id } = await makeItem(page, name)
  try {
  await page.getByRole('link', { name: 'Món ăn' }).click()
  await page.getByLabel('Tìm món').fill(name)
  const card = page.locator('.library__grid').getByRole('button', { name: new RegExp(`^${name},`) })
  const box = (await card.boundingBox())!
  const y = box.y + box.height / 2
  await page.mouse.move(box.x + box.width - 10, y)
  await page.mouse.down()
  await page.mouse.move(box.x + box.width - 60, y, { steps: 5 })
  await page.mouse.move(box.x + box.width - 130, y, { steps: 5 })
  await page.mouse.up()
  const confirm = page.getByRole('alertdialog', { name: `Xoá món ${name}?` })
  await expect(confirm).toBeVisible()
  await confirm.getByRole('button', { name: 'Thôi' }).click()
  await expect(page.getByRole('dialog')).toHaveCount(0)
  expect(await isDeleted(page, id)).toBe(false)
  } finally {
    // dọn, kể cả khi test hỏng giữa chừng
    const res = await page.request.patch(`${API}/collections/items/records/${id}`, { headers: { Authorization: await token(page) }, data: { deleted: true } })
    expect(res.ok()).toBe(true)
  }
})
