import { act, fireEvent, render, screen, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { AppError } from '../../data/errors'
import type { Item, ItemsResult } from '../../data/items'
import { foodSet } from '../../sets/food/definition'
import { BURST_MS } from '../../ui/RarityBurst'
import { FLIP_MS, LEGEND_BEAT_MS, REVEAL_FIRST_MS, REVEAL_SETTLE_MS, REVEAL_STEP_MS } from '../tray/MealTray'
import { useTrayStore } from '../tray/store'
import { LID_LEAD_MS, SpinScreen, TEASE_MS } from './SpinScreen'

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

const fb = vi.hoisted(() => ({ feedback: vi.fn(), unlock: vi.fn(), preload: vi.fn() }))
vi.mock('../../ui/feedback', () => ({ rarityFeedback: fb.feedback }))
vi.mock('../../ui/sound', () => ({ unlockAudio: fb.unlock, preloadSounds: fb.preload, playRaritySound: vi.fn() }))
const setConfigMock = vi.hoisted(() => ({ cooldownDays: null as number | null, loaded: true, failed: false, refetch: vi.fn() }))
vi.mock('../../data/setConfig', () => ({
  useSetConfig: () => ({
    data: setConfigMock.loaded ? { cooldownDays: setConfigMock.cooldownDays } : undefined,
    error: setConfigMock.failed ? { message: 'Mất mạng rồi' } : null,
    refetch: setConfigMock.refetch,
  }),
  useSaveCooldown: () => ({ mutate: vi.fn(), reset: vi.fn(), isPending: false, error: null, ready: true }),
}))
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
  useUpdateItem: () => ({ mutate: vi.fn(), reset: vi.fn(), isPending: false, error: null, ready: true }),
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

/** Nồi sôi xong, nắp bật tới đỉnh: mâm vừa mở (chưa bật thẻ nào). */
function spinToTray() {
  fireEvent.click(screen.getByRole('button', { name: 'Mở nồi!' }))
  act(() => vi.advanceTimersByTime(1600))
  // mâm có ⭐⭐⭐ thì nồi nhá hàng trước
  if (document.querySelector('.gacha-pot--teasing')) act(() => vi.advanceTimersByTime(TEASE_MS))
  act(() => vi.advanceTimersByTime(LID_LEAD_MS))
}

function spinAndWait() {
  spinToTray()
  // thẻ bật lần lượt (kể cả nhịp ⭐⭐⭐ và hiệu ứng thẻ cuối) rồi mâm mở khoá
  act(() => vi.advanceTimersByTime(5000))
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
    fb.feedback.mockClear()
    fb.unlock.mockClear()
    fb.preload.mockClear()
    window.localStorage.removeItem('noi-than:sound')
    useTrayStore.setState({ ...initialTray, open: false, slots: [], commitId: null })
    commitMutate.mockReset()
    commitState = { isPending: false, error: null }
    recent = []
    recentState = { isPending: false, fetchStatus: 'idle', error: null }
    onCommitted = undefined
    hasDraws = false
    setConfigMock.cooldownDays = null
    setConfigMock.loaded = true
    setConfigMock.failed = false
    state = { data: toItems(), all: toItems(), error: null, isPending: false, isError: false, refetch }
  })

  afterEach(() => vi.useRealTimers())

  it('mặc định chọn mùa theo tháng (tháng 9 → Thu), có gợi ý lần đầu và tiêu đề Bộ', () => {
    render(<SpinScreen />, { wrapper: MemoryRouter })
    expect(screen.getByRole('radio', { name: 'Thu' })).toHaveAttribute('aria-checked', 'true')
    expect(screen.getByText('Mở thử đi cả nhà!')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Bộ: Món ăn/ })).toHaveAttribute('aria-disabled', 'true')
  })

  it('quay: khoá khi đang sôi, chạm thêm không quay lại, xong thì mở mâm 3 ô và đọc đúng câu', () => {
    const showResult = vi.spyOn(useTrayStore.getState(), 'showResult')
    useTrayStore.setState({ showResult })
    // không có ⭐⭐⭐ (không nhá hàng, không nhịp chậm): thời gian cố định
    state = { ...state, data: toItems((d) => d.rarity !== 3) }
    render(<SpinScreen />, { wrapper: MemoryRouter })
    fireEvent.click(screen.getByRole('button', { name: 'Mở nồi!' }))
    expect(screen.getByRole('button', { name: 'Nồi đang sôi…' })).toHaveAttribute('aria-disabled', 'true')
    act(() => vi.advanceTimersByTime(500))
    fireEvent.click(screen.getByRole('button', { name: 'Nồi đang sôi…' }))
    fireEvent.click(screen.getByRole('button', { name: 'Nồi đang sôi…' }))
    expect(screen.queryByRole('dialog')).toBeNull()
    act(() => vi.advanceTimersByTime(1000))
    // nắp bật trước, mâm mở khi nắp lên tới đỉnh
    expect(document.querySelector('.gacha-pot--opening')).not.toBeNull()
    expect(screen.queryByRole('dialog')).toBeNull()
    act(() => vi.advanceTimersByTime(LID_LEAD_MS))
    expect(showResult).toHaveBeenCalledOnce()
    const dialog = screen.getByRole('dialog', { name: 'Mâm cơm' })
    const order = useTrayStore.getState().slots.map((sl) => sl.itemId)
    const names = () => within(dialog).queryAllByRole('listitem').map((li) => li.querySelector('.meal-slot__name')?.textContent)
    const nameOf = (id: string | null) => foodSet.seed.find((d) => d.seedKey === id)?.name

    // thẻ bật lần lượt theo đúng thứ tự engine; lúc bật chưa đọc và mâm khoá
    expect(names()).toEqual([])
    act(() => vi.advanceTimersByTime(REVEAL_FIRST_MS))
    expect(names()).toEqual(order.slice(0, 1).map(nameOf))
    expect(within(dialog).getByRole('button', { name: 'Chốt mâm!' })).toBeDisabled()
    act(() => vi.advanceTimersByTime(REVEAL_STEP_MS))
    expect(names()).toEqual(order.slice(0, 2).map(nameOf))
    act(() => vi.advanceTimersByTime(REVEAL_STEP_MS))
    expect(names()).toEqual(order.map(nameOf))
    act(() => vi.advanceTimersByTime(REVEAL_SETTLE_MS - 1))
    expect(live()).toBe('')
    act(() => vi.advanceTimersByTime(1))
    act(() => vi.advanceTimersByTime(60))
    expect(within(dialog).getByRole('button', { name: 'Chốt mâm!' })).toBeEnabled()
    expect(dialog).toHaveFocus()
    // nắp đã về chỗ
    expect(document.querySelector('.gacha-pot--opening')).toBeNull()
    // câu đọc đầy đủ: nhóm, tên, bậc theo đúng thứ tự trên mâm
    expect(live()).toBe(expectedAnnouncement())
    expect(live()).not.toContain('undefined')
  })

  it('chạm khi đang bật thẻ: hiện cả mâm ngay, mở khoá, đọc mâm một lần', () => {
    render(<SpinScreen />, { wrapper: MemoryRouter })
    spinToTray()
    act(() => vi.advanceTimersByTime(REVEAL_FIRST_MS))
    const dialog = screen.getByRole('dialog', { name: 'Mâm cơm' })
    expect(within(dialog).getAllByRole('listitem')).toHaveLength(1)
    // chạm nền lúc đang bật: bỏ qua, không đóng mâm
    fireEvent.click(screen.getByTestId('reveal-skip'))
    expect(within(dialog).getAllByRole('listitem')).toHaveLength(3)
    expect(screen.queryByRole('button', { name: 'Hiện cả mâm ngay' })).toBeNull()
    expect(within(dialog).getByRole('button', { name: 'Chốt mâm!' })).toBeEnabled()
    act(() => vi.advanceTimersByTime(60))
    expect(live()).toBe(expectedAnnouncement())
    // hết giờ của chuỗi cũ cũng không làm gì thêm
    act(() => vi.advanceTimersByTime(3000))
    expect(within(dialog).getAllByRole('listitem')).toHaveLength(3)
  })

  it('bàn phím: Enter trên mâm hoặc nút ẩn "Hiện cả mâm ngay" bỏ qua phần bật thẻ', () => {
    render(<SpinScreen />, { wrapper: MemoryRouter })
    spinToTray()
    const dialog = screen.getByRole('dialog', { name: 'Mâm cơm' })
    // nút bỏ qua nằm trong dialog (trình đọc thấy, Tab tới được)
    expect(within(dialog).getByRole('button', { name: 'Hiện cả mâm ngay' })).toBeInTheDocument()
    fireEvent.keyDown(dialog, { key: 'Enter' })
    expect(within(dialog).getAllByRole('listitem')).toHaveLength(3)
    expect(within(dialog).queryByRole('button', { name: 'Hiện cả mâm ngay' })).toBeNull()
    // lần sau: bấm nút ẩn
    fireEvent.click(within(dialog).getByRole('button', { name: 'Để sau' }))
    spinToTray()
    fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Hiện cả mâm ngay' }))
    expect(within(screen.getByRole('dialog')).getAllByRole('listitem')).toHaveLength(3)
  })

  it('Esc khi đang bật: đóng mâm; mở lại mâm cũ thì hiện đủ, không bật lại', () => {
    render(<SpinScreen />, { wrapper: MemoryRouter })
    spinToTray()
    act(() => vi.advanceTimersByTime(REVEAL_FIRST_MS))
    fireEvent.keyDown(document, { key: 'Escape' })
    expect(screen.queryByRole('dialog')).toBeNull()
    act(() => useTrayStore.setState({ open: true }))
    expect(within(screen.getByRole('dialog')).getAllByRole('listitem')).toHaveLength(3)
    expect(screen.queryByRole('button', { name: 'Hiện cả mâm ngay' })).toBeNull()
  })

  it('giảm chuyển động: mâm hiện sau 300ms', () => {
    vi.stubGlobal('matchMedia', (q: string) => ({
      matches: q.includes('prefers-reduced-motion'),
      addEventListener: () => {},
      removeEventListener: () => {},
    }))
    try {
      render(<SpinScreen />, { wrapper: MemoryRouter })
      fireEvent.click(screen.getByRole('button', { name: 'Mở nồi!' }))
      act(() => vi.advanceTimersByTime(250))
      expect(screen.queryByRole('dialog')).toBeNull()
      act(() => vi.advanceTimersByTime(60))
      const dialog = screen.getByRole('dialog')
      // không bật lần lượt, nắp không bật: cả mâm ngay, mở khoá, không có nút bỏ qua
      expect(within(dialog).getAllByRole('listitem')).toHaveLength(3)
      expect(within(dialog).getByRole('button', { name: 'Chốt mâm!' })).toBeEnabled()
      expect(screen.queryByRole('button', { name: 'Hiện cả mâm ngay' })).toBeNull()
      expect(document.querySelector('.gacha-pot--opening')).toBeNull()
      act(() => vi.advanceTimersByTime(60))
      expect(live()).toBe(expectedAnnouncement())
    } finally {
      vi.unstubAllGlobals()
    }
  })

  it('đóng mâm thì focus về nút Mở nồi!; Tab không thoát khỏi mâm', () => {
    render(<SpinScreen />, { wrapper: MemoryRouter })
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
    const { unmount } = render(<SpinScreen />, { wrapper: MemoryRouter })
    spinAndWait()
    unmount()
    expect(useTrayStore.getState().open).toBe(false)
  })

  it('mùa Thu: mọi món trên mâm là món Thu hoặc quanh năm', () => {
    render(<SpinScreen />, { wrapper: MemoryRouter })
    spinAndWait()
    for (const s of useTrayStore.getState().slots) {
      const tags = foodSet.seed.find((d) => d.seedKey === s.itemId)!.tags
      expect(tags.some((t) => t === 'thu' || t === 'quanh-nam')).toBe(true)
    }
  })

  it('đổi chip sang Hạ rồi quay thì chỉ ra món Hạ hoặc quanh năm', () => {
    render(<SpinScreen />, { wrapper: MemoryRouter })
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
    render(<SpinScreen />, { wrapper: MemoryRouter })
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
    render(<SpinScreen />, { wrapper: MemoryRouter })
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

  it('Sửa món từ chi tiết trên mâm: đóng mâm, mở form; xong mở lại mâm như cũ và hiện dữ liệu mới', () => {
    const { rerender } = render(<SpinScreen />, { wrapper: MemoryRouter })
    spinAndWait()
    const slot = useTrayStore.getState().slots[0]
    const d = foodSet.seed.find((x) => x.seedKey === slot.itemId)!
    fireEvent.click(screen.getByRole('button', { name: `${d.name}: Không giữ` }))
    const before = useTrayStore.getState().slots
    fireEvent.click(screen.getByRole('button', { name: new RegExp(`^Xem công thức: .*${d.name}`) }))
    fireEvent.click(screen.getByRole('button', { name: 'Sửa' }))
    expect(screen.getByRole('dialog', { name: 'Sửa món' })).toBeInTheDocument()
    expect(screen.getAllByRole('dialog')).toHaveLength(1)
    // món được sửa (tên + độ hiếm) trong lúc form mở
    const newRarity = d.rarity === 3 ? 1 : 3
    state = { ...state, data: state.data!.map((i) => (i.id === d.seedKey ? { ...i, name: 'Tên mới', rarity: newRarity } : i)) }
    rerender(<SpinScreen />)
    fireEvent.click(screen.getByRole('button', { name: 'Thôi' }))
    const tray = screen.getByRole('dialog', { name: 'Mâm cơm' })
    expect(useTrayStore.getState().slots).toEqual(before)
    expect(within(tray).getByText('Tên mới')).toBeInTheDocument()
    const label = { 1: 'Thường', 2: 'Ngon', 3: 'Đặc biệt' }[newRarity]
    expect(within(tray).getByRole('button', { name: new RegExp(`Tên mới, ${label}$`) })).toBeInTheDocument()
  })

  it('Esc và "Để sau" đóng mâm', () => {
    render(<SpinScreen />, { wrapper: MemoryRouter })
    spinAndWait()
    fireEvent.keyDown(document, { key: 'Escape' })
    expect(screen.queryByRole('dialog')).toBeNull()
    spinAndWait()
    fireEvent.click(screen.getByRole('button', { name: 'Để sau' }))
    expect(screen.queryByRole('dialog')).toBeNull()
  })

  it('chưa tải xong món thì nút khoá', () => {
    state = { ...state, data: undefined, isPending: true }
    render(<SpinScreen />, { wrapper: MemoryRouter })
    expect(screen.getByRole('button', { name: 'Mở nồi!' })).toBeDisabled()
  })

  it('lỗi thì hiện lời nhắn thân thiện và nút Thử lại', () => {
    state = { ...state, data: undefined, error: new AppError('network'), isError: true }
    render(<SpinScreen />, { wrapper: MemoryRouter })
    expect(screen.getByRole('alert')).toHaveTextContent('Mất mạng rồi, kiểm tra wifi rồi thử lại nhé.')
    fireEvent.click(screen.getByRole('button', { name: 'Thử lại' }))
    expect(refetch).toHaveBeenCalledOnce()
  })

  describe('chỉnh mâm', () => {
    const nameOf = (id: string | null) => foodSet.seed.find((d) => d.seedKey === id)!.name

    it('🔒 bật/tắt giữ với nhãn Đang giữ / Không giữ; ô giữ thì 🎲 khoá', () => {
      render(<SpinScreen />, { wrapper: MemoryRouter })
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
      render(<SpinScreen />, { wrapper: MemoryRouter })
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
      render(<SpinScreen />, { wrapper: MemoryRouter })
      spinAndWait()
      const kept = useTrayStore.getState().slots[0]
      fireEvent.click(screen.getByRole('button', { name: `${nameOf(kept.itemId)}: Không giữ` }))
      for (let i = 0; i < 5; i++) fireEvent.click(screen.getByRole('button', { name: 'Đổi cả mâm' }))
      expect(useTrayStore.getState().slots[0]).toMatchObject({ itemId: kept.itemId, locked: true })
      expect(screen.getByRole('dialog')).toBeInTheDocument()
    })

    it('＋ Thêm món → chọn nhóm: thêm ô có ✕; ô mặc định không có ✕; bỏ được', () => {
      render(<SpinScreen />, { wrapper: MemoryRouter })
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
      const { rerender } = render(<SpinScreen />, { wrapper: MemoryRouter })
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
      render(<SpinScreen />, { wrapper: MemoryRouter })
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
      render(<SpinScreen />, { wrapper: MemoryRouter })
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
      render(<SpinScreen />, { wrapper: MemoryRouter })
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
      render(<SpinScreen />, { wrapper: MemoryRouter })
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
      const { rerender } = render(<SpinScreen />, { wrapper: MemoryRouter })
      spinAndWait()
      commitState = { isPending: true, error: null }
      rerender(<SpinScreen />)
      const dialog = screen.getByRole('dialog')
      for (const b of within(dialog).getAllByRole('button')) expect(b).toBeDisabled()
      fireEvent.keyDown(document, { key: 'Escape' })
      expect(screen.getByRole('dialog')).toBeInTheDocument()
    })

    it('lỗi: giữ mâm, hiện lời nhắn; Thử lại dùng đúng ID cũ', () => {
      const { rerender } = render(<SpinScreen />, { wrapper: MemoryRouter })
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
      const { rerender } = render(<SpinScreen />, { wrapper: MemoryRouter })
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
      const { rerender } = render(<SpinScreen />, { wrapper: MemoryRouter })
      expect(screen.getByRole('button', { name: 'Mở nồi!' })).toBeDisabled()
      recentState = { isPending: false, fetchStatus: 'idle', error: new AppError('network') }
      rerender(<SpinScreen />)
      expect(screen.getByRole('button', { name: 'Mở nồi!' })).toBeDisabled()
      expect(screen.getByRole('alert')).toHaveTextContent('Mất mạng rồi')
    })

    it('mâm không có món nào thì không chốt được', () => {
      state = { ...state, data: [] }
      render(<SpinScreen />, { wrapper: MemoryRouter })
      spinAndWait()
      expect(screen.getByRole('button', { name: 'Chốt mâm!' })).toBeDisabled()
    })

    it('đã có mâm chốt thì không hiện gợi ý lần đầu', () => {
      hasDraws = true
      render(<SpinScreen />, { wrapper: MemoryRouter })
      expect(screen.queryByText('Mở thử đi cả nhà!')).toBeNull()
    })

    it('món vừa chốt hôm nay không ra lại', () => {
      // chỉ còn 2 món Mặn, một món vừa chốt → luôn ra món còn lại
      const man = foodSet.seed.filter((d) => d.groupKey === 'man').slice(0, 2)
      state = { ...state, data: toItems((d) => d.groupKey !== 'man' || man.includes(d)) }
      recent = [{ chosenAt: new Date().toISOString(), entries: [{ itemId: man[0].seedKey }] }]
      render(<SpinScreen />, { wrapper: MemoryRouter })
      for (let i = 0; i < 8; i++) {
        spinAndWait()
        const manSlot = useTrayStore.getState().slots.find((sl) => sl.groupKey === 'man')!
        expect(manSlot.itemId).toBe(man[1].seedKey)
        fireEvent.click(screen.getByRole('button', { name: 'Để sau' }))
      }
    })
  })

  describe('cài đặt', () => {
    it('nút bánh răng dẫn tới màn Cài đặt', () => {
      render(<SpinScreen />, { wrapper: MemoryRouter })
      expect(screen.getByRole('link', { name: 'Mở cài đặt' })).toHaveAttribute('href', '/cai-dat')
    })

    it('chưa tải xong cấu hình thì chưa quay', () => {
      setConfigMock.loaded = false
      render(<SpinScreen />, { wrapper: MemoryRouter })
      expect(screen.getByRole('button', { name: 'Mở nồi!' })).toBeDisabled()
    })

    it('tải cấu hình lỗi: báo lỗi, Thử lại tải lại cấu hình, chưa quay', () => {
      setConfigMock.loaded = false
      setConfigMock.failed = true
      render(<SpinScreen />, { wrapper: MemoryRouter })
      expect(screen.getByRole('alert')).toHaveTextContent('Mất mạng rồi')
      expect(screen.getByRole('button', { name: 'Mở nồi!' })).toBeDisabled()
      fireEvent.click(screen.getByRole('button', { name: 'Thử lại' }))
      expect(setConfigMock.refetch).toHaveBeenCalled()
    })

    it('nhà đặt 0 ngày: món vừa chốt vẫn có thể ra lại', () => {
      setConfigMock.cooldownDays = 0
      const man = foodSet.seed.filter((d) => d.groupKey === 'man').slice(0, 2)
      state = { ...state, data: toItems((d) => d.groupKey !== 'man' || man.includes(d)) }
      recent = [{ chosenAt: new Date().toISOString(), entries: [{ itemId: man[0].seedKey }] }]
      render(<SpinScreen />, { wrapper: MemoryRouter })
      const seen = new Set<string | null>()
      for (let i = 0; i < 40 && !seen.has(man[0].seedKey); i++) {
        spinAndWait()
        seen.add(useTrayStore.getState().slots.find((sl) => sl.groupKey === 'man')!.itemId)
        fireEvent.click(screen.getByRole('button', { name: 'Để sau' }))
      }
      expect(seen.has(man[0].seedKey)).toBe(true)
    })
  })

  describe('hiệu ứng độ hiếm', () => {
    const bursts = (rarity?: number) =>
      document.querySelectorAll(rarity ? `[data-rarity-burst="${rarity}"]` : '[data-rarity-burst]')

    it('mâm có ⭐⭐⭐: nồi nhá hàng một lần rồi mới bật nắp; nút Quay khoá suốt; thẻ ⭐⭐⭐ chậm một nhịp, hiệu ứng riêng, mâm mở khoá khi hết hiệu ứng', () => {
      // Mặn chỉ còn món ⭐⭐⭐, Rau/Canh chỉ món ⭐
      state = { ...state, data: toItems((d) => (d.groupKey === 'man' ? d.rarity === 3 : d.rarity === 1)) }
      render(<SpinScreen />, { wrapper: MemoryRouter })
      fireEvent.click(screen.getByRole('button', { name: 'Mở nồi!' }))
      act(() => vi.advanceTimersByTime(1600))
      expect(document.querySelector('.gacha-pot--teasing')).not.toBeNull()
      expect(screen.getByRole('button', { name: 'Nồi đang sôi…' })).toHaveAttribute('aria-disabled', 'true')
      expect(screen.queryByRole('dialog')).toBeNull()
      act(() => vi.advanceTimersByTime(TEASE_MS))
      expect(document.querySelector('.gacha-pot--teasing')).toBeNull()
      expect(document.querySelector('.gacha-pot--opening')).not.toBeNull()
      // có ⭐⭐⭐ thì không lóe xanh
      expect(document.querySelector('.gacha-pot--flash-rare')).toBeNull()
      act(() => vi.advanceTimersByTime(LID_LEAD_MS))
      const dialog = screen.getByRole('dialog', { name: 'Mâm cơm' })
      // ⭐⭐⭐ ra cuối
      expect(useTrayStore.getState().slots.map((sl) => sl.rarity)).toEqual([1, 1, 3])

      act(() => vi.advanceTimersByTime(REVEAL_FIRST_MS))
      expect(bursts(1)).toHaveLength(1)
      act(() => vi.advanceTimersByTime(REVEAL_STEP_MS))
      expect(within(dialog).getAllByRole('listitem')).toHaveLength(2)
      // thẻ ⭐⭐⭐ chậm hơn một nhịp
      act(() => vi.advanceTimersByTime(REVEAL_STEP_MS))
      expect(within(dialog).getAllByRole('listitem')).toHaveLength(2)
      act(() => vi.advanceTimersByTime(LEGEND_BEAT_MS))
      expect(within(dialog).getAllByRole('listitem')).toHaveLength(3)
      expect(bursts(3)).toHaveLength(1)
      // chữ "Đặc biệt!" chỉ để nhìn, trình đọc không đọc lại
      expect(screen.getByText('Đặc biệt!').closest('[aria-hidden="true"]')).not.toBeNull()
      // mâm chưa mở khoá tới khi hết hiệu ứng ⭐⭐⭐
      act(() => vi.advanceTimersByTime(REVEAL_SETTLE_MS))
      expect(within(dialog).getByRole('button', { name: 'Chốt mâm!' })).toBeDisabled()
      act(() => vi.advanceTimersByTime(BURST_MS[3] - REVEAL_SETTLE_MS))
      expect(within(dialog).getByRole('button', { name: 'Chốt mâm!' })).toBeEnabled()
      expect(bursts()).toHaveLength(0)
    })

    it('mâm có ⭐⭐ (không ⭐⭐⭐): không nhá hàng, nắp lóe xanh; mỗi thẻ vệt xanh', () => {
      state = { ...state, data: toItems((d) => d.rarity === 2) }
      render(<SpinScreen />, { wrapper: MemoryRouter })
      fireEvent.click(screen.getByRole('button', { name: 'Mở nồi!' }))
      act(() => vi.advanceTimersByTime(1600))
      expect(document.querySelector('.gacha-pot--teasing')).toBeNull()
      expect(document.querySelector('.gacha-pot--flash-rare')).not.toBeNull()
      act(() => vi.advanceTimersByTime(LID_LEAD_MS))
      act(() => vi.advanceTimersByTime(REVEAL_FIRST_MS))
      expect(bursts(2)).toHaveLength(1)
      act(() => vi.advanceTimersByTime(REVEAL_STEP_MS))
      expect(bursts(2)).toHaveLength(2)
      // hiệu ứng tự tắt
      act(() => vi.advanceTimersByTime(3000))
      act(() => vi.advanceTimersByTime(BURST_MS[2]))
      expect(bursts()).toHaveLength(0)
    })

    it('bỏ qua khi đang có hiệu ứng: dừng hết hiệu ứng, hiện cả mâm', () => {
      state = { ...state, data: toItems((d) => (d.groupKey === 'man' ? d.rarity === 3 : d.rarity === 1)) }
      render(<SpinScreen />, { wrapper: MemoryRouter })
      spinToTray()
      act(() => vi.advanceTimersByTime(REVEAL_FIRST_MS))
      expect(bursts()).toHaveLength(1)
      fireEvent.click(screen.getByTestId('reveal-skip'))
      expect(bursts()).toHaveLength(0)
      expect(within(screen.getByRole('dialog')).getAllByRole('listitem')).toHaveLength(3)
    })

    it('🎲: ô lật xong thì chạy hiệu ứng theo bậc món mới, focus giữ ở 🎲', () => {
      state = { ...state, data: toItems((d) => d.rarity === 2) }
      render(<SpinScreen />, { wrapper: MemoryRouter })
      spinAndWait()
      act(() => vi.advanceTimersByTime(BURST_MS[2]))
      expect(bursts()).toHaveLength(0)
      const slot = useTrayStore.getState().slots[0]
      const d = foodSet.seed.find((x) => x.seedKey === slot.itemId)!
      const dice = screen.getByRole('button', { name: `Đổi món này: ${d.name}` })
      dice.focus()
      fireEvent.click(dice)
      expect(bursts()).toHaveLength(0)
      act(() => vi.advanceTimersByTime(FLIP_MS))
      expect(bursts(2)).toHaveLength(1)
      expect(document.activeElement?.getAttribute('aria-label')).toMatch(/^Đổi món này: /)
    })

    const legendMan = () => toItems((d) => (d.groupKey === 'man' ? d.rarity === 3 : d.rarity === 1))

    it('chạm lại khi đang nhá hàng / nắp đang bật: không quay lại, mâm vẫn là mâm đã nhá', () => {
      const showResult = vi.spyOn(useTrayStore.getState(), 'showResult')
      useTrayStore.setState({ showResult })
      state = { ...state, data: legendMan() }
      render(<SpinScreen />, { wrapper: MemoryRouter })
      fireEvent.click(screen.getByRole('button', { name: 'Mở nồi!' }))
      act(() => vi.advanceTimersByTime(1600))
      fireEvent.click(screen.getByRole('button', { name: 'Nồi đang sôi…' }))
      act(() => vi.advanceTimersByTime(TEASE_MS))
      // nắp bật sau nhá hàng: khe vàng tắt dần
      expect(document.querySelector('.gacha-pot--flash-legend')).not.toBeNull()
      fireEvent.click(screen.getByRole('button', { name: 'Nồi đang sôi…' }))
      act(() => vi.advanceTimersByTime(LID_LEAD_MS))
      act(() => vi.advanceTimersByTime(5000))
      expect(showResult).toHaveBeenCalledOnce()
      expect(useTrayStore.getState().slots.map((sl) => sl.rarity)).toEqual([1, 1, 3])
      // nhá hàng chỉ một lần
      expect(document.querySelector('.gacha-pot--teasing')).toBeNull()
    })

    it('rời màn Quay khi đang nhá hàng: không mở mâm, không lỗi', () => {
      state = { ...state, data: legendMan() }
      const { unmount } = render(<SpinScreen />, { wrapper: MemoryRouter })
      fireEvent.click(screen.getByRole('button', { name: 'Mở nồi!' }))
      act(() => vi.advanceTimersByTime(1600))
      unmount()
      act(() => vi.advanceTimersByTime(5000))
      expect(useTrayStore.getState().open).toBe(false)
    })

    it('hai món ⭐⭐⭐: mỗi thẻ hiệu ứng riêng, mâm khoá tới khi hiệu ứng cuối xong', () => {
      state = { ...state, data: toItems((d) => (d.groupKey === 'canh' ? d.rarity === 1 : d.rarity === 3)) }
      render(<SpinScreen />, { wrapper: MemoryRouter })
      spinToTray()
      expect(useTrayStore.getState().slots.map((sl) => sl.rarity)).toEqual([1, 3, 3])
      act(() => vi.advanceTimersByTime(REVEAL_FIRST_MS))
      act(() => vi.advanceTimersByTime(REVEAL_STEP_MS + LEGEND_BEAT_MS))
      act(() => vi.advanceTimersByTime(REVEAL_STEP_MS + LEGEND_BEAT_MS))
      expect(bursts(3)).toHaveLength(2)
      act(() => vi.advanceTimersByTime(BURST_MS[3] - 1))
      expect(screen.getByRole('button', { name: 'Chốt mâm!' })).toBeDisabled()
      act(() => vi.advanceTimersByTime(1))
      expect(screen.getByRole('button', { name: 'Chốt mâm!' })).toBeEnabled()
    })

    it.each([
      ['Enter trên mâm', () => fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Enter' })],
      ['nút ẩn "Hiện cả mâm ngay"', () => fireEvent.click(screen.getByRole('button', { name: 'Hiện cả mâm ngay' }))],
    ])('bỏ qua bằng %s khi đang có hiệu ứng: dừng hết', (_label, skip) => {
      state = { ...state, data: legendMan() }
      render(<SpinScreen />, { wrapper: MemoryRouter })
      spinToTray()
      act(() => vi.advanceTimersByTime(REVEAL_FIRST_MS))
      expect(bursts()).toHaveLength(1)
      skip()
      expect(bursts()).toHaveLength(0)
      expect(within(screen.getByRole('dialog')).getAllByRole('listitem')).toHaveLength(3)
    })

    it('🎲 sang món khác bậc: hiệu ứng theo bậc món mới; chạm liên tục chỉ một hiệu ứng', () => {
      // Mặn chỉ có 2 món: một ⭐, một ⭐⭐⭐ → đổi là ra món kia (khác bậc)
      const man = [
        foodSet.seed.find((d) => d.groupKey === 'man' && d.rarity === 1)!,
        foodSet.seed.find((d) => d.groupKey === 'man' && d.rarity === 3)!,
      ]
      state = { ...state, data: toItems((d) => (d.groupKey === 'man' ? man.includes(d) : d.rarity === 2)) }
      render(<SpinScreen />, { wrapper: MemoryRouter })
      spinAndWait()
      act(() => vi.advanceTimersByTime(BURST_MS[3]))
      expect(bursts()).toHaveLength(0)
      const manSlot = () => useTrayStore.getState().slots.find((sl) => sl.groupKey === 'man')!
      const before = manSlot().rarity
      const name = foodSet.seed.find((x) => x.seedKey === manSlot().itemId)!.name
      fireEvent.click(screen.getByRole('button', { name: `Đổi món này: ${name}` }))
      const after = manSlot().rarity
      expect(after).not.toBe(before)
      act(() => vi.advanceTimersByTime(FLIP_MS))
      expect(bursts(after!)).toHaveLength(1)
      expect(bursts(before!)).toHaveLength(0)
      act(() => vi.advanceTimersByTime(BURST_MS[3]))
      // chạm 🎲 hai lần liên tiếp: lần lật trước bị huỷ, chỉ một hiệu ứng
      const n1 = foodSet.seed.find((x) => x.seedKey === manSlot().itemId)!.name
      fireEvent.click(screen.getByRole('button', { name: `Đổi món này: ${n1}` }))
      act(() => vi.advanceTimersByTime(FLIP_MS / 2))
      const n2 = foodSet.seed.find((x) => x.seedKey === manSlot().itemId)!.name
      fireEvent.click(screen.getByRole('button', { name: `Đổi món này: ${n2}` }))
      act(() => vi.advanceTimersByTime(FLIP_MS / 2))
      expect(bursts()).toHaveLength(0)
      act(() => vi.advanceTimersByTime(FLIP_MS / 2))
      expect(bursts()).toHaveLength(1)
    })

    it('giảm chuyển động: không nhá hàng, không hiệu ứng, 🎲 không lật', () => {
      vi.stubGlobal('matchMedia', (q: string) => ({
        matches: q.includes('prefers-reduced-motion'),
        addEventListener: () => {},
        removeEventListener: () => {},
      }))
      try {
        state = { ...state, data: toItems((d) => (d.groupKey === 'man' ? d.rarity === 3 : d.rarity === 2)) }
        render(<SpinScreen />, { wrapper: MemoryRouter })
        fireEvent.click(screen.getByRole('button', { name: 'Mở nồi!' }))
        act(() => vi.advanceTimersByTime(310))
        expect(document.querySelector('.gacha-pot--teasing')).toBeNull()
        expect(screen.getByRole('dialog')).toBeInTheDocument()
        expect(bursts()).toHaveLength(0)
        // độ hiếm vẫn nhận ra: viền màu theo bậc + số sao kèm chữ
        const legend = screen.getAllByRole('listitem').at(-1)!
        expect(legend.style.borderColor).toBe('var(--color-rarity-legend)')
        expect(legend).toHaveTextContent('⭐⭐⭐ Đặc biệt')
        const slot = useTrayStore.getState().slots[0]
        const d = foodSet.seed.find((x) => x.seedKey === slot.itemId)!
        fireEvent.click(screen.getByRole('button', { name: `Đổi món này: ${d.name}` }))
        act(() => vi.advanceTimersByTime(FLIP_MS))
        expect(bursts()).toHaveLength(0)
      } finally {
        vi.unstubAllGlobals()
      }
    })
  })

  describe('âm thanh và rung', () => {
    const calls = () => fb.feedback.mock.calls.map(([r, sound]) => [r, sound])

    it('âm thanh tắt (mặc định): không mở khoá/tải âm thanh; mỗi thẻ bật thì rung theo bậc, không tiếng', () => {
      state = { ...state, data: toItems((d) => (d.groupKey === 'man' ? d.rarity === 3 : d.rarity === 2)) }
      render(<SpinScreen />, { wrapper: MemoryRouter })
      spinToTray()
      expect(fb.unlock).not.toHaveBeenCalled()
      expect(fb.preload).not.toHaveBeenCalled()
      act(() => vi.advanceTimersByTime(REVEAL_FIRST_MS))
      expect(calls()).toEqual([[2, false]])
      act(() => vi.advanceTimersByTime(5000))
      // đúng thứ tự bật: ⭐⭐, ⭐⭐, ⭐⭐⭐
      expect(calls()).toEqual([
        [2, false],
        [2, false],
        [3, false],
      ])
    })

    it('âm thanh bật: chạm Mở nồi! thì mở khoá + tải sẵn; mỗi thẻ phát tiếng theo bậc', () => {
      window.localStorage.setItem('noi-than:sound', 'on')
      state = { ...state, data: toItems((d) => d.rarity === 1) }
      render(<SpinScreen />, { wrapper: MemoryRouter })
      fireEvent.click(screen.getByRole('button', { name: 'Mở nồi!' }))
      expect(fb.unlock).toHaveBeenCalledTimes(1)
      expect(fb.preload).toHaveBeenCalledTimes(1)
      act(() => vi.advanceTimersByTime(1600))
      act(() => vi.advanceTimersByTime(LID_LEAD_MS))
      act(() => vi.advanceTimersByTime(5000))
      expect(calls()).toEqual([
        [1, true],
        [1, true],
        [1, true],
      ])
    })

    it('bỏ qua giữa chừng: một phản hồi theo bậc cao nhất của các thẻ chưa bật (⭐⭐⭐ không bị nuốt); mở lại mâm cũ không phát', () => {
      state = { ...state, data: toItems((d) => (d.groupKey === 'man' ? d.rarity === 3 : d.rarity === 1)) }
      render(<SpinScreen />, { wrapper: MemoryRouter })
      spinToTray()
      act(() => vi.advanceTimersByTime(REVEAL_FIRST_MS))
      fireEvent.click(screen.getByTestId('reveal-skip'))
      act(() => vi.advanceTimersByTime(5000))
      expect(calls()).toEqual([
        [1, false],
        [3, false],
      ])
      fireEvent.click(screen.getByRole('button', { name: 'Để sau' }))
      act(() => useTrayStore.setState({ open: true }))
      act(() => vi.advanceTimersByTime(5000))
      expect(fb.feedback).toHaveBeenCalledTimes(2)
    })

    it('âm thanh bật: 🎲 và Đổi cả mâm mở khoá âm thanh trong lần chạm; Đổi cả mâm phản hồi một lần theo bậc cao nhất', () => {
      window.localStorage.setItem('noi-than:sound', 'on')
      state = { ...state, data: toItems((d) => (d.groupKey === 'man' ? true : d.rarity === 1)) }
      render(<SpinScreen />, { wrapper: MemoryRouter })
      spinAndWait()
      act(() => vi.advanceTimersByTime(BURST_MS[3]))
      fb.unlock.mockClear()
      fb.feedback.mockClear()
      const slot = useTrayStore.getState().slots[0]
      const d = foodSet.seed.find((x) => x.seedKey === slot.itemId)!
      fireEvent.click(screen.getByRole('button', { name: `Đổi món này: ${d.name}` }))
      expect(fb.unlock).toHaveBeenCalledTimes(1)
      act(() => vi.advanceTimersByTime(FLIP_MS))
      expect(calls()).toHaveLength(1)
      expect(calls()[0][1]).toBe(true)
      fb.feedback.mockClear()
      fireEvent.click(screen.getByRole('button', { name: 'Đổi cả mâm' }))
      expect(fb.unlock).toHaveBeenCalledTimes(2)
      const top = Math.max(...useTrayStore.getState().slots.map((sl) => sl.rarity ?? 0))
      expect(calls()).toEqual([[top, true]])
    })

    it('giảm chuyển động + âm thanh bật: phản hồi có tiếng', () => {
      window.localStorage.setItem('noi-than:sound', 'on')
      vi.stubGlobal('matchMedia', (q: string) => ({
        matches: q.includes('prefers-reduced-motion'),
        addEventListener: () => {},
        removeEventListener: () => {},
      }))
      try {
        state = { ...state, data: toItems((d) => (d.groupKey === 'man' ? d.rarity === 3 : d.rarity === 1)) }
        render(<SpinScreen />, { wrapper: MemoryRouter })
        fireEvent.click(screen.getByRole('button', { name: 'Mở nồi!' }))
        act(() => vi.advanceTimersByTime(310))
        expect(calls()).toEqual([[3, true]])
        const slot = useTrayStore.getState().slots[0]
        const d = foodSet.seed.find((x) => x.seedKey === slot.itemId)!
        fb.feedback.mockClear()
        fireEvent.click(screen.getByRole('button', { name: `Đổi món này: ${d.name}` }))
        expect(calls()).toEqual([[1, true]])
      } finally {
        vi.unstubAllGlobals()
      }
    })

    it('🎲: phản hồi theo bậc món mới khi lật xong', () => {
      state = { ...state, data: toItems((d) => d.rarity === 2) }
      render(<SpinScreen />, { wrapper: MemoryRouter })
      spinAndWait()
      fb.feedback.mockClear()
      const slot = useTrayStore.getState().slots[0]
      const d = foodSet.seed.find((x) => x.seedKey === slot.itemId)!
      fireEvent.click(screen.getByRole('button', { name: `Đổi món này: ${d.name}` }))
      expect(fb.feedback).not.toHaveBeenCalled()
      act(() => vi.advanceTimersByTime(FLIP_MS))
      expect(calls()).toEqual([[2, false]])
    })

    it('giảm chuyển động: một lần theo bậc cao nhất khi mâm hiện; 🎲 phản hồi ngay', () => {
      vi.stubGlobal('matchMedia', (q: string) => ({
        matches: q.includes('prefers-reduced-motion'),
        addEventListener: () => {},
        removeEventListener: () => {},
      }))
      try {
        state = { ...state, data: toItems((d) => (d.groupKey === 'man' ? d.rarity === 3 : d.rarity === 1)) }
        render(<SpinScreen />, { wrapper: MemoryRouter })
        fireEvent.click(screen.getByRole('button', { name: 'Mở nồi!' }))
        act(() => vi.advanceTimersByTime(310))
        expect(calls()).toEqual([[3, false]])
        const slot = useTrayStore.getState().slots[0]
        const d = foodSet.seed.find((x) => x.seedKey === slot.itemId)!
        fb.feedback.mockClear()
        fireEvent.click(screen.getByRole('button', { name: `Đổi món này: ${d.name}` }))
        expect(calls()).toEqual([[1, false]])
      } finally {
        vi.unstubAllGlobals()
      }
    })
  })
})
