import type { ComponentType, ReactNode } from 'react'
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
export type AttrsEditorProps<A> = {
  value: A
  // kiểu method: xem ghi chú ở AttrsEditor
  onChange(value: A): void
  disabled?: boolean
}

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
  /** Hiển thị phần riêng của Bộ trong Chi tiết món (ví dụ công thức). */
  DetailView: ComponentType<{ attrs: unknown }>
  /**
   * Trình soạn phần riêng của Bộ trong form Thêm/Sửa món.
   * Khai báo kiểu method để registry chứa được mọi `SetDefinition<A>`; form luôn truyền
   * giá trị đã qua `parseAttrs`/`emptyAttrs` của chính Bộ đó.
   */
  AttrsEditor(props: AttrsEditorProps<A>): ReactNode
  /** Giá trị `attrs` cho món mới. */
  emptyAttrs: () => A
  /** Kiểm tra `items.attrs` theo schema riêng của Bộ. */
  parseAttrs: (raw: unknown) => AttrsResult<A>
  seed: readonly SeedItem<A>[]
}
