import { fireEvent, render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { AppError } from '../../data/errors'
import type { Item } from '../../data/items'
import { useToast } from '../../ui/toast'
import { DeleteItemConfirm } from './DeleteItemConfirm'

type Opts = { onSuccess?: () => void }
const mutate = vi.fn<(id: string, opts?: Opts) => void>()
let delState: { isPending: boolean; error: AppError | null } = { isPending: false, error: null }
vi.mock('../../data/items', () => ({ useDeleteItem: () => ({ mutate, ready: true, ...delState }) }))

const item = { id: 'i1', name: 'Canh chua cá' } as Item
const onCancel = vi.fn()
const onDeleted = vi.fn()
const renderIt = () => render(<DeleteItemConfirm item={item} setKey="food" onCancel={onCancel} onDeleted={onDeleted} />)

describe('DeleteItemConfirm', () => {
  beforeEach(() => {
    mutate.mockReset()
    onCancel.mockReset()
    onDeleted.mockReset()
    delState = { isPending: false, error: null }
  })

  it('hỏi đúng tên; Xoá (màu danger) gọi xoá mềm, xong toast + báo đã xoá', () => {
    renderIt()
    const dialog = screen.getByRole('alertdialog', { name: 'Xoá món Canh chua cá?' })
    expect(dialog).toHaveAccessibleDescription('Nồi sẽ không dọn món này nữa. Mâm cũ trong lịch sử vẫn còn.')
    // chỉ một lớp hộp thoại
    expect(screen.queryByRole('dialog')).toBeNull()
    const del = screen.getByRole('button', { name: 'Xoá' })
    expect(del).toHaveClass('button-danger')
    fireEvent.click(del)
    expect(mutate.mock.calls[0][0]).toBe('i1')
    mutate.mock.calls[0][1]!.onSuccess!()
    expect(useToast.getState().message).toBe('Đã bỏ món khỏi nồi.')
    expect(onDeleted).toHaveBeenCalled()
  })

  it('Thôi / Esc thì huỷ', () => {
    renderIt()
    fireEvent.click(screen.getByRole('button', { name: 'Thôi' }))
    fireEvent.keyDown(document, { key: 'Escape' })
    expect(onCancel).toHaveBeenCalledTimes(2)
    expect(mutate).not.toHaveBeenCalled()
  })

  it('lỗi thì lời nhắn + Thử lại; đang xoá thì khoá, không huỷ được', () => {
    delState = { isPending: false, error: new AppError('network') }
    const { rerender } = renderIt()
    expect(screen.getByRole('alert')).toHaveTextContent('Mất mạng rồi')
    fireEvent.click(screen.getByRole('button', { name: 'Thử lại' }))
    expect(mutate).toHaveBeenCalledOnce()
    delState = { isPending: true, error: null }
    rerender(<DeleteItemConfirm item={item} setKey="food" onCancel={onCancel} onDeleted={onDeleted} />)
    expect(screen.getByRole('button', { name: 'Đang xoá…' })).toBeDisabled()
    fireEvent.keyDown(document, { key: 'Escape' })
    expect(onCancel).not.toHaveBeenCalled()
  })
})
