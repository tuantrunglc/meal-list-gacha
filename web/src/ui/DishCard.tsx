import { useRef, useState, type PointerEvent } from 'react'
import { DishImage } from './DishImage'
import { GroupTag } from './GroupTag'
import { RarityBadge, rarityColor, type RarityLevel } from './RarityBadge'
import './DishCard.css'

type Props = {
  name: string
  imageSources: readonly string[]
  group?: { label: string; color: string }
  rarity: RarityLevel
  /** Chấm màu các giá trị facet (ví dụ mùa), kèm nhãn cho trình đọc màn hình. */
  dots: readonly { label: string; color: string }[]
  onOpen: () => void
  /** Nhãn cho trình đọc màn hình của cả thẻ. */
  label: string
  /** Vuốt sang trái đủ xa: yêu cầu xoá (người gọi hiện xác nhận). */
  onSwipeDelete?: () => void
}

/** Vuốt trái quá ngưỡng này (px) thì xin xoá. */
export const SWIPE_THRESHOLD = 72
// Di chuyển quá ngưỡng này thì coi là vuốt, không phải chạm
const DRAG_SLOP = 8
const DELETE_HINT = 'Xoá'

/** Thẻ món (`dish-card`): ảnh 4:3, tên, nhóm, sao, chấm mùa; viền 4px màu độ hiếm. Cả thẻ là một nút. */
export function DishCard({ name, imageSources, group, rarity, dots, onOpen, label, onSwipeDelete }: Props) {
  const [dx, setDx] = useState(0)
  const gesture = useRef<{ x: number; y: number; id: number; dx: number; decided: 'h' | 'v' | null } | null>(null)
  const suppressClick = useRef(false)

  function onPointerDown(e: PointerEvent<HTMLButtonElement>) {
    // Chỉ ngón/chuột chính (không chuột phải, không ngón thứ hai)
    if (!onSwipeDelete || e.isPrimary === false || (e.button ?? 0) !== 0) return
    gesture.current = { x: e.clientX, y: e.clientY, id: e.pointerId, dx: 0, decided: null }
    suppressClick.current = false
  }

  function onPointerMove(e: PointerEvent<HTMLButtonElement>) {
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
      // Giữ pointer để chuột kéo ra ngoài thẻ vẫn nhận được sự kiện
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

  const armed = dx <= -SWIPE_THRESHOLD

  return (
    <div className="dish-card__wrap">
      {dx !== 0 && (
        // Dải đỏ phía sau cho biết vuốt là để xoá; đủ xa thì đậm lên
        <span className={`dish-card__swipe-hint${armed ? ' dish-card__swipe-hint--armed' : ''}`} aria-hidden="true">
          {DELETE_HINT}
        </span>
      )}
    <button
      type="button"
      className="dish-card"
      style={{ borderColor: rarityColor[rarity], transform: dx ? `translateX(${dx}px)` : undefined }}
      onClick={() => {
        // vừa vuốt xong thì không mở chi tiết
        if (suppressClick.current) {
          suppressClick.current = false
          return
        }
        onOpen()
      }}
      onKeyDown={() => {
        suppressClick.current = false
      }}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerCancel}
      onLostPointerCapture={() => {
        // mất pointer giữa chừng (không có pointerup): trượt về
        if (gesture.current) onPointerCancel()
      }}
      aria-label={label}
      data-swiping={dx !== 0 || undefined}
    >
      <DishImage className="dish-card__image" sources={imageSources} alt="" />
      <span className="dish-card__body">
        <span className="dish-card__name">{name}</span>
        <span className="dish-card__meta">
          {group && <GroupTag label={group.label} color={group.color} />}
          <RarityBadge rarity={rarity} />
          {dots.map((d, i) => (
            <span key={`${i}:${d.label}`} className="dish-card__dot" style={{ background: d.color }} title={d.label} aria-hidden="true" />
          ))}
        </span>
      </span>
    </button>
    </div>
  )
}
