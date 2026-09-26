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
})
