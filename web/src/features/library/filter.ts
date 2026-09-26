import type { Item } from '../../data/items'

/** Chuẩn hoá để tìm: thường hoá, bỏ dấu tiếng Việt (kể cả đ → d), gộp khoảng trắng. */
export function normalizeName(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .replace(/đ/g, 'd')
    .replace(/\s+/g, ' ')
    .trim()
}

export type LibraryFilter = {
  /** null = tất cả nhóm */
  groupKey: string | null
  /** facetKey → giá trị (null = tất cả). Thư viện lọc đúng giá trị tag. */
  facets: Readonly<Record<string, string | null>>
  query: string
}

export function filterItems(items: readonly Item[], f: LibraryFilter): Item[] {
  const q = normalizeName(f.query)
  return items.filter((item) => {
    if (f.groupKey !== null && item.groupKey !== f.groupKey) return false
    for (const value of Object.values(f.facets)) {
      if (value !== null && !item.tags.includes(value)) return false
    }
    return q === '' || normalizeName(item.name).includes(q)
  })
}
