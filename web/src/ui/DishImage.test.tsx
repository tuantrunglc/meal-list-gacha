import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { DishImage } from './DishImage'

describe('DishImage', () => {
  it('không có nguồn thì hiện đĩa trống + "Thêm ảnh"', () => {
    render(<DishImage sources={[]} alt="Cá kho tộ" />)
    expect(screen.getByRole('img', { name: 'Cá kho tộ' })).toHaveTextContent('Thêm ảnh')
    expect(document.querySelector('img')).toBeNull()
  })

  it('ảnh lỗi thì thử nguồn kế, hết nguồn thì đĩa trống', () => {
    render(<DishImage sources={['/a.webp', '/seed/b.webp']} alt="Canh chua" />)
    fireEvent.error(document.querySelector('img')!)
    expect(document.querySelector('img')).toHaveAttribute('src', '/seed/b.webp')
    fireEvent.error(document.querySelector('img')!)
    expect(document.querySelector('img')).toBeNull()
    expect(screen.getByRole('img', { name: 'Canh chua' })).toHaveTextContent('Thêm ảnh')
  })

  it('đổi danh sách nguồn thì thử lại từ đầu', () => {
    const { rerender } = render(<DishImage sources={['/a.webp']} alt="x" />)
    fireEvent.error(document.querySelector('img')!)
    rerender(<DishImage sources={['/c.webp']} alt="y" />)
    expect(document.querySelector('img')).toHaveAttribute('src', '/c.webp')
  })

  it('compact thì không có chữ', () => {
    render(<DishImage sources={[]} alt="x" compact />)
    expect(screen.getByRole('img', { name: 'x' })).not.toHaveTextContent('Thêm ảnh')
  })
})
