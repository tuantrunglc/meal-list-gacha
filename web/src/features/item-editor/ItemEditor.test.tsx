import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { AppError } from '../../data/errors'
import type { Item } from '../../data/items'
import { foodSet } from '../../sets/food/definition'
import { useToast } from '../../ui/toast'
import { ItemEditor } from './ItemEditor'

type Opts = { onSuccess?: () => void }
const mutate = vi.fn<(input: Record<string, unknown>, opts?: Opts) => void>()
const reset = vi.fn()
let createState: { isPending: boolean; error: AppError | null; ready: boolean } = { isPending: false, error: null, ready: true }
const updateMutate = vi.fn<(input: Record<string, unknown>, opts?: Opts) => void>()
let updateState: { isPending: boolean; error: AppError | null; ready: boolean } = { isPending: false, error: null, ready: true }
vi.mock('../../data/items', () => ({
  useCreateItem: () => ({ mutate, reset, ...createState }),
  useUpdateItem: () => ({ mutate: updateMutate, reset: vi.fn(), ...updateState }),
}))

const processImage = vi.fn()
vi.mock('./imageProcessing', async (orig) => ({
  ...(await orig<typeof import('./imageProcessing')>()),
  processImage: (f: File) => processImage(f),
}))

const onClose = vi.fn()
const renderEditor = (prefill = {}) => render(<ItemEditor set={foodSet} prefill={prefill} onClose={onClose} />)

