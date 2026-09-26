import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import type { Item } from '../../data/items'
import { foodSet } from '../../sets/food/definition'
import { ItemDetail } from './ItemDetail'

const seed = foodSet.seed.find((d) => d.seedKey === 'ca-kho-to')!
const item: Item = {
  id: 'i1',
  household: 'h',
  setKey: 'food',
  groupKey: seed.groupKey,
  name: seed.name,
  rarity: seed.rarity,
  tags: seed.tags,
  attrs: seed.attrs,
  seedKey: seed.seedKey,
  deleted: false,
  imageFile: '',
  collectionId: 'c',
  updated: '',
}

describe('ItemDetail', () => {
  it('hiện tên, nhóm, độ hiếm có sao, mùa, nguyên liệu, các bước', () => {
    render(<ItemDetail item={item} set={foodSet} />)
    expect(screen.getByRole('heading', { level: 2, name: 'Cá kho tộ' })).toBeInTheDocument()
    expect(screen.getByText('Mặn')).toBeInTheDocument()
    expect(screen.getByText(/Đặc biệt/)).toHaveTextContent('⭐⭐⭐')
    expect(screen.getByText('Mùa: Quanh năm')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Nguyên liệu' })).toBeInTheDocument()
    expect(document.querySelectorAll('ol li').length).toBe(seed.attrs.steps.length)
    expect(screen.getByRole('img', { name: 'Cá kho tộ' })).toBeInTheDocument()
  })

  it('attrs lỗi vẫn hiện phần chung', () => {
    render(<ItemDetail item={{ ...item, attrs: null }} set={foodSet} />)
    expect(screen.getByRole('heading', { name: 'Cá kho tộ' })).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: 'Nguyên liệu' })).toBeNull()
  })

  it('nút Sửa chỉ có khi truyền onEdit, bấm thì gọi', () => {
    const { rerender } = render(<ItemDetail item={item} set={foodSet} />)
    expect(screen.queryByRole('button', { name: 'Sửa' })).toBeNull()
    const onEdit = vi.fn()
    rerender(<ItemDetail item={item} set={foodSet} onEdit={onEdit} />)
    fireEvent.click(screen.getByRole('button', { name: 'Sửa' }))
    expect(onEdit).toHaveBeenCalledOnce()
  })
})
