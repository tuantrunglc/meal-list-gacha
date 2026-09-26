import { useState } from 'react'
import { copy } from './copy'
import './DishImage.css'

type Props = {
  /** Nguồn ảnh theo thứ tự ưu tiên; ảnh lỗi thì thử nguồn kế. */
  sources: readonly string[]
  alt: string
  className?: string
  /** Ẩn chữ "Thêm ảnh" khi khung quá nhỏ (ví dụ thumb trong mâm). */
  compact?: boolean
}

/** Ảnh món 4:3. Hết nguồn thì hiện đĩa trống, không bao giờ hiện icon ảnh vỡ. */
export function DishImage({ sources, alt, className, compact }: Props) {
  // Ghi nhớ theo danh sách nguồn: đổi món thì thử lại từ đầu
  const list = sources.filter(Boolean)
  const key = list.join('|')
  const [failed, setFailed] = useState<{ key: string; count: number }>({ key, count: 0 })
  const index = failed.key === key ? failed.count : 0
  const src = list[index]
  const classes = ['dish-image', className].filter(Boolean).join(' ')

  if (!src) {
    return (
      <div className={`${classes} dish-image--empty`} role="img" aria-label={alt}>
        <svg className="dish-image__plate" viewBox="0 0 64 40" aria-hidden="true" focusable="false">
          <ellipse cx="32" cy="22" rx="30" ry="15" fill="var(--color-surface-raised)" stroke="var(--color-border-soft)" strokeWidth="2" />
          <ellipse cx="32" cy="21" rx="18" ry="8" fill="none" stroke="var(--color-border-soft)" strokeWidth="2" />
        </svg>
        {!compact && <span className="dish-image__label">{copy.dishImage.empty}</span>}
      </div>
    )
  }

  return (
    <div className={classes}>
      <img
        key={src}
        src={src}
        alt={alt}
        loading="lazy"
        decoding="async"
        onError={() => setFailed({ key, count: index + 1 })}
      />
    </div>
  )
}
