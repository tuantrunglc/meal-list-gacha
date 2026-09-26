import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { ConfirmDialog } from './ConfirmDialog'

const props = { title: 'Xoá?', body: 'Không hoàn tác.', confirmLabel: 'Xoá', busyLabel: 'Đang xoá…' }

describe('ConfirmDialog', () => {
  it('alertdialog có mô tả; nút xác nhận màu danger; đang xử lý thì khoá và không huỷ được', () => {
    const onConfirm = vi.fn()
    const onCancel = vi.fn()
    const { rerender } = render(<ConfirmDialog {...props} busy={false} onConfirm={onConfirm} onCancel={onCancel} />)
    expect(screen.getByRole('alertdialog', { name: 'Xoá?' })).toHaveAccessibleDescription('Không hoàn tác.')
    fireEvent.click(screen.getByRole('button', { name: 'Xoá' }))
    expect(onConfirm).toHaveBeenCalled()
    rerender(<ConfirmDialog {...props} busy onConfirm={onConfirm} onCancel={onCancel} />)
    expect(screen.getByRole('button', { name: 'Đang xoá…' })).toBeDisabled()
    fireEvent.keyDown(document, { key: 'Escape' })
    expect(onCancel).not.toHaveBeenCalled()
  })

  it('có lỗi thì hiện lời nhắn, nút thành Thử lại', () => {
    render(<ConfirmDialog {...props} busy={false} error="Mất mạng rồi" onConfirm={vi.fn()} onCancel={vi.fn()} />)
    expect(screen.getByRole('alert')).toHaveTextContent('Mất mạng rồi')
    expect(screen.getByRole('button', { name: 'Thử lại' })).toHaveClass('button-danger')
  })

  it('không bận: Thôi, Esc, chạm nền đều huỷ', () => {
    const onCancel = vi.fn()
    render(<ConfirmDialog {...props} busy={false} onConfirm={vi.fn()} onCancel={onCancel} />)
    fireEvent.click(screen.getByRole('button', { name: 'Thôi' }))
    fireEvent.keyDown(document, { key: 'Escape' })
    fireEvent.click(document.querySelector('.modal__dim')!)
    expect(onCancel).toHaveBeenCalledTimes(3)
  })

  it('confirmDisabled: chưa xác nhận được nhưng vẫn huỷ được', () => {
    const onConfirm = vi.fn()
    const onCancel = vi.fn()
    render(<ConfirmDialog {...props} busy={false} confirmDisabled onConfirm={onConfirm} onCancel={onCancel} />)
    expect(screen.getByRole('button', { name: 'Xoá' })).toBeDisabled()
    fireEvent.click(screen.getByRole('button', { name: 'Thôi' }))
    expect(onCancel).toHaveBeenCalled()
  })
})
