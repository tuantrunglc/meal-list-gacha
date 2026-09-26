/** Cỡ cạnh dài tối đa của ảnh món (AD-9, NFR7). */
export const MAX_EDGE = 1200
/** Ảnh gốc quá lớn thì không cố giải mã (tránh treo máy yếu). */
export const MAX_INPUT_BYTES = 25 * 1024 * 1024
const RATIO = 4 / 3

export type Rect = { x: number; y: number; w: number; h: number }

/** Vùng cắt giữa ảnh theo tỉ lệ 4:3. */
export function cropRect(width: number, height: number): Rect {
  if (width / height > RATIO) {
    const w = Math.round(height * RATIO)
    return { x: Math.round((width - w) / 2), y: 0, w, h: height }
  }
  const h = Math.round(width / RATIO)
  return { x: 0, y: Math.round((height - h) / 2), w: width, h }
}

/** Cỡ đích: cạnh dài ≤ MAX_EDGE, giữ tỉ lệ, không phóng to. */
export function targetSize(width: number, height: number): { w: number; h: number } {
  const scale = Math.min(1, MAX_EDGE / Math.max(width, height))
  return { w: Math.max(1, Math.round(width * scale)), h: Math.max(1, Math.round(height * scale)) }
}

export class ImageProcessingError extends Error {
  constructor(cause?: unknown) {
    super('image-processing', { cause })
    this.name = 'ImageProcessingError'
  }
}

function toBlob(canvas: HTMLCanvasElement, type: string, quality: number): Promise<Blob | null> {
  return new Promise((resolve) => canvas.toBlob(resolve, type, quality))
}

export type ProcessedImage = { file: File; previewUrl: string; width: number; height: number }

/**
 * Cắt 4:3, thu nhỏ và nén ảnh ngay trên trình duyệt. WebP nếu trình duyệt xuất được,
 * không thì JPEG (Safari xuất PNG khi xin WebP).
 */
export async function processImage(file: File): Promise<ProcessedImage> {
  if (file.size > MAX_INPUT_BYTES || (file.type && !file.type.startsWith('image/'))) {
    throw new ImageProcessingError()
  }
  let bitmap: ImageBitmap
  try {
    bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' })
  } catch (err) {
    throw new ImageProcessingError(err)
  }
  try {
    if (!bitmap.width || !bitmap.height) throw new ImageProcessingError()
    const crop = cropRect(bitmap.width, bitmap.height)
    const size = targetSize(crop.w, crop.h)
    const canvas = document.createElement('canvas')
    canvas.width = size.w
    canvas.height = size.h
    const ctx = canvas.getContext('2d')
    if (!ctx) throw new ImageProcessingError()
    ctx.imageSmoothingQuality = 'high'
    ctx.drawImage(bitmap, crop.x, crop.y, crop.w, crop.h, 0, 0, size.w, size.h)

    let blob = await toBlob(canvas, 'image/webp', 0.82)
    if (!blob || blob.type !== 'image/webp') blob = await toBlob(canvas, 'image/jpeg', 0.85)
    if (!blob) throw new ImageProcessingError()
    const ext = blob.type === 'image/webp' ? 'webp' : 'jpg'
    const out = new File([blob], `mon.${ext}`, { type: blob.type })
    return { file: out, previewUrl: URL.createObjectURL(out), width: size.w, height: size.h }
  } finally {
    bitmap.close()
  }
}
