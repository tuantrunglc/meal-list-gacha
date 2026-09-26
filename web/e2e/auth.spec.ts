import { expect, test } from '@playwright/test'
import { OWNER, PB_PORT } from './env.ts'
import { login } from './helpers.ts'

const API = `http://127.0.0.1:${PB_PORT}/api`

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
  await expect(page.getByRole('heading', { name: 'Mở nồi' })).toBeVisible()
  await page.reload()
  await expect(page.getByRole('heading', { name: 'Mở nồi' })).toBeVisible()
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
