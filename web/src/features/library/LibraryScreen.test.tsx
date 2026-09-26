import { fireEvent, render, screen, within } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { Item, ItemsResult } from '../../data/items'
import { foodSet } from '../../sets/food/definition'
import { LibraryScreen } from './LibraryScreen'

let state: ItemsResult
vi.mock('../../data/items', () => ({ useItems: () => state, itemImageSources: () => [] }))

const items: Item[] = foodSet.seed.map((d) => ({
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

const cards = () => within(screen.getByRole('list')).getAllByRole('listitem')

describe('LibraryScreen', () => {
  beforeEach(() => {
    state = { data: items, error: null, isPending: false, isError: false, refetch: vi.fn(async () => {}) }
  })

  it('hiện mọi món, lọc nhóm + mùa bằng chip', () => {
    render(<LibraryScreen />)
    expect(cards()).toHaveLength(items.length)
    fireEvent.click(screen.getByRole('radio', { name: 'Canh' }))
    const canh = items.filter((i) => i.groupKey === 'canh')
    expect(cards()).toHaveLength(canh.length)
    fireEvent.click(screen.getByRole('radio', { name: 'Thu' }))
    expect(cards()).toHaveLength(canh.filter((i) => i.tags.includes('thu')).length)
    // "Tất cả" của nhóm mùa
    const seasonGroup = screen.getByRole('radiogroup', { name: 'Mùa' })
    fireEvent.click(within(seasonGroup).getByRole('radio', { name: 'Tất cả' }))
    expect(cards()).toHaveLength(canh.length)
  })

  it('tìm không dấu; không thấy thì báo thân thiện', () => {
    render(<LibraryScreen />)
    fireEvent.change(screen.getByLabelText('Tìm món'), { target: { value: 'ca kho' } })
    expect(cards().map((li) => li.textContent)).toEqual([expect.stringContaining('Cá kho tộ')])
    fireEvent.change(screen.getByLabelText('Tìm món'), { target: { value: 'pizza' } })
    expect(screen.getByRole('status')).toHaveTextContent('Không thấy món này. Thêm mới luôn?')
  })

  it('chạm thẻ mở chi tiết trong modal; Esc đóng và focus về thẻ', () => {
    render(<LibraryScreen />)
    const card = screen.getByRole('button', { name: /^Canh chua cá, Canh, Ngon/ })
    card.focus()
    fireEvent.click(card)
    const dialog = screen.getByRole('dialog', { name: 'Chi tiết món Canh chua cá' })
    expect(document.activeElement).toBe(within(dialog).getByRole('heading', { level: 2, name: 'Canh chua cá' }))
    expect(within(dialog).getByRole('heading', { name: 'Nguyên liệu' })).toBeInTheDocument()
    fireEvent.keyDown(document, { key: 'Escape' })
    expect(screen.queryByRole('dialog')).toBeNull()
    expect(document.activeElement).toBe(card)
  })

  it('lỗi thì báo + Thử lại', () => {
    state = { ...state, data: undefined, error: { code: 'network', message: 'Mất mạng rồi' } as never, isError: true }
    render(<LibraryScreen />)
    fireEvent.click(within(screen.getByRole('alert')).getByRole('button', { name: 'Thử lại' }))
    expect(state.refetch).toHaveBeenCalled()
  })

  it('đang tải thì báo đang mở sổ, không báo "không thấy"', () => {
    state = { ...state, data: undefined, isPending: true }
    render(<LibraryScreen />)
    expect(screen.getByRole('status')).toHaveTextContent('Đang mở sổ món…')
    expect(screen.queryByText(/Không thấy/)).toBeNull()
  })

  it('chỉ lọc chip mà rỗng thì báo khớp bộ lọc + Bỏ lọc (không mời thêm món)', () => {
    state = { ...state, data: items.filter((i) => !(i.groupKey === 'canh' && i.tags.includes('xuan'))) }
    render(<LibraryScreen />)
    fireEvent.click(screen.getByRole('radio', { name: 'Canh' }))
    fireEvent.click(screen.getByRole('radio', { name: 'Xuân' }))
    expect(screen.getByRole('status')).toHaveTextContent('Chưa có món nào khớp bộ lọc này.')
    expect(screen.queryByText(/Thêm mới luôn/)).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: 'Bỏ lọc' }))
    expect(cards()).toHaveLength(state.data!.length)
  })

  it('tải lại lỗi mà vẫn còn dữ liệu cũ: vẫn hiện lưới, lỗi là dải thông báo', () => {
    state = { ...state, error: { code: 'network', message: 'Mất mạng rồi' } as never, isError: true }
    render(<LibraryScreen />)
    expect(screen.getByRole('alert')).toHaveTextContent('Mất mạng rồi')
    expect(cards()).toHaveLength(items.length)
  })
})
