import { copy } from './copy'
import { DishImage } from './DishImage'
import { GroupTag } from './GroupTag'
import { RarityBadge, rarityColor, type RarityLevel } from './RarityBadge'
import { useSwipeToDelete } from './useSwipeToDelete'
import './DishCard.css'

export { SWIPE_THRESHOLD } from './useSwipeToDelete'

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


/** Thẻ món (`dish-card`): ảnh 4:3, tên, nhóm, sao, chấm mùa; viền 4px màu độ hiếm. Cả thẻ là một nút. */
export function DishCard({ name, imageSources, group, rarity, dots, onOpen, label, onSwipeDelete }: Props) {
  const swipe = useSwipeToDelete(onSwipeDelete)
  const { dx, armed } = swipe

  return (
    <div className="dish-card__wrap">
      {dx !== 0 && (
        // Dải đỏ phía sau cho biết vuốt là để xoá; đủ xa thì đậm lên
        <span className={`dish-card__swipe-hint${armed ? ' dish-card__swipe-hint--armed' : ''}`} aria-hidden="true">
          {copy.common.swipeDelete}
        </span>
      )}
    <button
      type="button"
      className="dish-card"
      style={{ borderColor: rarityColor[rarity], transform: dx ? `translateX(${dx}px)` : undefined }}
      onClick={() => {
        // vừa vuốt xong thì không mở chi tiết
        if (!swipe.shouldSuppressClick()) onOpen()
      }}
      {...swipe.handlers}
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
