import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { DishCard } from './DishCard'

const base = {
  name: 'Canh chua cá',
  imageSources: [],
  group: { label: 'Canh', color: 'red' },
  dots: [{ label: 'Thu', color: 'orange' }],
  label: 'Canh chua cá, Canh, Ngon, Thu',
}

describe('DishCard', () => {
  it('viền theo độ hiếm; nhãn đầy đủ gồm mùa; chạm thì mở', () => {
    const onOpen = vi.fn()
    const { rerender } = render(<DishCard {...base} rarity={2} onOpen={onOpen} />)
    const card = screen.getByRole('button', { name: 'Canh chua cá, Canh, Ngon, Thu' })
    expect(card.style.borderColor).toBe('var(--color-rarity-rare)')
    fireEvent.click(card)
    expect(onOpen).toHaveBeenCalledOnce()
    rerender(<DishCard {...base} rarity={3} onOpen={onOpen} />)
    expect(screen.getByRole('button').style.borderColor).toBe('var(--color-rarity-legend)')
  })

  it('vuốt trái đủ xa thì xin xoá, không mở chi tiết; vuốt ít thì không gì cả', () => {
    const onOpen = vi.fn()
    const onSwipeDelete = vi.fn()
    render(<DishCard {...base} rarity={1} onOpen={onOpen} onSwipeDelete={onSwipeDelete} />)
    const card = screen.getByRole('button')
    const swipe = (to: number) => {
      fireEvent.pointerDown(card, { pointerId: 1, isPrimary: true, clientX: 200, clientY: 100 })
      fireEvent.pointerMove(card, { pointerId: 1, clientX: 200 + to / 2, clientY: 101 })
      fireEvent.pointerMove(card, { pointerId: 1, clientX: 200 + to, clientY: 102 })
      fireEvent.pointerUp(card, { pointerId: 1, clientX: 200 + to, clientY: 102 })
      fireEvent.click(card)
    }
    swipe(-30)
    expect(onSwipeDelete).not.toHaveBeenCalled()
    expect(onOpen).not.toHaveBeenCalled()
    swipe(-100)
    expect(onSwipeDelete).toHaveBeenCalledOnce()
    expect(onOpen).not.toHaveBeenCalled()
    expect(card.style.transform).toBe('')
  })

  it('sau khi vuốt (không có click), lần chạm sau vẫn mở chi tiết', async () => {
    const onOpen = vi.fn()
    render(<DishCard {...base} rarity={1} onOpen={onOpen} onSwipeDelete={vi.fn()} />)
    const card = screen.getByRole('button')
    fireEvent.pointerDown(card, { pointerId: 1, isPrimary: true, clientX: 200, clientY: 100 })
    fireEvent.pointerMove(card, { pointerId: 1, clientX: 100, clientY: 101 })
    fireEvent.pointerUp(card, { pointerId: 1 })
    await new Promise((r) => setTimeout(r, 1))
    fireEvent.click(card)
    expect(onOpen).toHaveBeenCalledOnce()
  })

  it('pointercancel hay chuột phải không xin xoá; đang vuốt có dải "Xoá" phía sau', () => {
    const onSwipeDelete = vi.fn()
    render(<DishCard {...base} rarity={1} onOpen={vi.fn()} onSwipeDelete={onSwipeDelete} />)
    const card = screen.getByRole('button')
    fireEvent.pointerDown(card, { pointerId: 1, isPrimary: true, clientX: 200, clientY: 100 })
    fireEvent.pointerMove(card, { pointerId: 1, clientX: 100, clientY: 101 })
    expect(document.querySelector('.dish-card__swipe-hint--armed')).toHaveTextContent('Xoá')
    fireEvent.pointerCancel(card, { pointerId: 1 })
    expect(onSwipeDelete).not.toHaveBeenCalled()
    expect(document.querySelector('.dish-card__swipe-hint')).toBeNull()
    fireEvent.pointerDown(card, { pointerId: 2, isPrimary: true, clientX: 200, clientY: 100, button: 2 })
    fireEvent.pointerMove(card, { pointerId: 2, clientX: 50, clientY: 100 })
    fireEvent.pointerUp(card, { pointerId: 2 })
    expect(onSwipeDelete).not.toHaveBeenCalled()
  })

  it('rung tay dọc 1px lúc đầu không huỷ cú vuốt ngang', () => {
    const onSwipeDelete = vi.fn()
    render(<DishCard {...base} rarity={1} onOpen={vi.fn()} onSwipeDelete={onSwipeDelete} />)
    const card = screen.getByRole('button')
    fireEvent.pointerDown(card, { pointerId: 1, isPrimary: true, clientX: 200, clientY: 100 })
    fireEvent.pointerMove(card, { pointerId: 1, clientX: 200, clientY: 101 })
    fireEvent.pointerMove(card, { pointerId: 1, clientX: 100, clientY: 102 })
    fireEvent.pointerUp(card, { pointerId: 1 })
    expect(onSwipeDelete).toHaveBeenCalledOnce()
  })

  it('kéo dọc (cuộn trang) không tính là vuốt', () => {
    const onSwipeDelete = vi.fn()
    render(<DishCard {...base} rarity={1} onOpen={vi.fn()} onSwipeDelete={onSwipeDelete} />)
    const card = screen.getByRole('button')
    fireEvent.pointerDown(card, { pointerId: 1, isPrimary: true, clientX: 200, clientY: 100 })
    fireEvent.pointerMove(card, { pointerId: 1, clientX: 190, clientY: 180 })
    fireEvent.pointerMove(card, { pointerId: 1, clientX: 100, clientY: 190 })
    fireEvent.pointerUp(card, { pointerId: 1 })
    expect(onSwipeDelete).not.toHaveBeenCalled()
  })
})
