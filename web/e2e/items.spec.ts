import { expect, test, type APIRequestContext, type Page } from '@playwright/test'
import { foodSeed } from '../src/sets/food/seed'
import { ADMIN, API } from './env.ts'
import { login } from './helpers.ts'

type ItemRow = { id: string; seedKey: string; setKey: string; groupKey: string; household: string }

async function authToken(page: Page) {
  return page.evaluate(() => JSON.parse(localStorage.getItem('pocketbase_auth') ?? '{}').token as string)
}

async function listItems(request: APIRequestContext, token?: string) {
  const res = await request.get(`${API}/collections/items/records?perPage=500`, {
    headers: token ? { Authorization: token } : {},
  })
  return (await res.json()) as { totalItems: number; items: ItemRow[] }
}

async function apiLogin(request: APIRequestContext, collection: string, identity: string, password: string) {
  const res = await request.post(`${API}/collections/${collection}/auth-with-password`, { data: { identity, password } })
  expect(res.ok()).toBe(true)
  return ((await res.json()) as { token: string }).token
}

async function seededItems(page: Page, request: APIRequestContext) {
  await login(page)
  const token = await authToken(page)
  // chỉ đếm món seed: các test khác có thể đã thêm món tự tạo
  const seeded = async () => (await listItems(request, token)).items.filter((i) => i.seedKey !== '')
  await expect.poll(async () => (await seeded()).length, { timeout: 15_000 }).toBe(foodSeed.length)
  return { token, items: await seeded() }
}

test('vào app thì nồi có đủ đúng món mặc định, không báo lỗi, tải lại không nhân đôi', async ({ page, request }) => {
  const { token, items } = await seededItems(page, request)
  expect(items.map((i) => i.seedKey).sort()).toEqual(foodSeed.map((d) => d.seedKey).sort())
  await expect(page.getByRole('alert')).toHaveCount(0)

  await page.reload()
  await page.getByRole('heading', { name: 'Nay ăn gì cả nhà?' }).waitFor()
  await page.waitForLoadState('networkidle')
  expect((await listItems(request, token)).items.filter((i) => i.seedKey !== '')).toHaveLength(foodSeed.length)
})

test('unique index chặn trùng seedKey trong một household', async ({ page, request }) => {
  const { token, items } = await seededItems(page, request)
  const src = items[0]
  const res = await request.post(`${API}/collections/items/records`, {
    headers: { Authorization: token },
    data: { household: src.household, setKey: src.setKey, groupKey: src.groupKey, name: 'Trùng', rarity: 1, tags: [], attrs: {}, seedKey: src.seedKey, deleted: false },
  })
  expect(res.status()).toBe(400)
  expect(JSON.stringify(await res.json())).toContain('validation_not_unique')
})

test('người ngoài household không đọc/tạo được món; chủ app không xoá hẳn, không đổi household/seedKey', async ({ page, request }) => {
  const { token: ownerToken, items } = await seededItems(page, request)
  const target = items[0]

  // Dựng người dùng thứ hai ở household khác bằng quyền superuser
  const admin = await apiLogin(request, '_superusers', ADMIN.email, ADMIN.password)
  const other = { email: 'nguoi-ngoai@e2e.test', password: 'mat-khau-ngoai-123' }
  const userRes = await request.post(`${API}/collections/users/records`, {
    headers: { Authorization: admin },
    data: { ...other, passwordConfirm: other.password, verified: true },
  })
  expect(userRes.ok()).toBe(true)
  const otherUser = (await userRes.json()) as { id: string }
  const hhRes = await request.post(`${API}/collections/households/records`, {
    headers: { Authorization: admin },
    data: { name: 'Nhà hàng xóm', members: [otherUser.id] },
  })
  const otherHousehold = (await hhRes.json()) as { id: string }
  const otherToken = await apiLogin(request, 'users', other.email, other.password)

  expect((await listItems(request, otherToken)).totalItems).toBe(0)
  const view = await request.get(`${API}/collections/items/records/${target.id}`, { headers: { Authorization: otherToken } })
  expect(view.status()).toBe(404)
  const create = await request.post(`${API}/collections/items/records`, {
    headers: { Authorization: otherToken },
    data: { household: target.household, setKey: target.setKey, groupKey: target.groupKey, name: 'Lén', rarity: 1, tags: [], attrs: {}, seedKey: '', deleted: false },
  })
  expect(create.status()).toBeGreaterThanOrEqual(400)

  const patch = (data: object) =>
    request.patch(`${API}/collections/items/records/${target.id}`, { headers: { Authorization: ownerToken }, data })
  expect((await patch({ household: otherHousehold.id })).status()).toBeGreaterThanOrEqual(400)
  expect((await patch({ seedKey: 'khac' })).status()).toBeGreaterThanOrEqual(400)
  expect((await patch({ setKey: 'khac' })).status()).toBeGreaterThanOrEqual(400)
  expect((await patch({ name: 'Đổi tên được' })).ok()).toBe(true)
  const del = await request.delete(`${API}/collections/items/records/${target.id}`, { headers: { Authorization: ownerToken } })
  expect(del.status()).toBeGreaterThanOrEqual(400)
})

test('khách không thấy món nào', async ({ request }) => {
  expect((await listItems(request)).totalItems).toBe(0)
})
