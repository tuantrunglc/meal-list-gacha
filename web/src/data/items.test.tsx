import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { renderHook, waitFor } from '@testing-library/react'
import { ClientResponseError } from 'pocketbase'
import type { ReactNode } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useCurrentHousehold } from './household'
import { itemImageSources, seedSet, useCreateItem, useDeleteItem, useItems, useRestoreSeed, useUpdateItem, type Item, type SeedSource } from './items'
import { pb } from './pb'

vi.mock('./auth', () => ({ useAuth: () => ({ isAuthenticated: true, userId: 'u1' }) }))

const seed: SeedSource = {
  setKey: 'set-a',
  seed: [
    { seedKey: 's1', groupKey: 'g', name: 'Một', rarity: 1, tags: ['t'], attrs: {} },
    { seedKey: 's2', groupKey: 'g', name: 'Hai', rarity: 2, tags: ['t'], attrs: {} },
  ],
}

const record = (id: string, extra: Partial<Record<string, unknown>> = {}) => ({
  id,
  household: 'h1',
  setKey: 'set-a',
  groupKey: 'g',
  name: id,
  rarity: 1,
  tags: ['t'],
  attrs: {},
  seedKey: id,
  deleted: false,
  image: '',
  collectionId: 'c',
  updated: '2026-09-26 00:00:00Z',
  ...extra,
})

const conflict = () =>
  new ClientResponseError({ status: 400, response: { data: { seedKey: { code: 'validation_not_unique' } } } })

type Fake = {
  getFirstListItem: ReturnType<typeof vi.fn>
  getFullList: ReturnType<typeof vi.fn>
  create: ReturnType<typeof vi.fn>
  update?: ReturnType<typeof vi.fn>
}
let fake: Fake

function wrapper({ children }: { children: ReactNode }) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>
}

beforeEach(() => {
  fake = {
    getFirstListItem: vi.fn().mockResolvedValue({ id: 'h1', name: 'Nhà' }),
    getFullList: vi.fn(),
    create: vi.fn().mockResolvedValue({}),
  }
  vi.spyOn(pb, 'collection').mockReturnValue(fake as unknown as ReturnType<typeof pb.collection>)
})

afterEach(() => vi.restoreAllMocks())

describe('useItems', () => {
  it('household chưa có món thì nạp seed rồi trả', async () => {
    fake.getFullList.mockResolvedValueOnce([]).mockResolvedValueOnce([record('s1'), record('s2')])
    const { result } = renderHook(() => useItems(seed), { wrapper })
    await waitFor(() => expect(result.current.data).toBeDefined())
    expect(fake.create).toHaveBeenCalledTimes(2)
    const bodies = fake.create.mock.calls.map((c) => c[0])
    expect(bodies.map((b) => b.seedKey)).toEqual(['s1', 's2'])
    for (const b of bodies) {
      expect(b.id).toMatch(/^[a-z0-9]{15}$/)
      expect(b).toMatchObject({ household: 'h1', setKey: 'set-a', deleted: false })
    }
    expect(result.current.data!.map((i) => i.id)).toEqual(['s1', 's2'])
  })

  it('nạp dở (thiếu seedKey) thì nạp tiếp phần còn thiếu', async () => {
    fake.getFullList.mockResolvedValueOnce([record('s1')]).mockResolvedValueOnce([record('s1'), record('s2')])
    const { result } = renderHook(() => useItems(seed), { wrapper })
    await waitFor(() => expect(result.current.data).toBeDefined())
    expect(fake.create).toHaveBeenCalledOnce()
    expect(fake.create.mock.calls[0][0].seedKey).toBe('s2')
  })

  it('đủ seed (kể cả món đã xoá mềm) thì không nạp, và lọc deleted', async () => {
    fake.getFullList.mockResolvedValue([record('s1'), record('s2', { deleted: true })])
    const { result } = renderHook(() => useItems(seed), { wrapper })
    await waitFor(() => expect(result.current.data).toBeDefined())
    expect(fake.create).not.toHaveBeenCalled()
    expect(result.current.data!.map((i) => i.id)).toEqual(['s1'])
    // `all` giữ cả món đã xoá (cho lịch sử)
    expect(result.current.all!.map((i) => i.id)).toEqual(['s1', 's2'])

    fake.getFullList.mockResolvedValue([record('s1', { deleted: true }), record('s2', { deleted: true })])
    const again = renderHook(() => useItems(seed), { wrapper })
    await waitFor(() => expect(again.result.current.data).toBeDefined())
    expect(fake.create).not.toHaveBeenCalled()
    expect(again.result.current.data).toEqual([])
  })

  it('không thuộc nhà nào thì useItems báo no-household, thử lại chạy lại bước household', async () => {
    fake.getFirstListItem.mockRejectedValue(new ClientResponseError({ status: 404 }))
    const { result } = renderHook(() => useItems(seed), { wrapper })
    await waitFor(() => expect(result.current.isError).toBe(true))
    expect(result.current.error!.code).toBe('no-household')
    expect(fake.getFullList).not.toHaveBeenCalled()

    fake.getFirstListItem.mockResolvedValue({ id: 'h1', name: 'Nhà' })
    fake.getFullList.mockResolvedValue([record('s1'), record('s2')])
    await result.current.refetch()
    await waitFor(() => expect(result.current.data).toHaveLength(2))
    expect(result.current.isError).toBe(false)
  })

  it('lỗi mạng thì trả AppError network', async () => {
    fake.getFullList.mockRejectedValue(new ClientResponseError({ status: 0 }))
    const { result } = renderHook(() => useItems(seed), { wrapper })
    await waitFor(() => expect(result.current.isError).toBe(true))
    expect(result.current.error!.code).toBe('network')
  })
})

