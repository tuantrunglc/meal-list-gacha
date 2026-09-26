import { describe, expect, it } from 'vitest'
import type { Item } from '../../data/items'
import { trayEntries } from './MealTray'
import type { TraySlot } from './store'

const item = (id: string, name: string, rarity: 1 | 2 | 3 = 1): Item => ({
  id,
  name,
  household: 'h',
  setKey: 's',
  groupKey: 'g',
  rarity,
  tags: [],
  attrs: {},
  seedKey: '',
  deleted: false,
  imageFile: '',
  collectionId: 'c',
  updated: '',
})
const slot = (id: string, itemId: string | null, rarity: 1 | 2 | 3 | null = 1): TraySlot => ({
  id,
  groupKey: 'g',
  itemId,
  rarity,
  status: itemId ? 'filled' : 'empty',
  locked: false,
  removable: false,
})

describe('trayEntries', () => {
  it('bỏ ô trống và món không còn, đánh số order liên tục; độ hiếm lấy từ món hiện tại', () => {
    const items = new Map([
      ['a', item('a', 'A')],
      ['c', item('c', 'C', 2)],
    ])
    // ô c còn độ hiếm cũ (1) từ lúc quay; món đã được sửa thành 2
    const entries = trayEntries([slot('1', 'a'), slot('2', null, null), slot('3', 'gone'), slot('4', 'c', 1)], items)
    expect(entries).toEqual([
      { itemId: 'a', groupKey: 'g', name: 'A', rarity: 1, order: 0 },
      { itemId: 'c', groupKey: 'g', name: 'C', rarity: 2, order: 1 },
    ])
  })
})
