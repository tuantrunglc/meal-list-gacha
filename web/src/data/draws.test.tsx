import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { renderHook, waitFor } from '@testing-library/react'
import { ClientResponseError } from 'pocketbase'
import type { ReactNode } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { toIsoDate, useCommitTray, useDrawHistory, useHasDraws, useRecentDraws } from './draws'
import { pb } from './pb'

vi.mock('./auth', () => ({ useAuth: () => ({ isAuthenticated: true, userId: 'u1' }) }))

type Fake = Record<'getFirstListItem' | 'getFullList' | 'getList' | 'create' | 'delete', ReturnType<typeof vi.fn>>
let fake: Fake

function wrapper({ children }: { children: ReactNode }) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>
}

beforeEach(() => {
  fake = {
    getFirstListItem: vi.fn().mockResolvedValue({ id: 'h1', name: 'Nhà' }),
    getFullList: vi.fn().mockResolvedValue([]),
    getList: vi.fn().mockResolvedValue({ items: [] }),
    create: vi.fn().mockResolvedValue({}),
    delete: vi.fn().mockResolvedValue(true),
  }
  vi.spyOn(pb, 'collection').mockReturnValue(fake as unknown as ReturnType<typeof pb.collection>)
})
afterEach(() => vi.restoreAllMocks())

describe('toIsoDate', () => {
  it('đổi dấu cách của PocketBase thành T để Safari parse được', () => {
    expect(toIsoDate('2026-09-26 10:11:12.345Z')).toBe('2026-09-26T10:11:12.345Z')
    expect(new Date(toIsoDate('2026-09-26 10:11:12.345Z')).toISOString()).toBe('2026-09-26T10:11:12.345Z')
    expect(toIsoDate('2026-09-26T10:11:12.345Z')).toBe('2026-09-26T10:11:12.345Z')
  })
})

describe('useRecentDraws', () => {
  it('lọc theo household, Bộ và cửa sổ ngày; chuẩn hoá chosenAt', async () => {
    fake.getFullList.mockResolvedValue([{ id: 'd1', chosenAt: '2026-09-26 10:00:00.000Z', entries: [{ itemId: 'x' }] }])
    const { result } = renderHook(() => useRecentDraws('food', 3), { wrapper })
    await waitFor(() => expect(result.current.data).toBeDefined())
    expect(result.current.data![0].chosenAt).toBe('2026-09-26T10:00:00.000Z')
    const filter = fake.getFullList.mock.calls[0][0].filter as string
    expect(filter).toContain('household = "h1"')
    expect(filter).toContain('setKey = "food"')
    expect(filter).toContain('chosenAt >=')
  })

  it('cooldown 0 thì không cần hỏi server', async () => {
    const { result } = renderHook(() => useRecentDraws('food', 0), { wrapper })
    await waitFor(() => expect(fake.getFirstListItem).toHaveBeenCalled())
    // chờ household về xong rồi mới khẳng định
    await new Promise((r) => setTimeout(r, 20))
    expect(fake.getFullList).not.toHaveBeenCalled()
    expect(result.current.fetchStatus).toBe('idle')
  })
})

describe('useHasDraws', () => {
  it('có ít nhất một draw thì true', async () => {
    fake.getList.mockResolvedValue({ items: [{ id: 'd1' }] })
    const { result } = renderHook(() => useHasDraws('food'), { wrapper })
    await waitFor(() => expect(result.current.data).toBe(true))
  })
})

