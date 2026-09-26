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
}

/** Thẻ món (`dish-card`): ảnh 4:3, tên, nhóm, sao, chấm mùa; viền 4px màu độ hiếm. Cả thẻ là một nút. */
export function DishCard({ name, imageSources, group, rarity, dots, onOpen, label }: Props) {
  return (
    <button type="button" className="dish-card" style={{ borderColor: rarityColor[rarity] }} onClick={onOpen} aria-label={label}>
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
  )
}
