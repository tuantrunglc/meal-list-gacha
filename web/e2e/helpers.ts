import type { Page } from '@playwright/test'
import { OWNER } from './env.ts'

export async function login(page: Page) {
  await page.goto('/')
  await page.getByLabel('Email').fill(OWNER.email)
  await page.getByLabel('Mật khẩu').fill(OWNER.password)
  await page.getByRole('button', { name: 'Vào bếp thôi!' }).click()
  await page.getByRole('navigation', { name: 'Điều hướng chính' }).waitFor()
}