describe('useCommitTray', () => {
  const entries = [{ itemId: 'x', groupKey: 'g', name: 'X', rarity: 1 as const, order: 0 }]

  it('tạo draw với ID do client sinh, chosenAt ISO UTC', async () => {
    const { result } = renderHook(() => useCommitTray('food'), { wrapper })
    await waitFor(() => expect(fake.getFirstListItem).toHaveBeenCalled())
    await waitFor(async () => {
      await result.current.mutateAsync({ id: 'abcdefghij12345', entries })
    })
    const body = fake.create.mock.calls[0][0]
    expect(body).toMatchObject({ id: 'abcdefghij12345', household: 'h1', setKey: 'food', entries })
    expect(body.chosenAt).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/)
  })

  it('trùng ID (lần trước đã tới server) coi là thành công; lỗi mạng thì AppError', async () => {
    const { result } = renderHook(() => useCommitTray('food'), { wrapper })
    await waitFor(() => expect(fake.getFirstListItem).toHaveBeenCalled())
    fake.create.mockRejectedValueOnce(
      new ClientResponseError({ status: 400, response: { data: { id: { code: 'validation_not_unique' } } } }),
    )
    await waitFor(async () => {
      await expect(result.current.mutateAsync({ id: 'abcdefghij12345', entries })).resolves.toBeUndefined()
    })
    fake.create.mockRejectedValueOnce(new ClientResponseError({ status: 0 }))
    await expect(result.current.mutateAsync({ id: 'abcdefghij12345', entries })).rejects.toMatchObject({ code: 'network' })
  })

  it('thành công: cache mâm gần đây có ngay draw mới, "đã có mâm" = true, gọi onCommitted', async () => {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    const w = ({ children }: { children: ReactNode }) => <QueryClientProvider client={client}>{children}</QueryClientProvider>
    const onCommitted = vi.fn()
    const recent = renderHook(() => useRecentDraws('food', 3), { wrapper: w })
    await waitFor(() => expect(recent.result.current.data).toEqual([]))
    const commit = renderHook(() => useCommitTray('food', onCommitted), { wrapper: w })
    // tải lại sau khi chốt bị lỗi mạng: cache vẫn phải có draw mới
    fake.getFullList.mockRejectedValue(new ClientResponseError({ status: 0 }))
    await commit.result.current.mutateAsync({ id: 'abcdefghij12345', entries })
    expect(onCommitted).toHaveBeenCalledOnce()
    const cached = client.getQueriesData<{ id: string }[]>({ queryKey: ['noi-than', 'draws', 'h1', 'food', 'recent'] })
    expect(cached.some(([, d]) => d?.some((x) => x.id === 'abcdefghij12345'))).toBe(true)
    expect(client.getQueryData(['noi-than', 'draws', 'h1', 'food', 'any'])).toBe(true)
  })

  it('replaceId: xoá bản ghi của lần lỗi trước (404 thì bỏ qua) rồi mới tạo', async () => {
    const { result } = renderHook(() => useCommitTray('food'), { wrapper })
    await waitFor(() => expect(fake.getFirstListItem).toHaveBeenCalled())
    fake.delete.mockRejectedValueOnce(new ClientResponseError({ status: 404 }))
    await waitFor(async () => {
      await result.current.mutateAsync({ id: 'newidnewidnewid', entries, replaceId: 'oldidoldidoldid' })
    })
    expect(fake.delete).toHaveBeenCalledWith('oldidoldidoldid')
    expect(fake.create.mock.calls.at(-1)![0].id).toBe('newidnewidnewid')
  })
})

describe('useDrawHistory', () => {
  it('trang 20, mới nhất trước, lọc household + Bộ, tải trang kế tới khi hết', async () => {
    fake.getList
      .mockResolvedValueOnce({ items: [{ id: 'd2', chosenAt: '2026-09-26 10:00:00.000Z', entries: [] }], page: 1, totalPages: 2 })
      .mockResolvedValueOnce({ items: [{ id: 'd1', chosenAt: '2026-09-25 10:00:00.000Z', entries: [] }], page: 2, totalPages: 2 })
    const { result } = renderHook(() => useDrawHistory('food'), { wrapper })
    await waitFor(() => expect(result.current.data?.pages).toHaveLength(1))
    const [page, size, opts] = fake.getList.mock.calls[0]
    expect([page, size]).toEqual([1, 20])
    expect(opts.sort).toBe('-chosenAt,-created')
    expect(opts.filter).toContain('household = "h1"')
    expect(opts.filter).toContain('setKey = "food"')
    expect(result.current.hasNextPage).toBe(true)
    await result.current.fetchNextPage()
    await waitFor(() => expect(result.current.data?.pages).toHaveLength(2))
    expect(result.current.hasNextPage).toBe(false)
    expect(result.current.data!.pages[0].items[0].chosenAt).toBe('2026-09-26T10:00:00.000Z')
  })
})
