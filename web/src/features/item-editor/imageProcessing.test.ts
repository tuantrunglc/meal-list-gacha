import { afterEach, describe, expect, it, vi } from 'vitest'
import { cropRect, processImage, targetSize } from './imageProcessing'

describe('cropRect', () => {
  it('ảnh ngang rộng: cắt hai bên, giữ chiều cao', () => {
    expect(cropRect(4000, 2000)).toEqual({ x: 667, y: 0, w: 2667, h: 2000 })
  })
  it('ảnh dọc: cắt trên dưới, giữ chiều ngang', () => {
    expect(cropRect(3000, 4000)).toEqual({ x: 0, y: 875, w: 3000, h: 2250 })
  })
  it('đúng 4:3 thì giữ nguyên', () => {
    expect(cropRect(800, 600)).toEqual({ x: 0, y: 0, w: 800, h: 600 })
  })
})

describe('targetSize', () => {
  it('thu cạnh dài về 1200', () => {
    expect(targetSize(2667, 2000)).toEqual({ w: 1200, h: 900 })
    expect(targetSize(3000, 2250)).toEqual({ w: 1200, h: 900 })
  })
  it('ảnh nhỏ không phóng to', () => {
    expect(targetSize(800, 600)).toEqual({ w: 800, h: 600 })
  })
})

describe('processImage', () => {
  it('file không phải ảnh hoặc quá lớn thì báo lỗi xử lý ảnh', async () => {
    await expect(processImage(new File(['x'], 'a.txt', { type: 'text/plain' }))).rejects.toMatchObject({ name: 'ImageProcessingError' })
    const huge = new File([new Uint8Array(26 * 1024 * 1024)], 'b.jpg', { type: 'image/jpeg' })
    await expect(processImage(huge)).rejects.toMatchObject({ name: 'ImageProcessingError' })
  })
})

describe('processImage (canvas giả lập)', () => {
  afterEach(() => vi.unstubAllGlobals())

  function stub(webpType: string) {
    const drawImage = vi.fn()
    vi.stubGlobal('createImageBitmap', vi.fn(async () => ({ width: 4000, height: 2000, close: vi.fn() })))
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue({ drawImage, imageSmoothingQuality: 'low' } as never)
    vi.spyOn(HTMLCanvasElement.prototype, 'toBlob').mockImplementation(function (this: HTMLCanvasElement, cb, type) {
      cb(new Blob(['x'], { type: type === 'image/webp' ? webpType : String(type) }))
    })
    URL.createObjectURL = vi.fn(() => 'blob:preview')
    return drawImage
  }

  it('trình duyệt xuất được WebP: file webp 1200×900, cắt đúng vùng giữa', async () => {
    const draw = stub('image/webp')
    const out = await processImage(new File(['raw'], 'a.jpg', { type: 'image/jpeg' }))
    expect(out).toMatchObject({ width: 1200, height: 900, previewUrl: 'blob:preview' })
    expect(out.file.type).toBe('image/webp')
    expect(out.file.name).toBe('mon.webp')
    expect(draw).toHaveBeenCalledWith(expect.anything(), 667, 0, 2667, 2000, 0, 0, 1200, 900)
  })

  it('Safari trả PNG khi xin WebP: chuyển sang JPEG', async () => {
    stub('image/png')
    const out = await processImage(new File(['raw'], 'a.jpg', { type: 'image/jpeg' }))
    expect(out.file.type).toBe('image/jpeg')
    expect(out.file.name).toBe('mon.jpg')
  })

  it('không giải mã được thì lỗi xử lý ảnh', async () => {
    vi.stubGlobal('createImageBitmap', vi.fn(async () => { throw new Error('bad') }))
    await expect(processImage(new File(['raw'], 'a.jpg', { type: 'image/jpeg' }))).rejects.toMatchObject({ name: 'ImageProcessingError' })
  })
})
