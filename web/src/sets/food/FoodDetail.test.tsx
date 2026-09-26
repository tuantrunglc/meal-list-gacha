import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { FoodDetail } from './FoodDetail'

describe('FoodDetail', () => {
  it('hiện nguyên liệu, các bước đánh số, ghi chú', () => {
    render(<FoodDetail attrs={{ ingredients: ['cá', 'nước mắm'], steps: ['ướp', 'kho'], note: 'lửa nhỏ' }} />)
    expect(document.querySelectorAll('ul li')).toHaveLength(2)
    const steps = document.querySelector('ol')!
    expect(steps.querySelectorAll('li')).toHaveLength(2)
    expect(screen.getByRole('heading', { name: 'Ghi chú' })).toBeInTheDocument()
    expect(screen.getByText('lửa nhỏ')).toBeInTheDocument()
  })

  it('phần rỗng không hiện; attrs sai schema không crash', () => {
    const first = render(<FoodDetail attrs={{ ingredients: ['  ', ''], steps: ['a', ' '], note: '   ' }} />)
    expect(screen.queryByRole('heading', { name: 'Nguyên liệu' })).toBeNull()
    expect(screen.queryByRole('heading', { name: 'Ghi chú' })).toBeNull()
    expect(screen.getByRole('heading', { name: 'Các bước' })).toBeInTheDocument()
    expect(first.container.querySelectorAll('ol li')).toHaveLength(1)
    first.unmount()
    const bad = render(<FoodDetail attrs={'rác'} />)
    expect(bad.container.innerHTML).toBe('')
  })
})
