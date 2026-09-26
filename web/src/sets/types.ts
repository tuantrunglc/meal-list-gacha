import type { EngineFacet, EngineSet, Rarity } from '../engine'

export type GroupDefinition = {
  key: string
  label: string
  /** Giá trị CSS, ví dụ `var(--color-group-man)`. */
  color: string
}

export type FacetValue = {
  key: string
  label: string
  color: string
}

export type FacetDefinition = EngineFacet & {
  label: string
  values: readonly FacetValue[]
  /** Giá trị chọn sẵn theo thời điểm (ví dụ mùa theo tháng). */
  defaultValue: (now: Date) => string
}

export type SlotTemplateEntry = {
  groupKey: string
  removable: boolean
}

export type AttrsResult<A> = { ok: true; value: A } | { ok: false; error: string }

export type SeedItem<A> = {
  seedKey: string
  groupKey: string
  name: string
  rarity: Rarity
  tags: string[]
  attrs: A
}

// facets là bản mở rộng của EngineSet nên SetDefinition vẫn truyền thẳng cho engine được
export type SetDefinition<A = unknown> = Omit<EngineSet, 'facets'> & {
  setKey: string
  label: string
  groups: readonly GroupDefinition[]
  slotTemplate: readonly SlotTemplateEntry[]
  defaultCooldownDays: number
  facets: readonly FacetDefinition[]
  /** Câu chữ riêng của Bộ trên màn Quay/Mâm. */
  messages: {
    /** Ô không còn món hợp lệ, ví dụ "Hết món Canh mùa này rồi 😅". */
    emptySlot: (groupLabel: string) => string
    /** Nút mở lại bộ lọc facet, ví dụ "Đổi mùa". */
    changeFilter: string
  }
  /** Kiểm tra `items.attrs` theo schema riêng của Bộ. */
  parseAttrs: (raw: unknown) => AttrsResult<A>
  seed: readonly SeedItem<A>[]
}
