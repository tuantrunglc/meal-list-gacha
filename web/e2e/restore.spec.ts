import { expect, test, type Page } from '@playwright/test'
import { API } from './env.ts'
import { login } from './helpers.ts'

const token = (page: Page) => page.evaluate(() => JSON.parse(localStorage.getItem('pocketbase_auth') ?? '{}').token as string)
// PNG 1×1 hợp lệ
const PNG = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==', 'base64')

type Rec = { id: string; name: string; seedKey: string; deleted: boolean; image: string; attrs: unknown; rarity: number }

test('khôi phục món mặc định: món seed bị xoá/sửa/đổi ảnh về như cũ; món tự thêm giữ nguyên; thư viện đủ món gốc', async ({ page }) => {
  await login(page)
  const t = await token(page)
  const auth = { Authorization: t }
  const list = async (filter: string) =>
    ((await (await page.request.get(`${API}/collections/items/records?perPage=500&filter=${encodeURIComponent(filter)}`, { headers: auth })).json()) as { items: Rec[] }).items
  // chờ màn Quay nạp xong seed
  await expect(page.getByRole('button', { name: 'Mở nồi!' })).toBeEnabled({ timeout: 15_000 })
  const seeds = (await list('setKey="food" && seedKey!=""')).sort((a, b) => a.seedKey.localeCompare(b.seedKey))
  expect(seeds.length).toBeGreaterThanOrEqual(2)
  const [a, b] = seeds
  const hh = (await (await page.request.get(`${API}/collections/households/records`, { headers: auth })).json()).items[0].id
  const mineName = `E2E món nhà đã xoá ${Date.now()}`
  const mineRes = await page.request.post(`${API}/collections/items/records`, {
    headers: auth,
    data: { household: hh, setKey: 'food', groupKey: 'rau', name: mineName, rarity: 1, tags: ['quanh-nam'], attrs: { ingredients: [], steps: [] }, seedKey: '', deleted: true },
  })
  expect(mineRes.ok(), await mineRes.text()).toBe(true)
  const mine = (await mineRes.json()) as Rec

  try {
    // món a: sửa tên + công thức + ảnh upload; món b: xoá mềm
    const edit = await page.request.patch(`${API}/collections/items/records/${a.id}`, {
      headers: auth,
      multipart: { name: `${a.name} hỏng`, attrs: JSON.stringify({ ingredients: ['lạ'], steps: [] }), image: { name: 'x.png', mimeType: 'image/png', buffer: PNG } },
    })
    expect(edit.ok(), await edit.text()).toBe(true)
    expect(((await edit.json()) as Rec).image).not.toBe('')
    expect((await page.request.patch(`${API}/collections/items/records/${b.id}`, { headers: auth, data: { deleted: true } })).ok()).toBe(true)

    await page.getByRole('link', { name: 'Mở cài đặt' }).click()
    await page.getByRole('button', { name: 'Khôi phục món mặc định' }).click()
    const dialog = page.getByRole('alertdialog', { name: 'Khôi phục món mặc định?' })
    await dialog.getByRole('button', { name: 'Khôi phục' }).click()
    await expect(page.getByRole('status').filter({ hasText: 'Nồi đủ món gốc rồi nè!' })).toBeVisible()
    await expect(dialog).toHaveCount(0)

    const after = new Map((await list('setKey="food"')).map((r) => [r.id, r]))
    expect(after.get(a.id)).toMatchObject({ name: a.name, attrs: a.attrs, deleted: false, image: '' })
    expect(after.get(b.id)).toMatchObject({ name: b.name, deleted: false })
    // món tự thêm (đang xoá) không bị hồi sinh
    expect(after.get(mine.id)).toMatchObject({ name: mineName, deleted: true })

    await page.getByRole('link', { name: 'Món ăn' }).click()
    const grid = page.locator('.library__grid')
    await expect(grid.getByRole('button', { name: new RegExp(`^${a.name},`) })).toHaveCount(1)
    await expect(grid.getByRole('button', { name: new RegExp(`^${b.name},`) })).toHaveCount(1)
  } finally {
    // món tự thêm vốn đã xoá mềm (không xoá hẳn được — AD-4); món seed trả về như cũ dù test lỗi giữa chừng
    await page.request.patch(`${API}/collections/items/records/${mine.id}`, { headers: auth, data: { deleted: true } })
    for (const r of [a, b]) {
      await page.request.patch(`${API}/collections/items/records/${r.id}`, { headers: auth, data: { name: r.name, attrs: r.attrs, deleted: false, image: null } })
    }
  }
})
