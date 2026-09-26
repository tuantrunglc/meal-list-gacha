import { expect, test, type Page } from '@playwright/test'
import { API } from './env.ts'
import { login, trayReady } from './helpers.ts'

const token = (page: Page) => page.evaluate(() => JSON.parse(localStorage.getItem('pocketbase_auth') ?? '{}').token as string)

test('chốt mâm → lịch sử có mâm mới nhất với đúng tên theo thứ tự; mở chi tiết', async ({ page }) => {
  await login(page)
  await expect(page.getByRole('button', { name: 'Mở nồi!' })).toBeEnabled({ timeout: 15_000 })
  await page.getByRole('button', { name: 'Mở nồi!' }).click()
  const tray = page.getByRole('dialog')
  await expect(tray).toBeVisible()
  await trayReady(page)
  const names = await tray.locator('.meal-slot__name').allTextContents()
  await tray.getByRole('button', { name: 'Chốt mâm!' }).click()
  await expect(page.getByRole('status').filter({ hasText: 'Chốt rồi!' })).toBeVisible()

  await page.getByRole('link', { name: 'Lịch sử' }).click()
  // tìm đúng hàng của mâm vừa chốt (không giả định là hàng đầu)
  const first = page.getByRole('listitem', { name: /^Mâm / }).filter({ hasText: names.join('') }).first()
  await expect(first).toBeVisible()
  await expect(first.locator('.history-row__name')).toHaveText(names)

  await first.getByRole('button', { name: `Xem công thức ${names[0]}` }).click()
  await expect(page.getByRole('dialog', { name: `Chi tiết món ${names[0]}` })).toBeVisible()
})

test('món đã xoá vẫn hiện trong lịch sử và mở được', async ({ page }) => {
  await login(page)
  const t = await token(page)
  const hh = (await (await page.request.get(`${API}/collections/households/records`, { headers: { Authorization: t } })).json()).items[0].id
  const name = `E2E món sẽ xoá ${Date.now()}`
  const itemRes = await page.request.post(`${API}/collections/items/records`, {
    headers: { Authorization: t },
    data: { household: hh, setKey: 'food', groupKey: 'canh', name, rarity: 2, tags: ['quanh-nam'], attrs: { ingredients: ['nước'], steps: ['nấu'] }, seedKey: '', deleted: false },
  })
  expect(itemRes.ok(), await itemRes.text()).toBe(true)
  const item = (await itemRes.json()) as { id: string }
  const drawRes = await page.request.post(`${API}/collections/draws/records`, {
    headers: { Authorization: t },
    data: { household: hh, setKey: 'food', chosenAt: new Date().toISOString(), entries: [{ itemId: item.id, groupKey: 'canh', name, rarity: 2, order: 0 }] },
  })
  expect(drawRes.ok(), await drawRes.text()).toBe(true)
  const drawId = ((await drawRes.json()) as { id: string }).id
  expect((await page.request.patch(`${API}/collections/items/records/${item.id}`, { headers: { Authorization: t }, data: { deleted: true } })).ok()).toBe(true)
  try {

  await page.getByRole('link', { name: 'Lịch sử' }).click()
  const row = page.getByRole('listitem', { name: /^Mâm / }).filter({ hasText: name })
  await expect(row).toBeVisible()
  await row.getByRole('button', { name: `Xem công thức ${name}` }).click()
  const detail = page.getByRole('dialog', { name: `Chi tiết món ${name}` })
  await expect(detail.getByText('nấu')).toBeVisible()
  } finally {
    // dọn mâm thử để không ảnh hưởng tránh trùng/lịch sử của test khác
    await page.request.delete(`${API}/collections/draws/records/${drawId}`, { headers: { Authorization: t } })
  }
})

test('xoá mâm: draw mất khỏi server, hàng biến mất', async ({ page }) => {
  await login(page)
  const t = await token(page)
  const hh = (await (await page.request.get(`${API}/collections/households/records`, { headers: { Authorization: t } })).json()).items[0].id
  const name = `E2E mâm sẽ xoá ${Date.now()}`
  const drawRes = await page.request.post(`${API}/collections/draws/records`, {
    headers: { Authorization: t },
    data: { household: hh, setKey: 'food', chosenAt: new Date().toISOString(), entries: [{ itemId: 'khongconnua1234', groupKey: 'man', name, rarity: 1, order: 0 }] },
  })
  expect(drawRes.ok(), await drawRes.text()).toBe(true)
  const drawId = ((await drawRes.json()) as { id: string }).id
  try {
    await page.getByRole('link', { name: 'Lịch sử' }).click()
    const row = page.getByRole('listitem', { name: /^Mâm / }).filter({ hasText: name })
    await row.getByRole('button', { name: /^Xoá mâm/ }).click()
    await page.getByRole('alertdialog', { name: 'Xoá mâm này?' }).getByRole('button', { name: 'Xoá' }).click()
    await expect(page.getByRole('status').filter({ hasText: 'Đã xoá mâm.' })).toBeVisible()
    await expect(page.getByRole('alertdialog')).toHaveCount(0)
    await expect(row).toHaveCount(0)
    const check = await page.request.get(`${API}/collections/draws/records/${drawId}`, { headers: { Authorization: t } })
    expect(check.status()).toBe(404)
  } finally {
    // dọn nếu test hỏng trước khi xoá qua giao diện (đã xoá thì 404, bỏ qua)
    await page.request.delete(`${API}/collections/draws/records/${drawId}`, { headers: { Authorization: t } })
  }
})
