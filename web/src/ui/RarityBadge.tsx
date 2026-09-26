import { copy } from './copy'
import './tags.css'

export type RarityLevel = 1 | 2 | 3

/** Huy hiệu độ hiếm: luôn có số sao kèm chữ, không chỉ dựa vào màu. */
export function RarityBadge({ rarity }: { rarity: RarityLevel }) {
  const r = copy.rarity[rarity]
  return (
    <span className={`rarity-badge rarity-badge--${rarity}`}>
      <span aria-hidden="true">{r.stars}</span> {r.label}
    </span>
  )
}

export const rarityColor: Record<RarityLevel, string> = {
  1: 'var(--color-rarity-common)',
  2: 'var(--color-rarity-rare)',
  3: 'var(--color-rarity-legend)',
}
