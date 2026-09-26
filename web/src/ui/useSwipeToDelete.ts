import { useRef, useState, type PointerEvent } from 'react'

/** Vuốt trái quá ngưỡng này (px) thì xin xoá. */
export const SWIPE_THRESHOLD = 72
// Di chuyển quá ngưỡng này thì coi là vuốt, không phải chạm
const DRAG_SLOP = 8

type Gesture = { x: number; y: number; id: number; dx: number; decided: 'h' | 'v' | null }

/**
 * Vuốt sang trái để xin xoá (thẻ món, hàng lịch sử). Trả `dx` để dịch phần tử, cờ `armed`
 * (đã qua ngưỡng), các handler pointer và `shouldSuppressClick()` để bỏ cú click ngay sau khi vuốt.
 */
export function useSwipeToDelete(onSwipeDelete?: () => void) {
  const [dx, setDx] = useState(0)
  const gesture = useRef<Gesture | null>(null)
  const suppressClick = useRef(false)

  function onPointerDown(e: PointerEvent<HTMLElement>) {
    // Chỉ ngón/chuột chính (không chuột phải, không ngón thứ hai)
    if (!onSwipeDelete || e.isPrimary === false || (e.button ?? 0) !== 0) return
    gesture.current = { x: e.clientX, y: e.clientY, id: e.pointerId, dx: 0, decided: null }
    suppressClick.current = false
  }

  function onPointerMove(e: PointerEvent<HTMLElement>) {
    const g = gesture.current
    if (!g || g.id !== e.pointerId) return
    const moveX = e.clientX - g.x
    const moveY = e.clientY - g.y
    if (g.decided === null) {
      // Chỉ quyết định hướng khi đã đi quá ngưỡng rung tay
      if (Math.max(Math.abs(moveX), Math.abs(moveY)) <= DRAG_SLOP) return
      g.decided = Math.abs(moveX) > Math.abs(moveY) ? 'h' : 'v'
      if (g.decided === 'v') {
        gesture.current = null
        return
      }
      // Giữ pointer để chuột kéo ra ngoài vẫn nhận được sự kiện
      e.currentTarget.setPointerCapture?.(e.pointerId)
      suppressClick.current = true
    }
    g.dx = Math.min(0, moveX)
    setDx(g.dx)
  }

  function onPointerUp() {
    const g = gesture.current
    gesture.current = null
    setDx(0)
    // click (nếu có) tới ngay sau pointerup; sau đó thôi chặn để lần chạm sau vẫn mở được
    window.setTimeout(() => {
      suppressClick.current = false
    }, 0)
    // Tính theo khoảng cách của chính cử chỉ (không theo state có thể chưa vẽ)
    if (g && g.decided === 'h' && g.dx <= -SWIPE_THRESHOLD) onSwipeDelete?.()
  }

  function onPointerCancel() {
    // Hệ thống ngắt cử chỉ: chỉ trượt về, không xin xoá
    gesture.current = null
    suppressClick.current = false
    setDx(0)
  }

  return {
    dx,
    armed: dx <= -SWIPE_THRESHOLD,
    handlers: {
      onPointerDown,
      onPointerMove,
      onPointerUp,
      onPointerCancel,
      onLostPointerCapture: () => {
        // mất pointer giữa chừng (không có pointerup): trượt về
        if (gesture.current) onPointerCancel()
      },
      onKeyDown: () => {
        suppressClick.current = false
      },
    },
    /** Gọi trong onClick: true nếu cú click này là đuôi của một cú vuốt. */
    shouldSuppressClick: () => {
      if (!suppressClick.current) return false
      suppressClick.current = false
      return true
    },
  }
}
