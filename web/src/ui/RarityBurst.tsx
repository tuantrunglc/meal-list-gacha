import { useEffect, useRef } from 'react'
import { copy } from './copy'
import './RarityBurst.css'

type Rarity = 1 | 2 | 3

/** Thời lượng hiệu ứng của từng bậc (ms). */
export const BURST_MS: Record<Rarity, number> = { 1: 700, 2: 800, 3: 1500 }

const GRAINS = [0, 1, 2, 3, 4]
const SPARKLES = [0, 1, 2, 3]

/**
 * Hiệu ứng khi thẻ bật ra, theo bậc sao (chỉ trang trí, trong 24px quanh thẻ).
 * Đặt trong phần tử `position: relative` của thẻ; hết giờ thì gọi `onDone`.
 */
export function RarityBurst({ rarity, onDone }: { rarity: Rarity; onDone?: () => void }) {
  // Hẹn giờ không chạy lại khi cha render lại (onDone thường là hàm mới mỗi lần)
  const done = useRef(onDone)
  useEffect(() => {
    done.current = onDone
  }, [onDone])
  useEffect(() => {
    const t = window.setTimeout(() => done.current?.(), BURST_MS[rarity])
    return () => window.clearTimeout(t)
  }, [rarity])

  return (
    <span className={`rarity-burst rarity-burst--${rarity}`} aria-hidden="true" data-rarity-burst={rarity}>
      {rarity === 1 && (
        <span className="rarity-burst__steam">
          <span />
          <span />
          <span />
        </span>
      )}
      {rarity === 2 && (
        <>
          <span className="rarity-burst__sweep" />
          {GRAINS.map((i) => (
            <span key={i} className={`rarity-burst__grain rarity-burst__grain--${i}`} />
          ))}
        </>
      )}
      {rarity === 3 && (
        <>
          <span className="rarity-burst__rays" />
          {SPARKLES.map((i) => (
            <span key={i} className={`rarity-burst__sparkle rarity-burst__sparkle--${i}`}>
              ✦
            </span>
          ))}
          <span className="rarity-burst__label">{copy.tray.legendary}</span>
        </>
      )}
    </span>
  )
}
