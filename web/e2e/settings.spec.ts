import { expect, test, type Page } from '@playwright/test'
import { ADMIN, API } from './env.ts'
import { login } from './helpers.ts'

const token = (page: Page) => page.evaluate(() => JSON.parse(localStorage.getItem('pocketbase_auth') ?? '{}').token as string)

async function configs(page: Page, t: string) {
  const res = await page.request.get(`${API}/collections/set_configs/records?filter=${encodeURIComponent('setKey="food"')}`, {
    headers: { Authorization: t },
  })
  expect(res.ok(), await res.text()).toBe(true)
  return ((await res.json()) as { items: { id: string; cooldownDays: number }[] }).items
}

async function clearConfigs(page: Page, t: string) {
  for (const c of await configs(page, t)) {
    const res = await page.request.delete(`${API}/collections/set_configs/records/${c.id}`, { headers: { Authorization: t } })
    expect(res.ok(), await res.text()).toBe(true)
  }
}

test('đổi số ngày tránh trùng: lần đầu tạo, lần sau cập nhật đúng một bản ghi; tải lại vẫn giữ', async ({ page }) => {
  await login(page)
  const t = await token(page)
  // bắt đầu từ trạng thái chưa cấu hình (lần chạy trước có thể để sót)
  await clearConfigs(page, t)
  try {
    await page.getByRole('link', { name: 'Mở cài đặt' }).click()
    await expect(page).toHaveURL(/\/cai-dat$/)
    await expect(page.getByText('3 ngày', { exact: true })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Lưu' })).toBeDisabled()

    await page.getByRole('button', { name: 'Thêm một ngày' }).click()
    await page.getByRole('button', { name: 'Lưu' }).click()
    await expect(page.getByRole('status').filter({ hasText: 'Đã lưu.' })).toBeVisible()
    await expect.poll(async () => (await configs(page, t)).map((c) => c.cooldownDays)).toEqual([4])

    for (let i = 0; i < 4; i++) await page.getByRole('button', { name: 'Bớt một ngày' }).click()
    await expect(page.getByText('Không tránh trùng', { exact: false })).toBeVisible()
    await page.getByRole('button', { name: 'Lưu' }).click()
    await expect.poll(async () => (await configs(page, t)).map((c) => c.cooldownDays)).toEqual([0])

    await page.reload()
    await expect(page.getByText('0 ngày', { exact: true })).toBeVisible()
    await page.getByRole('link', { name: '← Về màn Quay' }).click()
    await expect(page.getByRole('button', { name: 'Mở nồi!' })).toBeEnabled({ timeout: 15_000 })
  } finally {
    // trả lại mặc định cho các test tránh trùng khác
    await clearConfigs(page, t)
  }
})

test('âm thanh: mặc định tắt, bật rồi tải lại vẫn bật (chỉ trên máy này)', async ({ page }) => {
  await login(page)
  await page.goto('/cai-dat')
  const sw = page.getByRole('switch', { name: 'Âm thanh khi mở nồi' })
  await expect(sw).toHaveAttribute('aria-checked', 'false')
  await sw.click()
  await expect(sw).toHaveAttribute('aria-checked', 'true')
  await page.reload()
  await expect(page.getByRole('switch', { name: 'Âm thanh khi mở nồi' })).toHaveAttribute('aria-checked', 'true')
})

test('server: trùng (household, Bộ) báo validation_not_unique; giới hạn 0..30; không đổi household/setKey; người ngoài không đụng được', async ({ page, request }) => {
  await login(page)
  const t = await token(page)
  await clearConfigs(page, t)
  const hh = (await (await request.get(`${API}/collections/households/records`, { headers: { Authorization: t } })).json()).items[0].id
  const post = (auth: string, data: Record<string, unknown>) =>
    request.post(`${API}/collections/set_configs/records`, { headers: { Authorization: auth }, data })
  try {
    const first = await post(t, { household: hh, setKey: 'food', cooldownDays: 2 })
    expect(first.ok(), await first.text()).toBe(true)
    const mine = (await first.json()) as { id: string }

    // máy thứ hai tạo cùng lúc: đúng dạng lỗi mà client coi là "đã có" (isConflict)
    const dup = await post(t, { household: hh, setKey: 'food', cooldownDays: 5 })
    expect(dup.status()).toBe(400)
    expect(JSON.stringify((await dup.json()).data)).toContain('validation_not_unique')

    const patch = (auth: string, data: Record<string, unknown>) =>
      request.patch(`${API}/collections/set_configs/records/${mine.id}`, { headers: { Authorization: auth }, data })
    expect((await patch(t, { cooldownDays: 31 })).status()).toBe(400)
    expect((await patch(t, { cooldownDays: -1 })).status()).toBe(400)
    expect((await patch(t, { cooldownDays: 1.5 })).status()).toBe(400)
    expect((await patch(t, { setKey: 'khac' })).status()).toBeGreaterThanOrEqual(400)
    expect((await patch(t, { household: 'khongcoho12345' })).status()).toBeGreaterThanOrEqual(400)
    expect((await patch(t, { cooldownDays: 0 })).ok()).toBe(true)

    const admin = (await (await request.post(`${API}/collections/_superusers/auth-with-password`, { data: { identity: ADMIN.email, password: ADMIN.password } })).json()).token
    const other = { email: 'ngoai-configs@e2e.test', password: 'mat-khau-ngoai-123' }
    const u = await (await request.post(`${API}/collections/users/records`, { headers: { Authorization: admin }, data: { ...other, passwordConfirm: other.password, verified: true } })).json()
    await request.post(`${API}/collections/households/records`, { headers: { Authorization: admin }, data: { name: 'Hàng xóm cài đặt', members: [u.id] } })
    const ot = (await (await request.post(`${API}/collections/users/auth-with-password`, { data: { identity: other.email, password: other.password } })).json()).token

    expect((await (await request.get(`${API}/collections/set_configs/records`, { headers: { Authorization: ot } })).json()).totalItems).toBe(0)
    expect((await request.get(`${API}/collections/set_configs/records/${mine.id}`, { headers: { Authorization: ot } })).status()).toBe(404)
    expect((await post(ot, { household: hh, setKey: 'khac', cooldownDays: 1 })).status()).toBeGreaterThanOrEqual(400)
    expect((await patch(ot, { cooldownDays: 9 })).status()).toBeGreaterThanOrEqual(400)
    expect((await request.delete(`${API}/collections/set_configs/records/${mine.id}`, { headers: { Authorization: ot } })).status()).toBeGreaterThanOrEqual(400)
    expect((await configs(page, t)).map((c) => c.cooldownDays)).toEqual([0])
  } finally {
    await clearConfigs(page, t)
  }
})
