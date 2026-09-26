export type Rarity = 1 | 2 | 3

export const RARITIES: readonly Rarity[] = [1, 2, 3]

/** Món tối thiểu engine cần biết. */
export type EngineItem = {
  id: string
  groupKey: string
  rarity: Rarity
  /** Giá trị facet (ví dụ mùa). */
  tags: readonly string[]
  deleted: boolean
}

export type EngineFacet = {
  key: string
  /** Giá trị luôn khớp với mọi lựa chọn (ví dụ "quanh năm"). */
  universalValue?: string
}

/** Phần luật của một Bộ gacha mà engine cần. */
export type EngineSet = {
  rarityWeights: Readonly<Record<Rarity, number>>
  facets: readonly EngineFacet[]
}

export type RecentDraw = {
  /** ISO 8601 UTC. */
  chosenAt: string
  entries: readonly { itemId: string }[]
}

export type Slot = {
  id: string
  groupKey: string
  itemId: string | null
  /**
   * true: giữ nguyên món (đang khoá, hoặc không phải ô cần quay lại).
   * Ô giữ mà chưa có món (`itemId=null`) trả về `empty`; muốn quay thì đặt `keep=false`.
   */
  keep: boolean
  /** Khi quay lại ô này: tránh món này nếu còn món khác hợp lệ (🎲 "Đổi món này"). */
  avoidItemId?: string | null
}

export type SlotStatus = 'filled' | 'kept' | 'empty'

export type SlotResult = {
  id: string
  groupKey: string
  itemId: string | null
  rarity: Rarity | null
  status: SlotStatus
}

export type DrawInput = {
  set: EngineSet
  items: readonly EngineItem[]
  recentDraws: readonly RecentDraw[]
  cooldownDays: number
  slots: readonly Slot[]
  /** facetKey → giá trị đang chọn. Facet không có trong đây thì không lọc. */
  filters: Readonly<Record<string, string>>
  now: Date
  rng: () => number
}

export type DrawResult = {
  slots: SlotResult[]
  /** Thứ tự bật thẻ (id ô): theo thứ tự ô, món bậc 3 xuống cuối. */
  revealOrder: string[]
}