describe('ItemEditor', () => {
  beforeEach(() => {
    mutate.mockReset()
    updateMutate.mockReset()
    updateState = { isPending: false, error: null, ready: true }
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

  it('chỉ chọn ảnh cũng là đã sửa; ảnh được gửi khi lưu', async () => {
    const processed = { file: new File(['x'], 'mon.webp', { type: 'image/webp' }), previewUrl: 'blob:p', width: 1200, height: 900 }
    processImage.mockResolvedValue(processed)
    renderEditor({ name: 'Có ảnh', groupKey: 'rau' })
    fireEvent.click(screen.getByRole('button', { name: 'Thêm ảnh món' }))
    fireEvent.change(screen.getByTestId('image-gallery'), { target: { files: [new File(['r'], 'a.jpg', { type: 'image/jpeg' })] } })
    await waitFor(() => expect(document.querySelector('.image-picker__preview img')).toHaveAttribute('src', 'blob:p'))
    fireEvent.click(screen.getByRole('button', { name: 'Lưu' }))
    expect(mutate.mock.calls[0][0].image).toBe(processed.file)
  })

  it('đang xử lý ảnh thì chưa lưu, chưa đóng được', async () => {
    let resolve!: (v: unknown) => void
    processImage.mockReturnValue(new Promise((r) => (resolve = r)))
    renderEditor({ name: 'A', groupKey: 'rau' })
    fireEvent.click(screen.getByRole('button', { name: 'Thêm ảnh món' }))
    fireEvent.change(screen.getByTestId('image-gallery'), { target: { files: [new File(['r'], 'a.jpg', { type: 'image/jpeg' })] } })
    await waitFor(() => expect(screen.getByRole('button', { name: 'Lưu' })).toBeDisabled())
    fireEvent.keyDown(document, { key: 'Escape' })
    expect(onClose).not.toHaveBeenCalled()
    await act(async () => resolve({ file: new File(['x'], 'm.webp'), previewUrl: 'blob:q', width: 1, height: 1 }))
    expect(screen.getByRole('button', { name: 'Lưu' })).toBeEnabled()
  })

  describe('chế độ sửa', () => {
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
      imageFile: 'cu.webp',
      collectionId: 'c',
      updated: '',
    }

    it('điền sẵn dữ liệu món, tiêu đề Sửa món; chưa đổi gì thì Thôi đóng luôn', () => {
      render(<ItemEditor set={foodSet} item={item} onClose={onClose} />)
      expect(screen.getByRole('dialog', { name: 'Sửa món' })).toBeInTheDocument()
      expect(screen.getByLabelText('Tên món')).toHaveValue('Cá kho tộ')
      expect(screen.getByRole('radio', { name: 'Mặn' })).toHaveAttribute('aria-checked', 'true')
      expect(screen.getByRole('radio', { name: 'Quanh năm' })).toHaveAttribute('aria-checked', 'true')
      expect(screen.getByRole('radio', { name: '⭐⭐⭐ Đặc biệt' })).toHaveAttribute('aria-checked', 'true')
      expect(screen.getByLabelText('Nguyên liệu 1')).toHaveValue(seed.attrs.ingredients[0])
      expect(document.querySelector('.image-picker__preview img')!.getAttribute('src')).toContain('cu.webp')
      fireEvent.click(screen.getByRole('button', { name: 'Thôi' }))
      expect(onClose).toHaveBeenCalledOnce()
    })

    it('chỉ sửa tên: gửi update không kèm ảnh (giữ ảnh)', () => {
      render(<ItemEditor set={foodSet} item={item} onClose={onClose} />)
      fireEvent.change(screen.getByLabelText('Tên món'), { target: { value: 'Cá kho tộ của bà' } })
      fireEvent.click(screen.getByRole('button', { name: 'Lưu' }))
      expect(mutate).not.toHaveBeenCalled()
      const [input] = updateMutate.mock.calls[0]
      expect(input).toMatchObject({ id: 'i1', name: 'Cá kho tộ của bà', groupKey: 'man', rarity: 3, tags: ['quanh-nam'] })
      expect(input.image).toBeUndefined()
      expect('seedKey' in input).toBe(false)
    })

    it('Bỏ ảnh rồi lưu: gửi image = null', () => {
      render(<ItemEditor set={foodSet} item={item} onClose={onClose} />)
      fireEvent.click(screen.getByRole('button', { name: 'Đổi ảnh món' }))
      fireEvent.click(screen.getByRole('button', { name: 'Bỏ ảnh' }))
      fireEvent.click(screen.getByRole('button', { name: 'Lưu' }))
      expect(updateMutate.mock.calls[0][0].image).toBeNull()
    })

    it('món seed chưa upload ảnh: ô ảnh là "Thêm ảnh món", không có "Bỏ ảnh"', () => {
      render(<ItemEditor set={foodSet} item={{ ...item, imageFile: '' }} onClose={onClose} />)
      fireEvent.click(screen.getByRole('button', { name: 'Thêm ảnh món' }))
      expect(screen.queryByRole('button', { name: 'Bỏ ảnh' })).toBeNull()
    })

    it('món chưa có công thức vẫn có một dòng để gõ', () => {
      render(<ItemEditor set={foodSet} item={{ ...item, attrs: { ingredients: [], steps: [] } }} onClose={onClose} />)
      expect(screen.getByLabelText('Nguyên liệu 1')).toHaveValue('')
      expect(screen.getByLabelText('Bước 1')).toHaveValue('')
    })

    it('lỗi khi sửa: giữ dữ liệu, lời nhắn + Thử lại gọi lại update; đang lưu thì khoá', () => {
      const { rerender } = render(<ItemEditor set={foodSet} item={item} onClose={onClose} />)
      fireEvent.change(screen.getByLabelText('Tên món'), { target: { value: 'Tên mới' } })
      fireEvent.click(screen.getByRole('button', { name: 'Lưu' }))
      updateState = { isPending: false, error: new AppError('network'), ready: true }
      rerender(<ItemEditor set={foodSet} item={item} onClose={onClose} />)
      expect(screen.getByLabelText('Tên món')).toHaveValue('Tên mới')
      fireEvent.click(within(screen.getByRole('alert')).getByRole('button', { name: 'Thử lại' }))
      expect(updateMutate).toHaveBeenCalledTimes(2)
      expect(mutate).not.toHaveBeenCalled()
      updateState = { isPending: true, error: null, ready: true }
      rerender(<ItemEditor set={foodSet} item={item} onClose={onClose} />)
      expect(screen.getByLabelText('Tên món')).toBeDisabled()
    })

    it('đổi ảnh: gửi File; thành công thì toast + đóng', async () => {
      const processed = { file: new File(['x'], 'moi.webp', { type: 'image/webp' }), previewUrl: 'blob:m', width: 1, height: 1 }
      processImage.mockResolvedValue(processed)
      render(<ItemEditor set={foodSet} item={item} onClose={onClose} />)
      fireEvent.click(screen.getByRole('button', { name: 'Đổi ảnh món' }))
      fireEvent.change(screen.getByTestId('image-gallery'), { target: { files: [new File(['r'], 'a.jpg', { type: 'image/jpeg' })] } })
      await waitFor(() => expect(document.querySelector('.image-picker__preview img')).toHaveAttribute('src', 'blob:m'))
      fireEvent.click(screen.getByRole('button', { name: 'Lưu' }))
      const [input, opts] = updateMutate.mock.calls[0]
      expect(input.image).toBe(processed.file)
      opts!.onSuccess!()
      expect(useToast.getState().message).toBe('Đã lưu vào nồi!')
      expect(onClose).toHaveBeenCalled()
    })

    it('bỏ ảnh vừa chọn thì quay về ảnh đang có, không xoá ảnh đã upload', async () => {
      processImage.mockResolvedValue({ file: new File(['x'], 'm.webp'), previewUrl: 'blob:n', width: 1, height: 1 })
      render(<ItemEditor set={foodSet} item={item} onClose={onClose} />)
      fireEvent.click(screen.getByRole('button', { name: 'Đổi ảnh món' }))
      fireEvent.change(screen.getByTestId('image-gallery'), { target: { files: [new File(['r'], 'a.jpg', { type: 'image/jpeg' })] } })
      await waitFor(() => expect(document.querySelector('.image-picker__preview img')).toHaveAttribute('src', 'blob:n'))
      fireEvent.click(screen.getByRole('button', { name: 'Đổi ảnh món' }))
      fireEvent.click(screen.getByRole('button', { name: 'Bỏ ảnh' }))
      expect(document.querySelector('.image-picker__preview img')!.getAttribute('src')).toContain('cu.webp')
      fireEvent.click(screen.getByRole('button', { name: 'Thôi' }))
      // không còn thay đổi gì: đóng luôn, không hỏi
      expect(onClose).toHaveBeenCalled()
    })

    it('giữ tag ngoài facet; công thức không đọc được mà không đụng tới thì không ghi đè', () => {
      render(<ItemEditor set={foodSet} item={{ ...item, tags: ['quanh-nam', 'tet'], attrs: 'hỏng' }} onClose={onClose} />)
      fireEvent.change(screen.getByLabelText('Tên món'), { target: { value: 'Đổi tên' } })
      fireEvent.click(screen.getByRole('button', { name: 'Lưu' }))
      const [input] = updateMutate.mock.calls[0]
      expect(input.tags).toEqual(['tet', 'quanh-nam'])
      expect(input.attrs).toBeUndefined()
    })

    it('bấm vào dòng trống rồi xoá lại không tính là thay đổi', () => {
      render(<ItemEditor set={foodSet} item={{ ...item, attrs: { ingredients: [], steps: [] } }} onClose={onClose} />)
      fireEvent.change(screen.getByLabelText('Nguyên liệu 1'), { target: { value: 'a' } })
      fireEvent.change(screen.getByLabelText('Nguyên liệu 1'), { target: { value: '' } })
      fireEvent.click(screen.getByRole('button', { name: 'Thôi' }))
      expect(onClose).toHaveBeenCalled()
    })
  })
})
