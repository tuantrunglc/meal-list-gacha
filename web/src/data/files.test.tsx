import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { renderHook, waitFor } from '@testing-library/react'
import type { ReactNode } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { Item } from './items'
import { pb } from './pb'

vi.unmock('./files')
vi.mock('./auth', () => ({ useAuth: () => ({ isAuthenticated: true, userId: 'u1' }) }))
const { refreshDelay, useItemImages } = await import('./files')

function wrapper({ children }: { children: ReactNode }) {
  return <QueryClientProvider client={new QueryClient()}>{children}</QueryClientProvider>
}

afterEach(() => vi.restoreAllMocks())

describe('useItemImages', () => {
  it('gắn file token vào URL ảnh upload; thumb cho lưới, gốc cho chi tiết', async () => {
    vi.spyOn(pb.files, 'getToken').mockResolvedValue('tok123')
    const { result } = renderHook(() => useItemImages(), { wrapper })
    const item = { id: 'i1', collectionId: 'c', imageFile: 'a.webp', seedKey: 'ca-kho-to' } as Item
    await waitFor(() => expect(result.current(item)[0]).toContain('token=tok123'))
    expect(result.current(item, 'thumb')[0]).toContain('thumb=400x300')
    expect(result.current(item, 'full')[0]).not.toContain('thumb=')
    expect(result.current(item)[1]).toBe('/seed/ca-kho-to.webp')
  })
})

describe('refreshDelay', () => {
  const token = (exp: number) => `x.${btoa(JSON.stringify({ exp }))}.y`
  it('làm mới trước khi hết hạn 5 phút, tối thiểu 1 phút', () => {
    const now = 1_000_000_000
    expect(refreshDelay(token(now / 1000 + 12 * 3600), now)).toBe(12 * 3600_000 - 5 * 60_000)
    expect(refreshDelay(token(now / 1000 + 60), now)).toBe(60_000)
    expect(refreshDelay(undefined, now)).toBe(60_000)
  })
})

describe('useItemImages khi chưa có token', () => {
  it('bỏ ảnh upload (sẽ bị 403), chỉ còn ảnh seed', () => {
    vi.spyOn(pb.files, 'getToken').mockReturnValue(new Promise(() => {}))
    const { result } = renderHook(() => useItemImages(), { wrapper })
    const item = { id: 'i1', collectionId: 'c', imageFile: 'a.webp', seedKey: 'ca-kho-to' } as Item
    expect(result.current(item)).toEqual(['/seed/ca-kho-to.webp'])
  })
})
