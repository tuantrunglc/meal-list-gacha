import { describe, expect, it } from 'vitest'
import type { Item } from '../../data/items'
import { filterItems, normalizeName } from './filter'

const item = (name: string, groupKey: string, tags: string[]): Item => ({
  id: name,
  name,
  groupKey,
  tags,
  household: 'h',
  setKey: 's',
  rarity: 1,
  attrs: {},
  seedKey: '',
  deleted: false,
  imageFile: '',
  collectionId: 'c',
  updated: '',
})

const items = [
  item('Cá kho tộ', 'g1', ['all']),
  item('Đậu phụ sốt cà chua', 'g1', ['all']),
  item('Canh chua cá', 'g3', ['au']),
  item('Canh cải cúc', 'g3', ['sp']),
]
const none = { groupKey: null, facets: {}, query: '' }

describe('normalizeName', () => {
  it('bỏ dấu, thường hoá, đ → d, gộp khoảng trắng', () => {
    expect(normalizeName('  CÁ   Kho Tộ ')).toBe('ca kho to')
    expect(normalizeName('Đậu phụ')).toBe('dau phu')
  })
})

describe('filterItems', () => {
  const names = (f: Parameters<typeof filterItems>[1]) => filterItems(items, f).map((i) => i.name)

  it('không lọc gì thì giữ nguyên thứ tự', () => {
    expect(names(none)).toEqual(items.map((i) => i.name))
  })
  it('lọc nhóm', () => {
    expect(names({ ...none, groupKey: 'g3' })).toEqual(['Canh chua cá', 'Canh cải cúc'])
  })
  it('lọc nhóm + facet theo đúng giá trị tag', () => {
    expect(names({ ...none, groupKey: 'g3', facets: { season: 'au' } })).toEqual(['Canh chua cá'])
    expect(names({ ...none, facets: { season: 'all' } })).toEqual(['Cá kho tộ', 'Đậu phụ sốt cà chua'])
    expect(names({ ...none, facets: { season: null } })).toHaveLength(4)
  })
  it('tìm không phân biệt dấu/hoa, đ/d, chuỗi con', () => {
    expect(names({ ...none, query: 'ca kho' })).toEqual(['Cá kho tộ'])
    expect(names({ ...none, query: 'CÁ KHO' })).toEqual(['Cá kho tộ'])
    expect(names({ ...none, query: 'dau phu' })).toEqual(['Đậu phụ sốt cà chua'])
    expect(names({ ...none, query: 'chua' })).toEqual(['Đậu phụ sốt cà chua', 'Canh chua cá'])
    expect(names({ ...none, query: 'pizza' })).toEqual([])
  })
})
