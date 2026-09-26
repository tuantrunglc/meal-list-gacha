import { fireEvent, render, screen } from '@testing-library/react'
import { useState } from 'react'
import { describe, expect, it } from 'vitest'
import type { FoodAttrs } from './attrs'
import { FoodAttrsEditor } from './FoodAttrsEditor'

const box: { latest?: FoodAttrs } = {}
function Harness({ initial }: { initial: FoodAttrs }) {
  const [v, setV] = useState(initial)
  return (
    <FoodAttrsEditor
      value={v}
      onChange={(next) => {
        box.latest = next
        setV(next)
      }}
    />
  )
}

describe('FoodAttrsEditor', () => {
  it('thêm/xoá dòng nguyên liệu và bước; bước đánh số', () => {
    render(<Harness initial={{ ingredients: [''], steps: [''] }} />)
    fireEvent.change(screen.getByLabelText('Nguyên liệu 1'), { target: { value: 'cá' } })
    fireEvent.click(screen.getByRole('button', { name: '＋ Thêm nguyên liệu' }))
    fireEvent.change(screen.getByLabelText('Nguyên liệu 2'), { target: { value: 'mắm' } })
    fireEvent.click(screen.getByRole('button', { name: '＋ Thêm bước' }))
    expect(screen.getByLabelText('Bước 2')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Bỏ nguyên liệu 1' }))
    expect(box.latest!.ingredients).toEqual(['mắm'])
    // xoá dòng cuối cùng thì còn một dòng trống
    fireEvent.click(screen.getByRole('button', { name: 'Bỏ nguyên liệu 1' }))
    expect(box.latest!.ingredients).toEqual([''])
    fireEvent.change(screen.getByLabelText('Ghi chú'), { target: { value: 'lửa nhỏ' } })
    expect(box.latest!.note).toBe('lửa nhỏ')
  })

  it('Enter ở dòng cuối thêm dòng mới', () => {
    render(<Harness initial={{ ingredients: ['cá'], steps: [''] }} />)
    fireEvent.keyDown(screen.getByLabelText('Nguyên liệu 1'), { key: 'Enter' })
    expect(box.latest!.ingredients).toEqual(['cá', ''])
  })
})
