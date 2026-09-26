import { act, fireEvent, render, screen, within } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { Draw } from '../../data/draws'
import type { Item, ItemsResult } from '../../data/items'
import { foodSet } from '../../sets/food/definition'
import { HistoryScreen } from './HistoryScreen'

type HistoryState = {
  data?: { pages: { items: Draw[]; page: number; totalPages: number }[] }
  error: unknown
  hasNextPage: boolean
  isFetchNextPageError?: boolean
  isFetchingNextPage: boolean
  fetchNextPage: () => void
  refetch: () => void
}
let history: HistoryState
let items: ItemsResult
const deleteMutate = vi.fn<(id: string) => void>()
let deleteState: { isPending: boolean; error: { message: string } | null } = { isPending: false, error: null }
let onDeleted: (() => void) | undefined
vi.mock('../../data/draws', () => ({
  useDrawHistory: () => history,
  useDeleteDraw: (_setKey: string, cb?: () => void) => {
    onDeleted = cb
    return { mutate: deleteMutate, reset: vi.fn(), ready: true, ...deleteState }
  },
}))
vi.mock('../../data/items', () => ({ useItems: () => items }))
vi.mock('../../data/household', () => ({ useCurrentHousehold: () => ({ data: { id: 'h' }, error: null, refetch: vi.fn() }) }))

const seedItem = (key: string, extra: Partial<Item> = {}): Item => {
  const d = foodSet.seed.find((x) => x.seedKey === key)!
  return {
    id: key,
    household: 'h',
    setKey: 'food',
    groupKey: d.groupKey,
    name: d.name,
    rarity: d.rarity,
    tags: d.tags,
    attrs: d.attrs,
    seedKey: key,
    deleted: false,
    imageFile: '',
    collectionId: 'c',
    updated: '',
    ...extra,
  }
}

const draw = (id: string, chosenAt: string, keys: string[]): Draw => ({
  id,
  chosenAt,
  entries: keys.map((k, order) => {
    const d = foodSet.seed.find((x) => x.seedKey === k)!
    return { itemId: k, groupKey: d.groupKey, name: d.name, rarity: d.rarity, order }
  }),
})

