import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { useState } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ImagePicker, type PickedImage } from './ImagePicker'
import { ImageProcessingError } from './imageProcessing'

const processImage = vi.fn()
vi.mock('./imageProcessing', async (orig) => ({
  ...(await orig<typeof import('./imageProcessing')>()),
  processImage: (f: File) => processImage(f),
}))

const box: { value?: PickedImage } = {}
function Harness() {
  const [v, setV] = useState<PickedImage>(null)
  return (
    <ImagePicker
      value={v}
      onChange={(next) => {
        box.value = next
        setV(next)
      }}
    />
  )
}

const pick = (testId: string, file: File) => fireEvent.change(screen.getByTestId(testId), { target: { files: [file] } })

describe('ImagePicker', () => {
  beforeEach(() => {
    processImage.mockReset()
    box.value = undefined
    URL.revokeObjectURL = vi.fn()
  })

  it('chạm ô ảnh hiện Chụp ảnh / Chọn từ thư viện; chọn xong thì xem trước; Bỏ ảnh', async () => {
    const processed = { file: new File(['x'], 'mon.webp', { type: 'image/webp' }), previewUrl: 'blob:preview', width: 1200, height: 900 }
    processImage.mockResolvedValue(processed)
    render(<Harness />)
    fireEvent.click(screen.getByRole('button', { name: 'Thêm ảnh món' }))
    expect(screen.getByRole('button', { name: 'Chụp ảnh' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Chọn từ thư viện' })).toBeInTheDocument()
    expect(screen.getByTestId('image-camera')).toHaveAttribute('capture', 'environment')
    pick('image-gallery', new File(['raw'], 'a.jpg', { type: 'image/jpeg' }))
    await waitFor(() => expect(box.value).toBe(processed))
    expect(document.querySelector('img')).toHaveAttribute('src', 'blob:preview')
    fireEvent.click(screen.getByRole('button', { name: 'Đổi ảnh món' }))
    fireEvent.click(screen.getByRole('button', { name: 'Bỏ ảnh' }))
    expect(box.value).toBeNull()
    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:preview')
  })

  it('ảnh lỗi thì báo thân thiện, không đổi giá trị', async () => {
    processImage.mockRejectedValue(new ImageProcessingError())
    render(<Harness />)
    fireEvent.click(screen.getByRole('button', { name: 'Thêm ảnh món' }))
    pick('image-camera', new File(['bad'], 'x.jpg', { type: 'image/jpeg' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('Ảnh này khó chịu quá, thử tấm khác nhé')
    expect(box.value).toBeUndefined()
  })
})