describe('seedSet', () => {
  it('lỗi trùng (máy khác nạp trước) coi là thành công', async () => {
    fake.create.mockRejectedValueOnce(conflict()).mockResolvedValueOnce({})
    await expect(seedSet('h1', seed)).resolves.toBeUndefined()
  })

  it('trùng ID (hiếm) thì sinh ID mới và tạo lại', async () => {
    const idConflict = new ClientResponseError({ status: 400, response: { data: { id: { code: 'validation_not_unique' } } } })
    fake.create.mockRejectedValueOnce(idConflict).mockResolvedValue({})
    await seedSet('h1', { ...seed, seed: [seed.seed[0]] })
    expect(fake.create).toHaveBeenCalledTimes(2)
    const [first, second] = fake.create.mock.calls.map((c) => c[0].id)
    expect(first).not.toBe(second)
  })

  it('lỗi khác thì ném ra', async () => {
    fake.create.mockRejectedValue(new ClientResponseError({ status: 500 }))
    await expect(seedSet('h1', seed)).rejects.toBeInstanceOf(ClientResponseError)
  })
})

describe('useCurrentHousehold', () => {
  it('trả household của mình', async () => {
    const { result } = renderHook(() => useCurrentHousehold(), { wrapper })
    await waitFor(() => expect(result.current.data).toBeDefined())
    expect(result.current.data).toEqual({ id: 'h1', name: 'Nhà' })
  })

  it('không thuộc nhà nào thì lỗi no-household', async () => {
    fake.getFirstListItem.mockRejectedValue(new ClientResponseError({ status: 404 }))
    const { result } = renderHook(() => useCurrentHousehold(), { wrapper })
    await waitFor(() => expect(result.current.isError).toBe(true))
    expect(result.current.error!.code).toBe('no-household')
  })
})

describe('itemImageSources', () => {
  const base = { id: 'i1', collectionId: 'c', seedKey: '', imageFile: '' } as Item
  it('ảnh upload (thumb) trước, ảnh seed sau', () => {
    const sources = itemImageSources({ ...base, imageFile: 'a.webp', seedKey: 'ca-kho-to' })
    expect(sources[0]).toContain('/api/files/c/i1/a.webp')
    expect(sources[0]).toContain('thumb=400x300')
    expect(sources[1]).toBe('/seed/ca-kho-to.webp')
  })
  it('cỡ full (chi tiết) dùng ảnh gốc, không thumb', () => {
    const [full] = itemImageSources({ ...base, imageFile: 'a.webp' }, undefined, 'full')
    expect(full).toContain('/api/files/c/i1/a.webp')
    expect(full).not.toContain('thumb=')
  })

  it('món tự thêm chưa có ảnh thì không có nguồn', () => {
    expect(itemImageSources(base)).toEqual([])
  })
})

