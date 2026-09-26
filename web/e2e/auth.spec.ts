import { expect, test } from '@playwright/test'
import { ADMIN, API, OWNER } from './env.ts'
import { login } from './helpers.ts'

test('chưa đăng nhập: mọi route là màn đăng nhập, không có thanh tab', async ({ page }) => {
  await page.goto('/lich-su')
  await expect(page.getByRole('heading', { name: 'Nồi Thần' })).toBeVisible()
  await expect(page.getByRole('navigation', { name: 'Điều hướng chính' })).toHaveCount(0)
})

test('sai mật khẩu thì báo lỗi thân thiện', async ({ page }) => {
  await page.goto('/')
  await page.getByLabel('Email').fill(OWNER.email)
  await page.getByLabel('Mật khẩu').fill('sai-mat-khau')
  await page.getByRole('button', { name: 'Vào bếp thôi!' }).click()
  await expect(page.getByRole('alert')).toHaveText('Sai email hoặc mật khẩu rồi, thử lại nhé.')
})

test('mất mạng khi đăng nhập thì báo lỗi mạng', async ({ page }) => {
  await page.goto('/')
  await page.route('**/api/**', (route) => route.abort('internetdisconnected'))
  await page.getByLabel('Email').fill(OWNER.email)
  await page.getByLabel('Mật khẩu').fill(OWNER.password)
  await page.getByRole('button', { name: 'Vào bếp thôi!' }).click()
  await expect(page.getByRole('alert')).toHaveText('Mất mạng rồi, kiểm tra wifi rồi thử lại nhé.')
})

test('đăng nhập từ link sâu thì vào màn Quay, tải lại vẫn còn phiên', async ({ page }) => {
  await page.goto('/lich-su')
  await page.getByLabel('Email').fill(OWNER.email)
  await page.getByLabel('Mật khẩu').fill(OWNER.password)
  await page.getByRole('button', { name: 'Vào bếp thôi!' }).click()
  await expect(page).toHaveURL(/\/$/)
  await expect(page.getByRole('heading', { name: 'Nay ăn gì cả nhà?' })).toBeVisible()
  await page.reload()
  await expect(page.getByRole('heading', { name: 'Nay ăn gì cả nhà?' })).toBeVisible()
})

test('API: chủ app thấy household của mình', async ({ page, request }) => {
  await login(page)
  const token = await page.evaluate(() => JSON.parse(localStorage.getItem('pocketbase_auth') ?? '{}').token as string)
  const res = await request.get(`${API}/collections/households/records`, { headers: { Authorization: token } })
  const body = await res.json()
  expect(body.totalItems).toBe(1)
  expect(body.items[0].name).toBe('Nhà e2e')
})

test('API: không tự đăng ký được, khách không thấy household', async ({ request }) => {
  const signup = await request.post(`${API}/collections/users/records`, {
    data: { email: 'la@e2e.test', password: '12345678aa', passwordConfirm: '12345678aa' },
  })
  expect(signup.status()).toBe(403)
  const list = await (await request.get(`${API}/collections/households/records`)).json()
  expect(list.totalItems).toBe(0)
})

test('cấu hình vận hành: backup hằng ngày giữ 7 bản, tin X-Forwarded-For (IP bên phải)', async ({ request }) => {
  const auth = await request.post(`${API}/collections/_superusers/auth-with-password`, {
    data: { identity: ADMIN.email, password: ADMIN.password },
  })
  const token = ((await auth.json()) as { token: string }).token
  const settings = await (await request.get(`${API}/settings`, { headers: { Authorization: token } })).json()
  expect(settings.meta.appName).toBe('Nồi Thần')
  expect(settings.backups.cron).toBe('0 20 * * *')
  expect(settings.backups.cronMaxKeep).toBe(7)
  expect(settings.trustedProxy.headers).toEqual(['X-Forwarded-For'])
  expect(settings.trustedProxy.useLeftmostIP).toBe(false)
})
