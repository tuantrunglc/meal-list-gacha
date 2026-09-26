import { act, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { showToast, useToast } from './toast'
import { Toaster } from './Toaster'

describe('Toaster', () => {
  beforeEach(() => vi.useFakeTimers())
  afterEach(() => {
    vi.useRealTimers()
    useToast.setState({ message: null, id: 0 })
  })

  it('hiện câu trong vùng status rồi tự ẩn sau ~3 giây', () => {
    render(<Toaster />)
    act(() => showToast('Đã lưu vào nồi!'))
    expect(screen.getByRole('status')).toHaveTextContent('Đã lưu vào nồi!')
    act(() => vi.advanceTimersByTime(3100))
    expect(screen.queryByRole('status')).toBeNull()
  })
})
