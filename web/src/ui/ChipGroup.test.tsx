import { fireEvent, render, screen } from '@testing-library/react'
import { useState } from 'react'
import { describe, expect, it } from 'vitest'
import { ChipGroup } from './ChipGroup'

const options = [
  { key: 'a', label: 'A', color: 'red' },
  { key: 'b', label: 'B', color: 'blue' },
  { key: 'c', label: 'C', color: 'green' },
]

function Harness({ initial }: { initial: string }) {
  const [value, setValue] = useState(initial)
  return <ChipGroup label="Nhóm" options={options} value={value} onChange={setValue} />
}

describe('ChipGroup', () => {
  it('mũi tên phải chọn chip kế và chuyển focus; trái ở chip đầu thì vòng về cuối', () => {
    render(<Harness initial="a" />)
    const a = screen.getByRole('radio', { name: 'A' })
    fireEvent.keyDown(a, { key: 'ArrowRight' })
    expect(screen.getByRole('radio', { name: 'B' })).toHaveAttribute('aria-checked', 'true')
    expect(document.activeElement).toBe(screen.getByRole('radio', { name: 'B' }))
    fireEvent.keyDown(screen.getByRole('radio', { name: 'B' }), { key: 'ArrowLeft' })
    fireEvent.keyDown(screen.getByRole('radio', { name: 'A' }), { key: 'ArrowLeft' })
    expect(screen.getByRole('radio', { name: 'C' })).toHaveAttribute('aria-checked', 'true')
  })

  it('chỉ chip đang chọn nhận Tab', () => {
    render(<Harness initial="b" />)
    expect(screen.getByRole('radio', { name: 'B' })).toHaveAttribute('tabindex', '0')
    expect(screen.getByRole('radio', { name: 'A' })).toHaveAttribute('tabindex', '-1')
  })

  it('giá trị không khớp lựa chọn nào thì chip đầu vẫn nhận Tab', () => {
    render(<Harness initial="zzz" />)
    expect(screen.getByRole('radio', { name: 'A' })).toHaveAttribute('tabindex', '0')
  })
})
