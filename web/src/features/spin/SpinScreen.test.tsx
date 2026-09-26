import { act, fireEvent, render, screen, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { AppError } from '../../data/errors'
import type { Item, ItemsResult } from '../../data/items'
import { foodSet } from '../../sets/food/definition'
import { useTrayStore } from '../tray/store'
import { SpinScreen } from './SpinScreen'

const refetch = vi.fn(async () => {})
let state: ItemsResult

type CommitOpts = { onError?: () => void }
type CommitInput = { id: string; entries: unknown[]; replaceId?: string | null }
const commitMutate = vi.fn<(input: CommitInput, opts?: CommitOpts) => void>()
let commitState: { isPending: boolean; error: AppError | null } = { isPending: false, error: null }
let onCommitted: (() => void) | undefined
let recent: { chosenAt: string; entries: { itemId: string }[] }[] = []
let recentState: { isPending: boolean; fetchStatus: string; error: AppError | null } = {
  isPending: false,
  fetchStatus: 'idle',
  error: null,
}
let hasDraws = false

vi.mock('../../data/draws', () => ({
  useRecentDraws: () => ({ data: recentState.isPending || recentState.error ? undefined : recent, refetch: vi.fn(), ...recentState }),
  useHasDraws: () => ({ data: hasDraws }),
  useCommitTray: (_setKey: string, cb?: () => void) => {
    onCommitted = cb
    return { mutate: commitMutate, reset: vi.fn(), ...commitState }
  },
}))

vi.mock('../../data/items', () => ({
  useItems: () => state,
  itemImageSources: () => [],
  useCreateItem: () => ({ mutate: vi.fn(), reset: vi.fn(), isPending: false, error: null, ready: true }),
}))

function toItems(filter: (d: (typeof foodSet.seed)[number]) => boolean = () => true): Item[] {
  return foodSet.seed.filter(filter).map((d) => ({
    id: d.seedKey,
    household: 'h',
    setKey: 'food',
    groupKey: d.groupKey,
    name: d.name,
    rarity: d.rarity,
    tags: d.tags,
    attrs: d.attrs,
    seedKey: d.seedKey,
    deleted: false,
    imageFile: '',
    collectionId: 'c',
    updated: '',
  }))
}

function spinAndWait() {
  fireEvent.click(screen.getByRole('button', { name: 'Mở nồi!' }))
  act(() => vi.advanceTimersByTime(1600))
  // câu đọc được đặt sau khi mâm hiện
  act(() => vi.advanceTimersByTime(60))
}

const live = () => screen.getByRole('dialog').querySelector('[aria-live="polite"]')!.textContent

function expectedAnnouncement() {
  const parts = useTrayStore.getState().slots.map((s) => {
    const g = foodSet.groups.find((x) => x.key === s.groupKey)!.label
    const d = foodSet.seed.find((x) => x.seedKey === s.itemId)
    if (!d) return `${g} hết món`
    const r = { 1: 'Thường', 2: 'Ngon', 3: 'Đặc biệt' }[d.rarity]
    return `${g} ${d.name}, ${r}`
  })
  return `Mâm cơm: ${parts.join('; ')}`
}

const initialTray = useTrayStore.getState()

describe('SpinScreen', () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'Date'] })
    vi.setSystemTime(new Date(2026, 8, 26, 17, 0))
    refetch.mockClear()
    useTrayStore.setState({ ...initialTray, open: false, slots: [], commitId: null })
    commitMutate.mockReset()
    commitState = { isPending: false, error: null }
    recent = []
    recentState = { isPending: false, fetchStatus: 'idle', error: null }
    onCommitted = undefined
    hasDraws = false
    state = { data: toItems(), error: null, isPending: false, isError: false, refetch }
  })

  afterEach(() => vi.useRealTimers())

  it('mặc định chọn mùa theo tháng (tháng 9 → Thu), có gợi ý lần đầu và tiêu đề Bộ', () => {
    render(<SpinScreen />)
    expect(screen.getByRole('radio', { name: 'Thu' })).toHaveAttribute('aria-checked', 'true')
    expect(screen.getByText('Mở thử đi cả nhà!')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Bộ: Món ăn/ })).toHaveAttribute('aria-disabled', 'true')
  })

  it('quay: khoá khi đang sôi, chạm thêm không quay lại, xong thì mở mâm 3 ô và đọc đúng câu', () => {
    const showResult = vi.spyOn(useTrayStore.getState(), 'showResult')
    useTrayStore.setState({ showResult })
    render(<SpinScreen />)
    fireEvent.click(screen.getByRole('button', { name: 'Mở nồi!' }))
    expect(screen.getByRole('button', { name: 'Nồi đang sôi…' })).toHaveAttribute('aria-disabled', 'true')
    act(() => vi.advanceTimersByTime(500))
    fireEvent.click(screen.getByRole('button', { name: 'Nồi đang sôi…' }))
    fireEvent.click(screen.getByRole('button', { name: 'Nồi đang sôi…' }))
    expect(screen.queryByRole('dialog')).toBeNull()
    act(() => vi.advanceTimersByTime(1100))
    act(() => vi.advanceTimersByTime(60))

    expect(showResult).toHaveBeenCalledOnce()
    const dialog = screen.getByRole('dialog', { name: 'Mâm cơm' })
    expect(within(dialog).getAllByRole('listitem')).toHaveLength(3)
    // câu đọc đầy đủ: nhóm, tên, bậc theo đúng thứ tự trên mâm
    expect(live()).toBe(expectedAnnouncement())
    expect(live()).not.toContain('undefined')
  })

  it('giảm chuyển động: mâm hiện sau 300ms', () => {
    vi.stubGlobal('matchMedia', (q: string) => ({
      matches: q.includes('prefers-reduced-motion'),
      addEventListener: () => {},
      removeEventListener: () => {},
    }))
    try {
      render(<SpinScreen />)
      fireEvent.click(screen.getByRole('button', { name: 'Mở nồi!' }))
      act(() => vi.advanceTimersByTime(250))
      expect(screen.queryByRole('dialog')).toBeNull()
      act(() => vi.advanceTimersByTime(60))
      expect(screen.getByRole('dialog')).toBeInTheDocument()
    } finally {
      vi.unstubAllGlobals()
    }
  })

  it('đóng mâm thì focus về nút Mở nồi!; Tab không thoát khỏi mâm', () => {
    render(<SpinScreen />)
    screen.getByRole('button', { name: 'Mở nồi!' }).focus()
    spinAndWait()
    const dialog = screen.getByRole('dialog')
    const close = within(dialog).getByRole('button', { name: 'Để sau' })
    close.focus()
    fireEvent.keyDown(close, { key: 'Tab' })
    expect(dialog.contains(document.activeElement)).toBe(true)
    fireEvent.click(close)
    expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Mở nồi!' }))
  })

  it('rời màn Quay thì đóng mâm', () => {
    const { unmount } = render(<SpinScreen />)
    spinAndWait()
    unmount()
    expect(useTrayStore.getState().open).toBe(false)
  })

  it('mùa Thu: mọi món trên mâm là món Thu hoặc quanh năm', () => {
    render(<SpinScreen />)
    spinAndWait()
    for (const s of useTrayStore.getState().slots) {
      const tags = foodSet.seed.find((d) => d.seedKey === s.itemId)!.tags
      expect(tags.some((t) => t === 'thu' || t === 'quanh-nam')).toBe(true)
    }
  })

  it('đổi chip sang Hạ rồi quay thì chỉ ra món Hạ hoặc quanh năm', () => {
    render(<SpinScreen />)
    fireEvent.click(screen.getByRole('radio', { name: 'Hạ' }))
    expect(screen.getByRole('radio', { name: 'Hạ' })).toHaveAttribute('aria-checked', 'true')
    spinAndWait()
    for (const s of useTrayStore.getState().slots) {
      const tags = foodSet.seed.find((d) => d.seedKey === s.itemId)!.tags
      expect(tags.some((t) => t === 'ha' || t === 'quanh-nam')).toBe(true)
    }
  })

  it('nhóm hết món: riêng ô đó báo hết + "Đổi mùa" đóng mâm và focus chip mùa', () => {
    state = { ...state, data: toItems((d) => d.groupKey !== 'canh') }
    render(<SpinScreen />)
    spinAndWait()
    const dialog = screen.getByRole('dialog')
    expect(within(dialog).getByText('Hết món Canh mùa này rồi 😅')).toBeInTheDocument()
    expect(live()).toContain('Canh hết món')
    expect(within(dialog).getAllByRole('listitem')).toHaveLength(3)
    fireEvent.click(within(dialog).getByRole('button', { name: 'Đổi mùa' }))
    expect(screen.queryByRole('dialog')).toBeNull()
    expect(document.activeElement).toBe(screen.getByRole('radio', { name: 'Thu' }))
  })

  it('ô hết món → Thêm món: đóng mâm, mở form điền sẵn nhóm + mùa đang chọn; đóng form thì focus nút Quay', async () => {
    state = { ...state, data: toItems((d) => d.groupKey !== 'canh') }
    render(<SpinScreen />)
    spinAndWait()
    fireEvent.click(within(screen.getByRole('dialog', { name: 'Mâm cơm' })).getByRole('button', { name: 'Thêm món' }))
    const editor = screen.getByRole('dialog', { name: 'Thêm món' })
    expect(screen.getAllByRole('dialog')).toHaveLength(1)
    expect(within(editor).getByRole('radio', { name: 'Canh' })).toHaveAttribute('aria-checked', 'true')
    expect(within(editor).getByRole('radio', { name: 'Thu' })).toHaveAttribute('aria-checked', 'true')
    fireEvent.click(within(editor).getByRole('button', { name: 'Thôi' }))
    expect(screen.queryByRole('dialog')).toBeNull()
    vi.useRealTimers()
    await new Promise((r) => requestAnimationFrame(r))
    expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Mở nồi!' }))
  })

  it('Esc và "Để sau" đóng mâm', () => {
    render(<SpinScreen />)
    spinAndWait()
    fireEvent.keyDown(document, { key: 'Escape' })
    expect(screen.queryByRole('dialog')).toBeNull()
    spinAndWait()
    fireEvent.click(screen.getByRole('button', { name: 'Để sau' }))
    expect(screen.queryByRole('dialog')).toBeNull()
  })

  it('chưa tải xong món thì nút khoá', () => {
    state = { ...state, data: undefined, isPending: true }
    render(<SpinScreen />)
    expect(screen.getByRole('button', { name: 'Mở nồi!' })).toBeDisabled()
  })

  it('lỗi thì hiện lời nhắn thân thiện và nút Thử lại', () => {
    state = { ...state, data: undefined, error: new AppError('network'), isError: true }
    render(<SpinScreen />)
    expect(screen.getByRole('alert')).toHaveTextContent('Mất mạng rồi, kiểm tra wifi rồi thử lại nhé.')
    fireEvent.click(screen.getByRole('button', { name: 'Thử lại' }))
    expect(refetch).toHaveBeenCalledOnce()
  })

  describe('chỉnh mâm', () => {
    const nameOf = (id: string | null) => foodSet.seed.find((d) => d.seedKey === id)!.name

    it('🔒 bật/tắt giữ với nhãn Đang giữ / Không giữ; ô giữ thì 🎲 khoá', () => {
      render(<SpinScreen />)
      spinAndWait()
      const first = useTrayStore.getState().slots[0]
      const name = nameOf(first.itemId)
      const lock = screen.getByRole('button', { name: `${name}: Không giữ` })
      fireEvent.click(lock)
      expect(screen.getByRole('button', { name: `${name}: Đang giữ` })).toHaveAttribute('aria-pressed', 'true')
      expect(screen.getByRole('button', { name: `Đổi món này: ${name}` })).toBeDisabled()
      fireEvent.click(screen.getByRole('button', { name: `${name}: Đang giữ` }))
      expect(screen.getByRole('button', { name: `${name}: Không giữ` })).toHaveAttribute('aria-pressed', 'false')
    })

    it('🎲 chỉ đổi ô đó, cùng nhóm, ra món khác, và đọc món mới', () => {
      render(<SpinScreen />)
      spinAndWait()
      const before = useTrayStore.getState().slots
      for (let i = 0; i < 10; i++) {
        const cur = useTrayStore.getState().slots[1]
        fireEvent.click(screen.getByRole('button', { name: `Đổi món này: ${nameOf(cur.itemId)}` }))
        const after = useTrayStore.getState().slots
        expect(after[0]).toEqual(before[0])
        expect(after[2]).toEqual(before[2])
        expect(after[1].groupKey).toBe(before[1].groupKey)
        expect(after[1].itemId).not.toBe(cur.itemId)
        expect(live()).toContain(nameOf(after[1].itemId))
      }
    })

    it('Đổi cả mâm: ô giữ nguyên, không đóng mâm', () => {
      render(<SpinScreen />)
      spinAndWait()
      const kept = useTrayStore.getState().slots[0]
      fireEvent.click(screen.getByRole('button', { name: `${nameOf(kept.itemId)}: Không giữ` }))
      for (let i = 0; i < 5; i++) fireEvent.click(screen.getByRole('button', { name: 'Đổi cả mâm' }))
      expect(useTrayStore.getState().slots[0]).toMatchObject({ itemId: kept.itemId, locked: true })
      expect(screen.getByRole('dialog')).toBeInTheDocument()
    })

    it('＋ Thêm món → chọn nhóm: thêm ô có ✕; ô mặc định không có ✕; bỏ được', () => {
      render(<SpinScreen />)
      spinAndWait()
      expect(screen.queryByRole('button', { name: /^Bỏ ô/ })).toBeNull()
      fireEvent.click(screen.getByRole('button', { name: '＋ Thêm món' }))
      const picker = screen.getByRole('group', { name: 'Thêm món nhóm nào?' })
      fireEvent.click(within(picker).getByRole('button', { name: 'Rau' }))
      const slots = useTrayStore.getState().slots
      expect(slots).toHaveLength(4)
      expect(slots[3]).toMatchObject({ removable: true, status: 'filled' })
      expect(foodSet.seed.find((d) => d.seedKey === slots[3].itemId)!.groupKey).toBe('rau')
      const rauIds = slots.filter((x) => x.groupKey === 'rau').map((x) => x.itemId)
      expect(new Set(rauIds).size).toBe(rauIds.length)
      // Chọn nhóm xong: focus về "＋ Thêm món", mâm được đọc lại
      expect(document.activeElement).toBe(screen.getByRole('button', { name: '＋ Thêm món' }))
      expect(live()).toBe(expectedAnnouncement())
      fireEvent.click(screen.getByRole('button', { name: `Bỏ ô Rau: ${nameOf(slots[3].itemId)}` }))
      expect(useTrayStore.getState().slots).toHaveLength(3)
      expect(screen.getByRole('dialog').contains(document.activeElement)).toBe(true)
    })
  })

  describe('chi tiết món', () => {
    it('món biến mất khi đang xem chi tiết: về mâm, focus trong dialog, Esc đóng ngay', () => {
      const { rerender } = render(<SpinScreen />)
      spinAndWait()
      const slot = useTrayStore.getState().slots[0]
      const d = foodSet.seed.find((x) => x.seedKey === slot.itemId)!
      fireEvent.click(screen.getByRole('button', { name: new RegExp(`^Xem công thức: .*${d.name}`) }))
      state = { ...state, data: state.data!.filter((i) => i.id !== slot.itemId) }
      rerender(<SpinScreen />)
      expect(screen.getByRole('dialog', { name: 'Mâm cơm' })).toBeInTheDocument()
      expect(screen.getByRole('dialog').contains(document.activeElement)).toBe(true)
      fireEvent.keyDown(document, { key: 'Escape' })
      expect(screen.queryByRole('dialog')).toBeNull()
    })

    it('nút mở chi tiết vẫn đọc nhóm và độ hiếm', () => {
      render(<SpinScreen />)
      spinAndWait()
      const slot = useTrayStore.getState().slots[0]
      const d = foodSet.seed.find((x) => x.seedKey === slot.itemId)!
      const g = foodSet.groups.find((x) => x.key === d.groupKey)!.label
      const r = { 1: 'Thường', 2: 'Ngon', 3: 'Đặc biệt' }[d.rarity]
      const btn = screen.getByRole('button', { name: new RegExp(`^Xem công thức: .*${d.name}`) })
      expect(btn).toHaveAccessibleName(expect.stringContaining(g))
      expect(btn).toHaveAccessibleName(expect.stringContaining(r))
    })

    it('chạm ô mở chi tiết trong cùng dialog; Về mâm quay lại đúng mâm và focus về ô', () => {
      render(<SpinScreen />)
      spinAndWait()
      const slot = useTrayStore.getState().slots[1]
      fireEvent.click(screen.getByRole('button', { name: `${foodSet.seed.find((d) => d.seedKey === slot.itemId)!.name}: Không giữ` }))
      const before = useTrayStore.getState().slots
      const d = foodSet.seed.find((x) => x.seedKey === slot.itemId)!
      fireEvent.click(screen.getByRole('button', { name: new RegExp(`^Xem công thức: .*${d.name}`) }))
      expect(screen.getAllByRole('dialog')).toHaveLength(1)
      const heading = screen.getByRole('heading', { level: 2, name: d.name })
      expect(document.activeElement).toBe(heading)
      expect(screen.getByRole('heading', { name: 'Các bước' })).toBeInTheDocument()
      fireEvent.click(screen.getByRole('button', { name: '← Về mâm' }))
      expect(useTrayStore.getState().slots).toEqual(before)
      expect(document.activeElement).toBe(screen.getByRole('button', { name: new RegExp(`^Xem công thức: .*${d.name}`) }))
    })

    it('Esc ở chi tiết thì về mâm, Esc lần nữa thì đóng mâm', () => {
      render(<SpinScreen />)
      spinAndWait()
      const d = foodSet.seed.find((x) => x.seedKey === useTrayStore.getState().slots[0].itemId)!
      fireEvent.click(screen.getByRole('button', { name: new RegExp(`^Xem công thức: .*${d.name}`) }))
      expect(screen.getByRole('dialog', { name: `Chi tiết món ${d.name}` })).toBeInTheDocument()
      fireEvent.keyDown(document, { key: 'Escape' })
      expect(screen.getByRole('button', { name: 'Đổi cả mâm' })).toBeInTheDocument()
      expect(document.activeElement).toBe(screen.getByRole('button', { name: new RegExp(`^Xem công thức: .*${d.name}`) }))
      fireEvent.keyDown(document, { key: 'Escape' })
      expect(screen.queryByRole('dialog')).toBeNull()
    })
  })

  describe('chốt mâm', () => {
    it('Chốt mâm! gửi entries đúng thứ tự trên mâm, thành công thì đóng mâm và báo ngắn', () => {
      render(<SpinScreen />)
      spinAndWait()
      const slots = useTrayStore.getState().slots
      fireEvent.click(screen.getByRole('button', { name: 'Chốt mâm!' }))
      expect(commitMutate).toHaveBeenCalledOnce()
      const [input] = commitMutate.mock.calls[0]
      expect(input.id).toMatch(/^[a-z0-9]{15}$/)
      expect(input.replaceId).toBeNull()
      expect(input.entries).toEqual(
        slots.map((sl, order) => {
          const d = foodSet.seed.find((x) => x.seedKey === sl.itemId)!
          return { itemId: sl.itemId, groupKey: sl.groupKey, name: d.name, rarity: d.rarity, order }
        }),
      )
      act(() => onCommitted!())
      act(() => vi.advanceTimersByTime(10))
      expect(screen.queryByRole('dialog')).toBeNull()
      expect(useTrayStore.getState().slots).toEqual([])
      expect(screen.getByRole('status')).toHaveTextContent('Chốt rồi!')
      expect(document.activeElement).toBe(screen.getByRole('status'))
    })

    it('đang chốt thì khoá mọi nút trên mâm và không đóng được', () => {
      const { rerender } = render(<SpinScreen />)
      spinAndWait()
      commitState = { isPending: true, error: null }
      rerender(<SpinScreen />)
      const dialog = screen.getByRole('dialog')
      for (const b of within(dialog).getAllByRole('button')) expect(b).toBeDisabled()
      fireEvent.keyDown(document, { key: 'Escape' })
      expect(screen.getByRole('dialog')).toBeInTheDocument()
    })

    it('lỗi: giữ mâm, hiện lời nhắn; Thử lại dùng đúng ID cũ', () => {
      const { rerender } = render(<SpinScreen />)
      spinAndWait()
      const before = useTrayStore.getState().slots
      fireEvent.click(screen.getByRole('button', { name: 'Chốt mâm!' }))
      const [first, opts] = commitMutate.mock.calls[0]
      act(() => opts!.onError!())
      commitState = { isPending: false, error: new AppError('network') }
      rerender(<SpinScreen />)
      expect(useTrayStore.getState().slots).toEqual(before)
      const alert = within(screen.getByRole('dialog')).getByRole('alert')
      expect(alert).toHaveTextContent('Mất mạng rồi')
      fireEvent.click(within(alert).getByRole('button', { name: 'Thử lại' }))
      const retry = commitMutate.mock.calls.at(-1)![0]
      expect(retry.id).toBe(first.id)
      expect(retry.replaceId).toBeNull()
    })

    it('lỗi rồi đổi mâm: lời nhắn cũ ẩn, lần chốt sau là ID mới và xoá bản ghi của lần lỗi', () => {
      const { rerender } = render(<SpinScreen />)
      spinAndWait()
      fireEvent.click(screen.getByRole('button', { name: 'Chốt mâm!' }))
      const [first, opts] = commitMutate.mock.calls[0]
      act(() => opts!.onError!())
      commitState = { isPending: false, error: new AppError('network') }
      rerender(<SpinScreen />)
      const cur = useTrayStore.getState().slots[0]
      const d = foodSet.seed.find((x) => x.seedKey === cur.itemId)!
      fireEvent.click(screen.getByRole('button', { name: `Đổi món này: ${d.name}` }))
      expect(within(screen.getByRole('dialog')).queryByRole('alert')).toBeNull()
      fireEvent.click(screen.getByRole('button', { name: 'Chốt mâm!' }))
      const next = commitMutate.mock.calls.at(-1)![0]
      expect(next.id).not.toBe(first.id)
      expect(next.replaceId).toBe(first.id)
    })

    it('đang tải mâm gần đây thì chưa quay; tải lỗi thì báo và chưa quay', () => {
      recentState = { isPending: true, fetchStatus: 'fetching', error: null }
      const { rerender } = render(<SpinScreen />)
      expect(screen.getByRole('button', { name: 'Mở nồi!' })).toBeDisabled()
      recentState = { isPending: false, fetchStatus: 'idle', error: new AppError('network') }
      rerender(<SpinScreen />)
      expect(screen.getByRole('button', { name: 'Mở nồi!' })).toBeDisabled()
      expect(screen.getByRole('alert')).toHaveTextContent('Mất mạng rồi')
    })

    it('mâm không có món nào thì không chốt được', () => {
      state = { ...state, data: [] }
      render(<SpinScreen />)
      spinAndWait()
      expect(screen.getByRole('button', { name: 'Chốt mâm!' })).toBeDisabled()
    })

    it('đã có mâm chốt thì không hiện gợi ý lần đầu', () => {
      hasDraws = true
      render(<SpinScreen />)
      expect(screen.queryByText('Mở thử đi cả nhà!')).toBeNull()
    })

    it('món vừa chốt hôm nay không ra lại', () => {
      // chỉ còn 2 món Mặn, một món vừa chốt → luôn ra món còn lại
      const man = foodSet.seed.filter((d) => d.groupKey === 'man').slice(0, 2)
      state = { ...state, data: toItems((d) => d.groupKey !== 'man' || man.includes(d)) }
      recent = [{ chosenAt: new Date().toISOString(), entries: [{ itemId: man[0].seedKey }] }]
      render(<SpinScreen />)
      for (let i = 0; i < 8; i++) {
        spinAndWait()
        const manSlot = useTrayStore.getState().slots.find((sl) => sl.groupKey === 'man')!
        expect(manSlot.itemId).toBe(man[1].seedKey)
        fireEvent.click(screen.getByRole('button', { name: 'Để sau' }))
      }
    })
  })
})