describe('useCreateItem', () => {
  const input = { id: 'abcdefghij12345', groupKey: 'g', name: '  Món mới ', rarity: 2 as const, tags: ['t'], attrs: { a: 1 } }
  const fields = { groupKey: 'g', name: 'Món mới', rarity: 2, tags: ['t'], attrs: { a: 1 } }

  async function ready() {
    const hook = renderHook(() => useCreateItem('set-a'), { wrapper })
    await waitFor(() => expect(hook.result.current.ready).toBe(true))
    return hook
  }

  it('tạo món với household, setKey, seedKey rỗng, tên đã trim', async () => {
    const { result } = await ready()
    await result.current.mutateAsync(input)
    expect(fake.create).toHaveBeenCalledOnce()
    expect(fake.create.mock.calls[0][0]).toEqual({ ...fields, id: input.id, household: 'h1', setKey: 'set-a', seedKey: '', deleted: false })
  })

  it('trùng ID (lần trước đã tới server): cập nhật bản ghi bằng nội dung mới; lỗi mạng là AppError', async () => {
    const { result } = await ready()
    fake.update = vi.fn().mockResolvedValue({})
    fake.create.mockRejectedValueOnce(new ClientResponseError({ status: 400, response: { data: { id: { code: 'validation_not_unique' } } } }))
    await result.current.mutateAsync(input)
    expect(fake.update).toHaveBeenCalledWith(input.id, { ...fields, image: null })
    fake.create.mockRejectedValueOnce(new ClientResponseError({ status: 0 }))
    await expect(result.current.mutateAsync(input)).rejects.toMatchObject({ code: 'network' })
  })

  it('có ảnh: create gửi File; trùng ID thì update cũng kèm đúng File', async () => {
    const { result } = await ready()
    const image = new File(['x'], 'mon.webp', { type: 'image/webp' })
    await result.current.mutateAsync({ ...input, image })
    expect(fake.create.mock.calls.at(-1)![0].image).toBe(image)
    fake.update = vi.fn().mockResolvedValue({})
    fake.create.mockRejectedValueOnce(new ClientResponseError({ status: 400, response: { data: { id: { code: 'validation_not_unique' } } } }))
    await result.current.mutateAsync({ ...input, image })
    expect(fake.update.mock.calls[0][1].image).toBe(image)
  })
})

describe('useUpdateItem', () => {
  const base = { id: 'i1', groupKey: 'g', name: ' Tên ', rarity: 3 as const, tags: ['t'], attrs: {} }
  const fields = { groupKey: 'g', name: 'Tên', rarity: 3, tags: ['t'], attrs: {} }

  it('không đụng ảnh thì không gửi image; bỏ ảnh gửi null; ảnh mới gửi File; không gửi seedKey/setKey', async () => {
    fake.update = vi.fn().mockResolvedValue({})
    const { result } = renderHook(() => useUpdateItem('set-a'), { wrapper })
    await result.current.mutateAsync(base)
    expect(fake.update).toHaveBeenLastCalledWith('i1', fields)
    await result.current.mutateAsync({ ...base, image: null })
    expect(fake.update).toHaveBeenLastCalledWith('i1', { ...fields, image: null })
    const file = new File(['x'], 'm.webp')
    await result.current.mutateAsync({ ...base, image: file })
    expect(fake.update.mock.calls.at(-1)![1].image).toBe(file)
    for (const [, body] of fake.update.mock.calls) {
      for (const k of ['seedKey', 'setKey', 'household']) expect(body).not.toHaveProperty(k)
    }
    // attrs undefined: giữ nguyên công thức
    await result.current.mutateAsync({ ...base, attrs: undefined })
    expect(fake.update.mock.calls.at(-1)![1]).not.toHaveProperty('attrs')
  })

  it('lỗi mạng là AppError', async () => {
    fake.update = vi.fn().mockRejectedValue(new ClientResponseError({ status: 0 }))
    const { result } = renderHook(() => useUpdateItem('set-a'), { wrapper })
    await expect(result.current.mutateAsync(base)).rejects.toMatchObject({ code: 'network' })
  })
})

