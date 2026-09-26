import { domAnimation, LazyMotion, MotionConfig } from 'motion/react'
import type { ReactNode } from 'react'

/**
 * Gốc cho mọi animation `motion`: LazyMotion + `m.*` chỉ nạp phần cần dùng (bundle nhỏ),
 * `strict` báo lỗi nếu lỡ dùng `motion.*`; MotionConfig là lưới an toàn tôn trọng Giảm chuyển động.
 * Lưu ý: `domAnimation` không có layout/drag — cần thì đổi sang `domMax`.
 */
export function MotionProvider({ children }: { children: ReactNode }) {
  return (
    <LazyMotion features={domAnimation} strict>
      <MotionConfig reducedMotion="user">{children}</MotionConfig>
    </LazyMotion>
  )
}
