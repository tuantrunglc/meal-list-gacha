import { useEffect, useRef, useState } from 'react'
import { copy } from '../../ui/copy'
import { DishImage } from '../../ui/DishImage'
import { processImage, type ProcessedImage } from './imageProcessing'
import './ImagePicker.css'

export type PickedImage = ProcessedImage | null

type Props = {
  /** Ảnh mới đã chọn (null = chưa chọn / đã bỏ). */
  value: PickedImage
  /** Nguồn hiển thị khi chưa chọn ảnh mới (ảnh đã upload → ảnh seed). */
  existingSources?: readonly string[]
  /** Món đang có ảnh đã upload (bỏ được). Ảnh seed chỉ để hiển thị, không bỏ được. */
  hasUploaded?: boolean
  onChange: (image: PickedImage) => void
  /** Bỏ ảnh đang có của món (khi sửa). */
  onRemoveExisting?: () => void
  disabled?: boolean
  /** Đang xử lý ảnh: form không cho lưu/đóng tới khi xong. */
  onBusyChange?: (busy: boolean) => void
}

/** Ô ảnh món: xem trước 4:3, chọn Chụp ảnh / Chọn từ thư viện / Bỏ ảnh. */
export function ImagePicker({
  value,
  existingSources = [],
  hasUploaded = false,
  onChange,
  onRemoveExisting,
  disabled,
  onBusyChange,
}: Props) {
  const [open, setOpen] = useState(false)
  const [processing, setProcessing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const cameraRef = useRef<HTMLInputElement>(null)
  const galleryRef = useRef<HTMLInputElement>(null)
  const mounted = useRef(true)
  useEffect(() => {
    mounted.current = true
    return () => {
      mounted.current = false
    }
  }, [])
  const hasImage = value !== null || hasUploaded
  const sources = value ? [value.previewUrl] : existingSources

  async function onFile(input: HTMLInputElement) {
    const file = input.files?.[0]
    // cho phép chọn lại đúng file đó lần sau
    input.value = ''
    if (!file) return
    setError(null)
    setProcessing(true)
    onBusyChange?.(true)
    try {
      const processed = await processImage(file)
      // Form đã đóng trong lúc xử lý: bỏ luôn ảnh vừa làm
      if (!mounted.current) return URL.revokeObjectURL(processed.previewUrl)
      if (value) URL.revokeObjectURL(value.previewUrl)
      onChange(processed)
      setOpen(false)
    } catch {
      if (mounted.current) setError(copy.image.error)
    } finally {
      if (mounted.current) {
        setProcessing(false)
        onBusyChange?.(false)
      }
    }
  }

  function remove() {
    if (value) {
      // Bỏ ảnh vừa chọn: quay về ảnh đang có (nếu có), không đụng ảnh đã upload
      URL.revokeObjectURL(value.previewUrl)
      onChange(null)
    } else {
      onRemoveExisting?.()
    }
    setOpen(false)
    setError(null)
  }

  return (
    <div className="image-picker">
      <button
        type="button"
        className="image-picker__preview"
        aria-label={hasImage ? copy.image.change : copy.image.add}
        aria-expanded={open}
        disabled={disabled || processing}
        onClick={() => setOpen((o) => !o)}
      >
        <DishImage sources={sources} alt="" />
        {processing && (
          <span className="image-picker__busy" aria-hidden="true">
            {copy.image.processing}
          </span>
        )}
      </button>
      <span className="visually-hidden" role="status">
        {processing ? copy.image.processing : ''}
      </span>

      {open && (
        <div className="image-picker__options" role="group" aria-label={copy.image.optionsLabel}>
          <button type="button" className="button-secondary" onClick={() => cameraRef.current?.click()} disabled={processing}>
            {copy.image.camera}
          </button>
          <button type="button" className="button-secondary" onClick={() => galleryRef.current?.click()} disabled={processing}>
            {copy.image.gallery}
          </button>
          {hasImage && (
            <button type="button" className="button-secondary" onClick={remove} disabled={processing}>
              {copy.image.remove}
            </button>
          )}
        </div>
      )}

      <input
        ref={cameraRef}
        type="file"
        accept="image/*"
        capture="environment"
        hidden
        data-testid="image-camera"
        onChange={(e) => void onFile(e.currentTarget)}
      />
      <input
        ref={galleryRef}
        type="file"
        accept="image/*"
        hidden
        data-testid="image-gallery"
        onChange={(e) => void onFile(e.currentTarget)}
      />

      {error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}
    </div>
  )
}
