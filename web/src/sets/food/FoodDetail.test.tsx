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

  it('chưa có nguyên liệu lẫn bước thì mời ghi công thức', () => {
    render(<FoodDetail attrs={{ ingredients: [], steps: [] }} />)
    expect(screen.getByText('Chưa có công thức, ghi lại bí kíp nè')).toBeInTheDocument()
  })

  it('chỉ có ghi chú: vẫn mời ghi công thức và hiện ghi chú', () => {
    render(<FoodDetail attrs={{ ingredients: [], steps: [], note: 'mẹo' }} />)
    expect(screen.getByText('Chưa có công thức, ghi lại bí kíp nè')).toBeInTheDocument()
    expect(screen.getByText('mẹo')).toBeInTheDocument()
  })
})
