import { expect, test } from '@playwright/test'
import { login, trayReady } from './helpers.ts'

test('âm thanh tắt: không tải file âm thanh; bật ở Cài đặt: tải 3 file nhỏ, quay không lỗi', async ({ page }) => {
  const soundRequests: string[] = []
  page.on('request', (r) => {
    if (r.url().includes('/sounds/')) soundRequests.push(r.url())
  })
  const errors: string[] = []
  page.on('pageerror', (e) => errors.push(e.message))
  // đếm số lần thực sự phát (Web Audio)
  await page.addInitScript(() => {
    const w = window as unknown as { __played: number }
    w.__played = 0
    const start = AudioBufferSourceNode.prototype.start
    AudioBufferSourceNode.prototype.start = function (...args: Parameters<typeof start>) {
      w.__played += 1
      return start.apply(this, args)
    }
  })
  const played = () => page.evaluate(() => (window as unknown as { __played: number }).__played)

  await login(page)
  const spin = page.getByRole('button', { name: 'Mở nồi!' })
  await expect(spin).toBeEnabled({ timeout: 15_000 })
  await spin.click()
  await trayReady(page)
  expect(soundRequests).toEqual([])
  expect(await played()).toBe(0)
  await page.getByRole('button', { name: 'Để sau' }).click()

  await page.getByRole('link', { name: 'Mở cài đặt' }).click()
  const responses = Promise.all(
    ['bup.wav', 'ting.wav', 'ting-ting-tinh.wav'].map((f) => page.waitForResponse((r) => r.url().endsWith(`/sounds/${f}`))),
  )
  await page.getByRole('switch', { name: 'Âm thanh khi mở nồi' }).click()
  for (const res of await responses) {
    expect(res.status()).toBe(200)
    // mỗi file < 50KB
    expect((await res.body()).byteLength).toBeLessThan(50 * 1024)
  }

  // phát thử "ting" khi bật
  await expect.poll(played).toBe(1)

  await page.getByRole('link', { name: '← Về màn Quay' }).click()
  await expect(spin).toBeEnabled({ timeout: 15_000 })
  await spin.click()
  await trayReady(page)
  // mỗi thẻ bật một tiếng
  await expect.poll(played).toBe(4)
  expect(errors).toEqual([])
})
