import { expect, test, type Page } from '@playwright/test'
import { ADMIN, API } from './env.ts'
import { login, trayReady } from './helpers.ts'

const token = (page: Page) => page.evaluate(() => JSON.parse(localStorage.getItem('pocketbase_auth') ?? '{}').token as string)

async function openTray(page: Page) {
  await expect(page.getByRole('button', { name: 'Mở nồi!' })).toBeEnabled({ timeout: 15_000 })
  await page.getByRole('button', { name: 'Mở nồi!' }).click()
  const dialog = page.getByRole('dialog')
  await expect(dialog).toBeVisible()
  await trayReady(page)
  return dialog
}

async function trayNames(page: Page) {
  return page.getByRole('dialog').locator('.meal-slot__name').allTextContents()
}

type DrawRow = { id: string; entries: { itemId: string; name: string; order: number }[] }

test('chốt mâm: đúng 1 draw, entries theo thứ tự mâm; món vừa chốt không ra lại; không sửa được draw', async ({ page, request }) => {
  // mở mâm 7 lần, mỗi lần có nồi sôi + thẻ bật lần lượt
  test.setTimeout(90_000)
  await login(page)
  const t = await token(page)
  const before = (await (await request.get(`${API}/collections/draws/records`, { headers: { Authorization: t } })).json()).totalItems as number

  await openTray(page)
  const names = await trayNames(page)
  await page.getByRole('button', { name: 'Chốt mâm!' }).click()
  await expect(page.getByRole('status')).toContainText('Chốt rồi!')
  await expect(page.getByRole('dialog')).toHaveCount(0)
  await expect(page.getByText('Mở thử đi cả nhà!')).toHaveCount(0)

  const list = await (await request.get(`${API}/collections/draws/records?sort=-created`, { headers: { Authorization: t } })).json()
  expect(list.totalItems).toBe(before + 1)
  const draw = list.items[0] as DrawRow
  expect(draw.entries.map((e) => e.name)).toEqual(names)
  expect(draw.entries.map((e) => e.order)).toEqual(names.map((_, i) => i))

  // Quay nhiều lần: không món vừa chốt nào ra lại
  for (let i = 0; i < 6; i++) {
    await openTray(page)
    const again = await trayNames(page)
    expect(again.filter((n) => names.includes(n))).toEqual([])
    await page.getByRole('button', { name: 'Để sau' }).click()
    // đã có mâm chốt: gợi ý lần đầu không quay lại
    await expect(page.getByText('Mở thử đi cả nhà!')).toHaveCount(0)
  }

  const patch = await request.patch(`${API}/collections/draws/records/${draw.id}`, {
    headers: { Authorization: t },
    data: { entries: [] },
  })
  expect(patch.status()).toBeGreaterThanOrEqual(400)
})

test('mất mạng khi chốt: giữ mâm, Thử lại tạo đúng 1 draw', async ({ page, request }) => {
  await login(page)
  const t = await token(page)
  const count = async () =>
    (await (await request.get(`${API}/collections/draws/records`, { headers: { Authorization: t } })).json()).totalItems as number
  const before = await count()

  const dialog = await openTray(page)
  const names = await trayNames(page)
  // Lần đầu: request tới server nhưng phản hồi bị mất (server đã tạo draw)
  let dropped = false
  const postedIds: string[] = []
  await page.route('**/api/collections/draws/records', async (route) => {
    if (route.request().method() === 'POST') postedIds.push(JSON.parse(route.request().postData() ?? '{}').id)
    if (route.request().method() === 'POST' && !dropped) {
      dropped = true
      await route.fetch()
      await route.abort('internetdisconnected')
      return
    }
    await route.continue()
  })
  await dialog.getByRole('button', { name: 'Chốt mâm!' }).click()
  await expect(dialog.getByRole('alert')).toContainText('Mất mạng rồi')
  expect(await trayNames(page)).toEqual(names)

  await dialog.getByRole('alert').getByRole('button', { name: 'Thử lại' }).click()
  await expect(page.getByRole('status')).toContainText('Chốt rồi!')
  expect(await count()).toBe(before + 1)
  // thử lại dùng đúng ID của lần đầu
  expect(postedIds).toHaveLength(2)
  expect(postedIds[1]).toBe(postedIds[0])
})

test('server: chosenAt lệch xa bị từ chối; người ngoài household không đọc/tạo/xoá được draw', async ({ page, request }) => {
  await login(page)
  const t = await token(page)
  const hh = (await (await request.get(`${API}/collections/households/records`, { headers: { Authorization: t } })).json()).items[0].id
  const body = (chosenAt: string) => ({
    household: hh,
    setKey: 'food',
    chosenAt,
    entries: [{ itemId: 'x', groupKey: 'man', name: 'X', rarity: 1, order: 0 }],
  })
  const far = await request.post(`${API}/collections/draws/records`, {
    headers: { Authorization: t },
    data: body('2030-01-01T00:00:00.000Z'),
  })
  expect(far.status()).toBeGreaterThanOrEqual(400)
  const ok = await request.post(`${API}/collections/draws/records`, { headers: { Authorization: t }, data: body(new Date().toISOString()) })
  expect(ok.ok(), await ok.text()).toBe(true)
  const mine = (await ok.json()) as { id: string }

  const admin = (await (await request.post(`${API}/collections/_superusers/auth-with-password`, { data: { identity: ADMIN.email, password: ADMIN.password } })).json()).token
  const other = { email: 'ngoai-draws@e2e.test', password: 'mat-khau-ngoai-123' }
  const u = await (await request.post(`${API}/collections/users/records`, { headers: { Authorization: admin }, data: { ...other, passwordConfirm: other.password, verified: true } })).json()
  await request.post(`${API}/collections/households/records`, { headers: { Authorization: admin }, data: { name: 'Hàng xóm', members: [u.id] } })
  const ot = (await (await request.post(`${API}/collections/users/auth-with-password`, { data: { identity: other.email, password: other.password } })).json()).token

  expect((await (await request.get(`${API}/collections/draws/records`, { headers: { Authorization: ot } })).json()).totalItems).toBe(0)
  expect((await request.get(`${API}/collections/draws/records/${mine.id}`, { headers: { Authorization: ot } })).status()).toBe(404)
  expect((await request.post(`${API}/collections/draws/records`, { headers: { Authorization: ot }, data: body(new Date().toISOString()) })).status()).toBeGreaterThanOrEqual(400)
  expect((await request.delete(`${API}/collections/draws/records/${mine.id}`, { headers: { Authorization: ot } })).status()).toBeGreaterThanOrEqual(400)
  // dọn bản ghi thử để không ảnh hưởng test khác
  await request.delete(`${API}/collections/draws/records/${mine.id}`, { headers: { Authorization: t } })
})
