import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { renderHook, waitFor } from '@testing-library/react'
import { ClientResponseError } from 'pocketbase'
import type { ReactNode } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { pb } from './pb'
import { useSaveCooldown, useSetConfig } from './setConfig'

vi.mock('./auth', () => ({ useAuth: () => ({ isAuthenticated: true, userId: 'u1' }) }))

type Fake = Record<'getFirstListItem' | 'getList' | 'create' | 'update', ReturnType<typeof vi.fn>>
let fake: Fake

function wrapper({ children }: { children: ReactNode }) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>
}

const conflict = () =>
  new ClientResponseError({ status: 400, response: { data: { household: { code: 'validation_not_unique' } } } })

beforeEach(() => {
  fake = {
    getFirstListItem: vi.fn().mockResolvedValue({ id: 'h1', name: 'Nhà' }),
    getList: vi.fn().mockResolvedValue({ items: [] }),
    create: vi.fn().mockResolvedValue({}),
    update: vi.fn().mockResolvedValue({}),
  }
  vi.spyOn(pb, 'collection').mockReturnValue(fake as unknown as ReturnType<typeof pb.collection>)
})
afterEach(() => vi.restoreAllMocks())

async function saveHook() {
  const hook = renderHook(() => useSaveCooldown('food'), { wrapper })
  await waitFor(() => expect(hook.result.current.ready).toBe(true))
  return hook
}

describe('useSetConfig', () => {
  it('chưa có bản ghi thì null (dùng mặc định của Bộ); lọc theo household và Bộ', async () => {
    const { result } = renderHook(() => useSetConfig('food'), { wrapper })
    await waitFor(() => expect(result.current.data).toEqual({ cooldownDays: null }))
    const filter = fake.getList.mock.calls[0][2].filter as string
    expect(filter).toContain('household = "h1"')
    expect(filter).toContain('setKey = "food"')
  })

  it('có bản ghi thì trả số ngày, kể cả 0', async () => {
    fake.getList.mockResolvedValue({ items: [{ id: 'c1', cooldownDays: 0 }] })
    const { result } = renderHook(() => useSetConfig('food'), { wrapper })
    await waitFor(() => expect(result.current.data).toEqual({ cooldownDays: 0 }))
  })
})

describe('useSaveCooldown', () => {
  it('lần đầu: tạo bản ghi với ID do client sinh', async () => {
    const { result } = await saveHook()
    await result.current.mutateAsync(5)
    expect(fake.create).toHaveBeenCalledWith(
      expect.objectContaining({ household: 'h1', setKey: 'food', cooldownDays: 5, id: expect.stringMatching(/^[a-z0-9]{15}$/) }),
    )
    expect(fake.update).not.toHaveBeenCalled()
  })

  it('lần sau: cập nhật bản ghi có sẵn, không tạo mới', async () => {
    fake.getList.mockResolvedValue({ items: [{ id: 'c1', cooldownDays: 3 }] })
    const { result } = await saveHook()
    await result.current.mutateAsync(0)
    expect(fake.update).toHaveBeenCalledWith('c1', { cooldownDays: 0 })
    expect(fake.create).not.toHaveBeenCalled()
  })

  it('máy khác vừa tạo (trùng household + Bộ): cập nhật bản của máy kia', async () => {
    fake.getList.mockResolvedValueOnce({ items: [] }).mockResolvedValueOnce({ items: [{ id: 'c9', cooldownDays: 2 }] })
    fake.create.mockRejectedValueOnce(conflict())
    const { result } = await saveHook()
    await result.current.mutateAsync(7)
    expect(fake.update).toHaveBeenCalledWith('c9', { cooldownDays: 7 })
  })

  it('lỗi mạng thì AppError network', async () => {
    fake.getList.mockRejectedValue(new ClientResponseError({ status: 0, isAbort: false }))
    const { result } = await saveHook()
    await expect(result.current.mutateAsync(4)).rejects.toMatchObject({ code: 'network' })
  })

  it('lưu xong thì useSetConfig thấy giá trị mới ngay', async () => {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    const shared = ({ children }: { children: ReactNode }) => <QueryClientProvider client={client}>{children}</QueryClientProvider>
    const { result } = renderHook(() => ({ cfg: useSetConfig('food'), save: useSaveCooldown('food') }), { wrapper: shared })
    await waitFor(() => expect(result.current.cfg.data).toEqual({ cooldownDays: null }))
    await result.current.save.mutateAsync(9)
    await waitFor(() => expect(result.current.cfg.data).toEqual({ cooldownDays: 9 }))
  })
})
