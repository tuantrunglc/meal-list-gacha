import { fireEvent, render, screen, within } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { AppError } from '../../data/errors'
import { foodSet } from '../../sets/food/definition'
import { useToast } from '../../ui/toast'
import { ItemEditor } from './ItemEditor'

type Opts = { onSuccess?: () => void }
const mutate = vi.fn<(input: Record<string, unknown>, opts?: Opts) => void>()
const reset = vi.fn()
let createState: { isPending: boolean; error: AppError | null; ready: boolean } = { isPending: false, error: null, ready: true }
vi.mock('../../data/items', () => ({ useCreateItem: () => ({ mutate, reset, ...createState }) }))

const onClose = vi.fn()
const renderEditor = (prefill = {}) => render(<ItemEditor set={foodSet} prefill={prefill} onClose={onClose} />)

describe('ItemEditor', () => {
  beforeEach(() => {
    mutate.mockReset()
    onClose.mockReset()
    createState = { isPending: false, error: null, ready: true }
    useToast.setState({ message: null, id: 0 })
  })

  it('mặc định: mùa Quanh năm, độ hiếm Thường, chưa chọn nhóm', () => {
    renderEditor()
    expect(screen.getByRole('radio', { name: 'Quanh năm' })).toHaveAttribute('aria-checked', 'true')
    expect(screen.getByRole('radio', { name: '⭐ Thường' })).toHaveAttribute('aria-checked', 'true')
    for (const g of ['Mặn', 'Rau', 'Canh']) expect(screen.getByRole('radio', { name: g })).toHaveAttribute('aria-checked', 'false')
  })

  it('thiếu tên: báo dưới ô Tên, focus ô Tên, không gọi server; thiếu nhóm: báo chọn nhóm', () => {
    renderEditor()
    fireEvent.click(screen.getByRole('button', { name: 'Lưu' }))
    const name = screen.getByLabelText('Tên món')
    expect(screen.getByText('Món này tên gì nè?')).toBeInTheDocument()
    expect(name).toHaveAttribute('aria-invalid', 'true')
    expect(document.activeElement).toBe(name)
    expect(mutate).not.toHaveBeenCalled()
    fireEvent.change(name, { target: { value: 'Thịt kho trứng kiểu mẹ' } })
    expect(screen.queryByText('Món này tên gì nè?')).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: 'Lưu' }))
    expect(screen.getByText('Chọn nhóm cho món nhé.')).toBeInTheDocument()
    const group = screen.getByRole('radiogroup', { name: 'Nhóm' })
    expect(group).toHaveAttribute('aria-invalid', 'true')
    expect(group).toHaveAccessibleDescription('Chọn nhóm cho món nhé.')
    expect(mutate).not.toHaveBeenCalled()
  })

  it('lưu đủ: gửi đúng dữ liệu (bỏ dòng trống), toast, đóng form', () => {
    renderEditor()
    fireEvent.change(screen.getByLabelText('Tên món'), { target: { value: '  Thịt kho trứng  ' } })
    fireEvent.click(screen.getByRole('radio', { name: 'Mặn' }))
    fireEvent.click(screen.getByRole('radio', { name: 'Đông' }))
    fireEvent.click(screen.getByRole('radio', { name: '⭐⭐⭐ Đặc biệt' }))
    fireEvent.change(screen.getByLabelText('Nguyên liệu 1'), { target: { value: 'thịt ba chỉ' } })
    fireEvent.click(screen.getByRole('button', { name: '＋ Thêm nguyên liệu' }))
    fireEvent.click(screen.getByRole('button', { name: '＋ Thêm nguyên liệu' }))
    fireEvent.change(screen.getByLabelText('Nguyên liệu 3'), { target: { value: 'trứng vịt' } })
    fireEvent.change(screen.getByLabelText('Bước 1'), { target: { value: 'Luộc trứng' } })
    fireEvent.click(screen.getByRole('button', { name: 'Lưu' }))
    expect(mutate).toHaveBeenCalledOnce()
    const [input, opts] = mutate.mock.calls[0]
    expect(input).toMatchObject({
      name: '  Thịt kho trứng  ',
      groupKey: 'man',
      rarity: 3,
      tags: ['dong'],
      attrs: { ingredients: ['thịt ba chỉ', 'trứng vịt'], steps: ['Luộc trứng'] },
    })
    expect(input.id).toMatch(/^[a-z0-9]{15}$/)
    opts!.onSuccess!()
    expect(useToast.getState().message).toBe('Đã lưu vào nồi!')
    expect(onClose).toHaveBeenCalled()
  })

  it('lỗi lưu: lời nhắn + Thử lại dùng lại đúng ID', () => {
    const { rerender } = renderEditor({ name: 'Món A', groupKey: 'rau' })
    fireEvent.click(screen.getByRole('button', { name: 'Lưu' }))
    const firstId = mutate.mock.calls[0][0].id
    createState = { isPending: false, error: new AppError('network'), ready: true }
    rerender(<ItemEditor set={foodSet} prefill={{ name: 'Món A', groupKey: 'rau' }} onClose={onClose} />)
    const alert = screen.getByRole('alert')
    expect(alert).toHaveTextContent('Mất mạng rồi')
    fireEvent.click(within(alert).getByRole('button', { name: 'Thử lại' }))
    expect(mutate.mock.calls.at(-1)![0].id).toBe(firstId)
  })

  it('đang lưu thì khoá form, Esc không đóng', () => {
    createState = { isPending: true, error: null, ready: true }
    renderEditor({ name: 'Món A', groupKey: 'rau' })
    expect(screen.getByLabelText('Tên món')).toBeDisabled()
    fireEvent.keyDown(document, { key: 'Escape' })
    expect(onClose).not.toHaveBeenCalled()
  })

  it('chưa sửa gì thì Thôi đóng luôn; đã sửa thì hỏi Bỏ thay đổi?', () => {
    const first = renderEditor()
    fireEvent.click(screen.getByRole('button', { name: 'Thôi' }))
    expect(onClose).toHaveBeenCalledOnce()
    first.unmount()
    onClose.mockReset()
    renderEditor()
    fireEvent.change(screen.getByLabelText('Tên món'), { target: { value: 'x' } })
    fireEvent.keyDown(document, { key: 'Escape' })
    expect(screen.getByRole('alertdialog', { name: 'Bỏ thay đổi?' })).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Ở lại' }))
    expect(screen.getByLabelText('Tên món')).toHaveValue('x')
    fireEvent.click(screen.getByRole('button', { name: 'Thôi' }))
    fireEvent.click(screen.getByRole('button', { name: 'Bỏ' }))
    expect(onClose).toHaveBeenCalledOnce()
  })

  it('điền sẵn tên, nhóm, mùa', () => {
    renderEditor({ name: 'pizza', groupKey: 'canh', facets: { season: 'thu' } })
    expect(screen.getByLabelText('Tên món')).toHaveValue('pizza')
    expect(screen.getByRole('radio', { name: 'Canh' })).toHaveAttribute('aria-checked', 'true')
    expect(screen.getByRole('radio', { name: 'Thu' })).toHaveAttribute('aria-checked', 'true')
  })

  it('Esc khi đang hỏi "Bỏ thay đổi?" là Ở lại; Ở lại đưa focus về ô Tên', async () => {
    renderEditor()
    fireEvent.change(screen.getByLabelText('Tên món'), { target: { value: 'x' } })
    fireEvent.keyDown(document, { key: 'Escape' })
    expect(screen.getByRole('alertdialog')).toBeInTheDocument()
    fireEvent.keyDown(document, { key: 'Escape' })
    expect(screen.queryByRole('alertdialog')).toBeNull()
    await new Promise((r) => requestAnimationFrame(r))
    expect(document.activeElement).toBe(screen.getByLabelText('Tên món'))
    expect(onClose).not.toHaveBeenCalled()
  })

  it('đang sửa dở thì chặn đóng tab (beforeunload); chưa sửa thì không', () => {
    renderEditor()
    const clean = new Event('beforeunload', { cancelable: true })
    window.dispatchEvent(clean)
    expect(clean.defaultPrevented).toBe(false)
    fireEvent.change(screen.getByLabelText('Tên món'), { target: { value: 'x' } })
    const dirty = new Event('beforeunload', { cancelable: true })
    window.dispatchEvent(dirty)
    expect(dirty.defaultPrevented).toBe(true)
  })

  it('chưa có household thì Lưu bị khoá', () => {
    createState = { isPending: false, error: null, ready: false }
    renderEditor({ name: 'A', groupKey: 'rau' })
    expect(screen.getByRole('button', { name: 'Lưu' })).toBeDisabled()
  })
})
