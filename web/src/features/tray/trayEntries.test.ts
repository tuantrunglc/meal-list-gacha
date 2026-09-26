import { describe, expect, it } from 'vitest'
import type { Item } from '../../data/items'
import { trayEntries } from './MealTray'
import type { TraySlot } from './store'

const item = (id: string, name: string): Item => ({
  id,
  name,
  household: 'h',
  setKey: 's',
  groupKey: 'g',
  rarity: 1,
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
  it('bỏ ô trống và món không còn, đánh số order liên tục theo thứ tự mâm', () => {
    const items = new Map([
      ['a', item('a', 'A')],
      ['c', item('c', 'C')],
    ])
    const entries = trayEntries([slot('1', 'a'), slot('2', null, null), slot('3', 'gone'), slot('4', 'c', 2)], items)
    expect(entries).toEqual([
      { itemId: 'a', groupKey: 'g', name: 'A', rarity: 1, order: 0 },
      { itemId: 'c', groupKey: 'g', name: 'C', rarity: 2, order: 1 },
    ])
  })
})