describe('HistoryScreen', () => {
  beforeEach(() => {
    deleteMutate.mockReset()
    deleteState = { isPending: false, error: null }
    const all = [seedItem('ca-kho-to'), seedItem('canh-chua-ca', { deleted: true, name: 'Tên mới sau khi chốt' }), seedItem('rau-muong-xao-toi')]
    items = { data: all.filter((i) => !i.deleted), all, error: null, isPending: false, isError: false, refetch: vi.fn(async () => {}) }
    history = {
      data: {
        pages: [
          {
            items: [
              draw('d2', '2026-09-26T10:30:00.000Z', ['rau-muong-xao-toi', 'canh-chua-ca', 'ca-kho-to']),
              draw('d1', '2026-09-25T11:00:00.000Z', ['ca-kho-to']),
            ],
            page: 1,
            totalPages: 1,
          },
        ],
      },
      error: null,
      hasNextPage: false,
      isFetchingNextPage: false,
      fetchNextPage: vi.fn(),
      refetch: vi.fn(),
    }
  })

  it('mỗi mâm một hàng, mới nhất trên, ngày giờ giờ máy, tên theo thứ tự', () => {
    render(<HistoryScreen />)
    const rows = screen.getAllByRole('listitem', { name: /^Mâm / })
    expect(rows).toHaveLength(2)
    expect(within(rows[0]).getByText(/26\/09 · 17:30/)).toBeInTheDocument()
    expect(within(rows[0]).getAllByRole('button', { name: /^Xem công thức/ }).map((b) => b.getAttribute('aria-label'))).toEqual([
      'Xem công thức Rau muống xào tỏi',
      'Xem công thức Canh chua cá',
      'Xem công thức Cá kho tộ',
    ])
  })

  it('món đã xoá / đổi tên: hiện tên lúc chốt và vẫn mở được chi tiết', () => {
    render(<HistoryScreen />)
    const row = screen.getAllByRole('listitem', { name: /^Mâm / })[0]
    expect(within(row).getByText('Canh chua cá')).toBeInTheDocument()
    fireEvent.click(within(row).getByRole('button', { name: 'Xem công thức Canh chua cá' }))
    const dialog = screen.getByRole('dialog', { name: 'Chi tiết món Canh chua cá' })
    expect(within(dialog).getByRole('heading', { name: 'Các bước' })).toBeInTheDocument()
    expect(within(dialog).queryByRole('button', { name: 'Sửa' })).toBeNull()
  })

  it('trống thì mời qua tab Quay', () => {
    history = { ...history, data: { pages: [{ items: [], page: 1, totalPages: 1 }] } }
    render(<HistoryScreen />)
    expect(screen.getByRole('status')).toHaveTextContent('Chưa chốt mâm nào. Qua tab Quay mở nồi thử nhé!')
  })

  it('còn trang thì có nút Xem thêm mâm cũ gọi trang kế', () => {
    history = { ...history, hasNextPage: true }
    render(<HistoryScreen />)
    fireEvent.click(screen.getByRole('button', { name: 'Xem thêm mâm cũ' }))
    expect(history.fetchNextPage).toHaveBeenCalled()
  })

  it('lỗi thì báo + Thử lại', () => {
    history = { ...history, data: undefined, error: { message: 'Mất mạng rồi' } }
    render(<HistoryScreen />)
    fireEvent.click(within(screen.getByRole('alert')).getByRole('button', { name: 'Thử lại' }))
    expect(history.refetch).toHaveBeenCalled()
  })

  it('món còn nhưng đã đổi tên: chi tiết dùng tên lúc chốt, khớp với nút', () => {
    items = { ...items, all: items.all!.map((i) => (i.id === 'ca-kho-to' ? { ...i, name: 'Cá kho tộ của bà' } : i)) }
    render(<HistoryScreen />)
    const row = screen.getAllByRole('listitem', { name: /^Mâm / })[1]
    fireEvent.click(within(row).getByRole('button', { name: 'Xem công thức Cá kho tộ' }))
    expect(screen.getByRole('dialog', { name: 'Chi tiết món Cá kho tộ' })).toBeInTheDocument()
  })

  it('nhiều trang: hiện đủ theo thứ tự, mâm trùng giữa hai trang chỉ hiện một lần', () => {
    const p1 = history.data!.pages[0]
    history = {
      ...history,
      data: {
        pages: [
          { ...p1, totalPages: 2 },
          { items: [p1.items[1], draw('d0', '2026-09-24T11:00:00.000Z', ['rau-muong-xao-toi'])], page: 2, totalPages: 2 },
        ],
      },
    }
    render(<HistoryScreen />)
    expect(screen.getAllByRole('listitem', { name: /^Mâm / })).toHaveLength(3)
  })

  it('cuộn tới cuối (IntersectionObserver) thì tải trang kế; tải lỗi thì không tự tải lại', () => {
    let cb: (entries: { isIntersecting: boolean }[]) => void = () => {}
    vi.stubGlobal(
      'IntersectionObserver',
      class {
        constructor(fn: typeof cb) {
          cb = fn
        }
        observe() {}
        disconnect() {}
      },
    )
    try {
      history = { ...history, hasNextPage: true }
      const { rerender } = render(<HistoryScreen />)
      cb([{ isIntersecting: true }])
      expect(history.fetchNextPage).toHaveBeenCalledOnce()
      ;(history.fetchNextPage as ReturnType<typeof vi.fn>).mockClear()
      cb = () => {}
      history = { ...history, isFetchNextPageError: true, error: { message: 'Mất mạng rồi' } }
      rerender(<HistoryScreen />)
      cb([{ isIntersecting: true }])
      expect(history.fetchNextPage).not.toHaveBeenCalled()
      expect(screen.getByRole('button', { name: 'Thử lại' })).toBeInTheDocument()
    } finally {
      vi.unstubAllGlobals()
    }
  })

  it('danh sách món chưa tải xong: chi tiết báo đang tải, không hiện công thức rỗng', () => {
    items = { ...items, data: undefined, all: undefined, isPending: true }
    render(<HistoryScreen />)
    fireEvent.click(screen.getAllByRole('button', { name: 'Xem công thức Cá kho tộ' })[0])
    const dialog = screen.getByRole('dialog')
    expect(within(dialog).getByRole('status')).toHaveTextContent('Đang lật sổ mâm cơm…')
  })

  describe('xoá mâm', () => {
    it('nút "Xoá mâm" mở xác nhận; Xoá gọi xoá đúng mâm, xong toast và đóng', async () => {
      const { useToast } = await import('../../ui/toast')
      render(<HistoryScreen />)
      const row = screen.getAllByRole('listitem', { name: /^Mâm / })[0]
      fireEvent.click(within(row).getByRole('button', { name: /^Xoá mâm Thứ Bảy, 26\/09/ }))
      const dialog = screen.getByRole('alertdialog', { name: 'Xoá mâm này?' })
      expect(dialog).toHaveAccessibleDescription('Mấy món trong mâm sẽ được quay lại ngay.')
      fireEvent.click(within(dialog).getByRole('button', { name: 'Xoá' }))
      expect(deleteMutate.mock.calls[0][0]).toBe('d2')
      act(() => onDeleted!())
      expect(useToast.getState().message).toBe('Đã xoá mâm.')
      expect(screen.queryByRole('alertdialog')).toBeNull()
    })

    it('Thôi thì không xoá; lỗi thì lời nhắn + Thử lại', () => {
      const { rerender } = render(<HistoryScreen />)
      const row = screen.getAllByRole('listitem', { name: /^Mâm / })[0]
      fireEvent.click(within(row).getByRole('button', { name: /^Xoá mâm/ }))
      deleteState = { isPending: false, error: { message: 'Mất mạng rồi' } }
      rerender(<HistoryScreen />)
      const dialog = screen.getByRole('alertdialog')
      expect(within(dialog).getByRole('alert')).toHaveTextContent('Mất mạng rồi')
      fireEvent.click(within(dialog).getByRole('button', { name: 'Thử lại' }))
      expect(deleteMutate).toHaveBeenCalledOnce()
      fireEvent.click(within(dialog).getByRole('button', { name: 'Thôi' }))
      expect(screen.queryByRole('alertdialog')).toBeNull()
    })

    it('vuốt hàng sang trái thì mở xác nhận; cú click ngay sau vuốt không mở chi tiết', () => {
      render(<HistoryScreen />)
      const row = screen.getAllByRole('listitem', { name: /^Mâm / })[0]
      const surface = row.querySelector('.history-row')!
      fireEvent.pointerDown(surface, { pointerId: 1, isPrimary: true, clientX: 300, clientY: 50 })
      fireEvent.pointerMove(surface, { pointerId: 1, clientX: 250, clientY: 51 })
      fireEvent.pointerMove(surface, { pointerId: 1, clientX: 180, clientY: 51 })
      fireEvent.pointerUp(surface, { pointerId: 1 })
      fireEvent.click(within(row).getAllByRole('button', { name: /^Xem công thức/ })[0])
      expect(screen.getByRole('alertdialog', { name: 'Xoá mâm này?' })).toBeInTheDocument()
      expect(screen.queryByRole('dialog')).toBeNull()
    })

    it('mâm hỏng (không ngày, không món) không hiện', () => {
      history = {
        ...history,
        data: { pages: [{ items: [...history.data!.pages[0].items, { id: 'bad', chosenAt: '', entries: [] }], page: 1, totalPages: 1 }] },
      }
      render(<HistoryScreen />)
      expect(screen.getAllByRole('listitem', { name: /^Mâm / })).toHaveLength(2)
    })
  })
})