describe('useDeleteItem', () => {
  it('xoá mềm: chỉ đặt deleted=true', async () => {
    fake.update = vi.fn().mockResolvedValue({})
    const { result } = renderHook(() => useDeleteItem('set-a'), { wrapper })
    await result.current.mutateAsync('i1')
    expect(fake.update).toHaveBeenCalledWith('i1', { deleted: true })
  })

  it('lỗi mạng là AppError', async () => {
    fake.update = vi.fn().mockRejectedValue(new ClientResponseError({ status: 0 }))
    const { result } = renderHook(() => useDeleteItem('set-a'), { wrapper })
    await expect(result.current.mutateAsync('i1')).rejects.toMatchObject({ code: 'network' })
  })
})

describe('useRestoreSeed', () => {
  const three: SeedSource = {
    setKey: 'set-a',
    seed: [
      { seedKey: 's1', groupKey: 'g', name: 'Một', rarity: 1, tags: ['t'], attrs: { a: 1, b: [2] } },
      { seedKey: 's2', groupKey: 'g', name: 'Hai', rarity: 2, tags: ['t'], attrs: {} },
      { seedKey: 's3', groupKey: 'g', name: 'Ba', rarity: 3, tags: ['t'], attrs: {} },
    ],
  }
  const intact = () => [
    record('r1', { seedKey: 's1', name: 'Một', attrs: { a: 1, b: [2] } }),
    record('r2', { seedKey: 's2', name: 'Hai', rarity: 2 }),
    record('r3', { seedKey: 's3', name: 'Ba', rarity: 3 }),
  ]

  /** Server giả có trạng thái: update/create sửa danh sách mà getFullList trả. */
  function server(records: ReturnType<typeof record>[]) {
    const db = records.map((r) => ({ ...r }))
    fake.getFullList.mockImplementation(async () => db.map((r) => ({ ...r })))
    fake.update = vi.fn(async (id: string, body: Record<string, unknown>) => {
      const r = db.find((x) => x.id === id)!
      Object.assign(r, body, { image: body.image === null ? '' : r.image })
      return r
    })
    fake.create.mockImplementation(async (body: Record<string, unknown>) => {
      db.push(record(body.id as string, { ...body, image: '' }))
      return body
    })
    return db
  }

  async function run(onRestored?: () => void) {
    const { result } = renderHook(() => useRestoreSeed(three, onRestored), { wrapper })
    await waitFor(() => expect(result.current.ready).toBe(true))
    await result.current.mutateAsync()
    return result
  }

  it('món seed đã xoá / bị sửa / có ảnh thì về seed; nguyên vẹn thì không đụng; thiếu thì tạo; món tự thêm giữ nguyên', async () => {
    server([
      // nguyên vẹn (thứ tự khoá attrs khác vẫn coi là giống)
      record('r1', { seedKey: 's1', name: 'Một', attrs: { b: [2], a: 1 } }),
      // bị sửa tên, có ảnh upload, đã xoá
      record('r2', { seedKey: 's2', name: 'Hai sửa', rarity: 2, image: 'x.webp', deleted: true }),
      // món tự thêm
      record('mine', { seedKey: '', name: 'Của nhà', deleted: true }),
    ])
    const onRestored = vi.fn()
    await run(onRestored)
    expect(fake.update).toHaveBeenCalledTimes(1)
    expect(fake.update).toHaveBeenCalledWith('r2', {
      groupKey: 'g',
      name: 'Hai',
      rarity: 2,
      tags: ['t'],
      attrs: {},
      deleted: false,
      image: null,
    })
    expect(fake.create).toHaveBeenCalledTimes(1)
    expect(fake.create.mock.calls[0][0]).toMatchObject({ seedKey: 's3', name: 'Ba', household: 'h1', deleted: false })
    expect(onRestored).toHaveBeenCalledTimes(1)
  })

  it.each([
    ['ảnh upload', { image: 'up.webp' }],
    ['công thức', { attrs: { a: 2, b: [2] } }],
    ['độ hiếm', { rarity: 3 }],
    ['nhóm', { groupKey: 'x' }],
    ['tags', { tags: ['u'] }],
    ['tên', { name: 'Khác' }],
    ['đã xoá', { deleted: true }],
  ])('chỉ khác %s cũng đưa về seed', async (_label, change) => {
    const records = intact()
    Object.assign(records[0], change)
    server(records)
    await run()
    expect(fake.update).toHaveBeenCalledTimes(1)
    expect(fake.update!.mock.calls[0][0]).toBe('r1')
    expect(fake.create).not.toHaveBeenCalled()
  })

  it('seed không có công thức thì gửi attrs null (không bỏ khoá)', async () => {
    const noAttrs: SeedSource = { setKey: 'set-a', seed: [{ seedKey: 's1', groupKey: 'g', name: 'Một', rarity: 1, tags: ['t'], attrs: undefined }] }
    server([record('r1', { seedKey: 's1', name: 'Một', attrs: { x: 1 } })])
    const { result } = renderHook(() => useRestoreSeed(noAttrs), { wrapper })
    await waitFor(() => expect(result.current.ready).toBe(true))
    await result.current.mutateAsync()
    expect(fake.update!.mock.calls[0][1]).toHaveProperty('attrs', null)
  })

  it('tạo trùng seedKey (máy khác vừa tạo rồi xoá): lượt hai đưa bản đó về seed', async () => {
    const db = server(intact().slice(0, 2))
    fake.create.mockImplementationOnce(async () => {
      // máy khác tạo s3 đã bị sửa/xoá trước khi ta kịp tạo
      db.push(record('other', { seedKey: 's3', name: 'Ba hỏng', rarity: 3, deleted: true }))
      throw conflict()
    })
    await run()
    expect(fake.update).toHaveBeenCalledWith('other', expect.objectContaining({ name: 'Ba', deleted: false }))
  })

  it('một món lỗi: không bắt đầu món mới, chờ món đang chạy xong rồi báo AppError; thử lại chạy nốt', async () => {
    const extra: SeedSource = {
      setKey: 'set-a',
      seed: Array.from({ length: 20 }, (_, i) => ({ seedKey: `k${i}`, groupKey: 'g', name: `M${i}`, rarity: 1 as const, tags: ['t'], attrs: {} })),
    }
    server(extra.seed.map((d, i) => record(`r${i}`, { seedKey: d.seedKey, name: d.name, deleted: true })))
    let inFlight = 0
    let finishedAfterFail = false
    let failedAt = -1
    const base = fake.update as unknown as (id: string, body: Record<string, unknown>) => Promise<unknown>
    let calls = 0
    fake.update = vi.fn(async (id: string, body: Record<string, unknown>) => {
      const n = calls++
      inFlight++
      await new Promise((r) => setTimeout(r, n === 0 ? 1 : 10))
      inFlight--
      if (n === 0) {
        failedAt = Date.now()
        throw new ClientResponseError({ status: 0 })
      }
      if (failedAt > 0) finishedAfterFail = true
      return base(id, body)
    })
    const { result } = renderHook(() => useRestoreSeed(extra), { wrapper })
    await waitFor(() => expect(result.current.ready).toBe(true))
    await expect(result.current.mutateAsync()).rejects.toMatchObject({ code: 'network' })
    // lỗi chỉ ném ra khi không còn lệnh ghi nào dở
    expect(inFlight).toBe(0)
    expect(finishedAfterFail).toBe(true)
    // không chạy hết 20 món sau khi lỗi
    expect(calls).toBeLessThan(20)
    await result.current.mutateAsync()
    expect(fake.update).toHaveBeenCalledTimes(calls)
  })
})
