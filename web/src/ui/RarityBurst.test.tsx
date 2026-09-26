import { act, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { BURST_MS, RarityBurst } from './RarityBurst'

beforeEach(() => vi.useFakeTimers())
afterEach(() => vi.useRealTimers())

describe('RarityBurst', () => {
  it('chỉ trang trí: aria-hidden; ⭐⭐⭐ có tia sáng, sao ✦ và chữ "Đặc biệt!"', () => {
    const { container } = render(<RarityBurst rarity={3} />)
    const root = container.firstElementChild!
    expect(root).toHaveAttribute('aria-hidden', 'true')
    expect(root.querySelector('.rarity-burst__rays')).not.toBeNull()
    expect(root.querySelectorAll('.rarity-burst__sparkle')).toHaveLength(4)
    expect(screen.getByText('Đặc biệt!')).toBeInTheDocument()
  })

  it('⭐ hơi nước, ⭐⭐ vệt sáng + hạt gạo; không có chữ Đặc biệt', () => {
    const one = render(<RarityBurst rarity={1} />)
    expect(one.container.querySelector('.rarity-burst__steam')).not.toBeNull()
    one.unmount()
    const two = render(<RarityBurst rarity={2} />)
    expect(two.container.querySelector('.rarity-burst__sweep')).not.toBeNull()
    expect(two.container.querySelectorAll('.rarity-burst__grain').length).toBeGreaterThan(0)
    expect(screen.queryByText('Đặc biệt!')).toBeNull()
  })

  it('hết giờ gọi onDone một lần; cha render lại với hàm mới không làm chạy lại giờ', () => {
    const first = vi.fn()
    const second = vi.fn()
    const { rerender } = render(<RarityBurst rarity={2} onDone={first} />)
    act(() => vi.advanceTimersByTime(BURST_MS[2] - 100))
    rerender(<RarityBurst rarity={2} onDone={second} />)
    act(() => vi.advanceTimersByTime(100))
    expect(first).not.toHaveBeenCalled()
    expect(second).toHaveBeenCalledTimes(1)
  })
})
