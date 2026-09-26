import { beforeEach, describe, expect, it } from 'vitest'
import { useTrayStore } from './store'

describe('useTrayStore', () => {
  beforeEach(() => useTrayStore.setState({ open: false, slots: [] }))

  it('showResult sắp ô theo revealOrder và mở mâm', () => {
    useTrayStore.getState().showResult({
      slots: [
        { id: 'a', groupKey: 'g1', itemId: 'x', rarity: 3, status: 'filled' },
        { id: 'b', groupKey: 'g2', itemId: 'y', rarity: 1, status: 'filled' },
      ],
      revealOrder: ['b', 'a'],
    })
    const s = useTrayStore.getState()
    expect(s.open).toBe(true)
    expect(s.slots.map((x) => x.id)).toEqual(['b', 'a'])
    expect(s.slots.every((x) => !x.locked && !x.removable)).toBe(true)
  })

  it('close giữ nguyên các ô', () => {
    useTrayStore.getState().showResult({ slots: [{ id: 'a', groupKey: 'g', itemId: 'x', rarity: 1, status: 'filled' }], revealOrder: ['a'] })
    useTrayStore.getState().close()
    expect(useTrayStore.getState().open).toBe(false)
    expect(useTrayStore.getState().slots).toHaveLength(1)
  })
})
