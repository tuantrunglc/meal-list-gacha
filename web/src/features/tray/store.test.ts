import { beforeEach, describe, expect, it } from 'vitest'
import { createSeededRng, drawSlots, type EngineItem, type EngineSet } from '../../engine'
import { MAX_SLOTS, useTrayStore, type DrawFn } from './store'

const set: EngineSet = { rarityWeights: { 1: 1, 2: 1, 3: 1 }, facets: [] }
const items: EngineItem[] = ['a1', 'a2', 'a3', 'a4', 'b1', 'b2', 'b3'].map((id) => ({
  id,
  groupKey: id[0],
  rarity: 1,
  tags: [],
  deleted: false,
}))

function drawWith(seed: number): DrawFn {
  const rng = createSeededRng(seed)
  return (slots) => drawSlots({ set, items, recentDraws: [], cooldownDays: 0, slots, filters: {}, now: new Date(), rng })
}

const st = () => useTrayStore.getState()

function open() {
  st().showResult(drawWith(1)([
    { id: 'x', groupKey: 'a', itemId: null, keep: false },
    { id: 'y', groupKey: 'b', itemId: null, keep: false },
  ]))
}

describe('useTrayStore', () => {
  beforeEach(() => useTrayStore.setState({ open: false, slots: [], commitId: null, revealing: false }))

  it('showResult sắp ô theo revealOrder và mở mâm', () => {
    st().showResult({
      slots: [
        { id: 'a', groupKey: 'g1', itemId: 'x', rarity: 3, status: 'filled' },
        { id: 'b', groupKey: 'g2', itemId: 'y', rarity: 1, status: 'filled' },
      ],
      revealOrder: ['b', 'a'],
    })
    expect(st().open).toBe(true)
    expect(st().slots.map((x) => x.id)).toEqual(['b', 'a'])
    expect(st().slots.every((x) => !x.locked && !x.removable)).toBe(true)
  })

  it('bật thẻ lần lượt chỉ khi mở từ nồi; xong/đóng/chốt thì hết', () => {
    const result = drawWith(1)([{ id: 'x', groupKey: 'a', itemId: null, keep: false }])
    st().showResult(result)
    expect(st().revealing).toBe(false)
    st().showResult(result, new Set(), true)
    expect(st().revealing).toBe(true)
    st().finishReveal()
    expect(st().revealing).toBe(false)
    st().showResult(result, new Set(), true)
    st().close()
    expect(st().revealing).toBe(false)
    st().showResult(result, new Set(), true)
    st().clear()
    expect(st().revealing).toBe(false)
    // mâm rỗng không có gì để bật
    st().showResult({ slots: [], revealOrder: [] }, new Set(), true)
    expect(st().revealing).toBe(false)
  })

  it('toggleLock bật/tắt; ô trống không giữ được', () => {
    open()
    st().toggleLock('x')
    expect(st().slots[0].locked).toBe(true)
    st().toggleLock('x')
    expect(st().slots[0].locked).toBe(false)
    useTrayStore.setState({ slots: [{ id: 'e', groupKey: 'a', itemId: null, rarity: null, status: 'empty', locked: false, removable: false }] })
    st().toggleLock('e')
    expect(st().slots[0].locked).toBe(false)
  })

  it('rerollOne: chỉ ô đó đổi, cùng nhóm, không trùng ô khác; ô giữ thì không đổi', () => {
    open()
    const before = st().slots
    for (let seed = 0; seed < 20; seed++) {
      st().rerollOne('x', drawWith(seed))
      const [x, y] = st().slots
      expect(y).toEqual(before[1])
      expect(x.groupKey).toBe('a')
      expect(x.itemId?.startsWith('a')).toBe(true)
    }
    st().toggleLock('x')
    const locked = st().slots[0]
    st().rerollOne('x', drawWith(99))
    expect(st().slots[0]).toEqual(locked)
  })

  it('rerollAll: ô giữ nguyên, ô khác quay lại, thứ tự giữ nguyên', () => {
    open()
    st().toggleLock('y')
    const y = st().slots[1]
    const seen = new Set<string | null>()
    for (let seed = 0; seed < 20; seed++) {
      st().rerollAll(drawWith(seed))
      expect(st().slots.map((s) => s.id)).toEqual(['x', 'y'])
      expect(st().slots[1]).toEqual(y)
      seen.add(st().slots[0].itemId)
    }
    expect(seen.size).toBeGreaterThan(1)
  })

  it('addSlot thêm ô cuối, đã quay, bỏ được, không trùng; removeSlot chỉ bỏ ô thêm', () => {
    open()
    st().addSlot('a', drawWith(3))
    const [x, , added] = st().slots
    expect(st().slots).toHaveLength(3)
    expect(added).toMatchObject({ groupKey: 'a', removable: true, status: 'filled' })
    expect(added.itemId).not.toBe(x.itemId)
    st().removeSlot('x')
    expect(st().slots).toHaveLength(3)
    st().removeSlot(added.id)
    expect(st().slots).toHaveLength(2)
  })

  it('close giữ nguyên các ô (kể cả ô giữ, ô thêm)', () => {
    open()
    st().toggleLock('x')
    st().addSlot('a', drawWith(2))
    const before = st().slots
    st().close()
    expect(st().open).toBe(false)
    expect(st().slots).toEqual(before)
  })

  it('không trùng món giữa 2 ô cùng nhóm khi đổi từng ô; 🎲 ra món khác', () => {
    open()
    st().addSlot('a', drawWith(5))
    for (let seed = 0; seed < 30; seed++) {
      const prev = st().slots[0].itemId
      st().rerollOne('x', drawWith(seed))
      const aIds = st().slots.filter((s) => s.groupKey === 'a').map((s) => s.itemId)
      expect(new Set(aIds).size).toBe(aIds.length)
      expect(st().slots[0].itemId).not.toBe(prev)
    }
  })

  it('Đổi cả mâm lấp lại ô trống khi nhóm có món trở lại', () => {
    open()
    // 3 ô thêm nhóm b: ô cuối trống vì b chỉ có 3 món và y đang dùng 1
    for (let i = 0; i < 3; i++) st().addSlot('b', drawWith(i))
    const empty = st().slots.at(-1)!
    expect(empty.status).toBe('empty')
    st().removeSlot(st().slots[2].id)
    st().rerollAll(drawWith(7))
    expect(st().slots.find((s) => s.id === empty.id)).toMatchObject({ status: 'filled' })
  })

  it('không thêm quá MAX_SLOTS ô', () => {
    open()
    for (let i = 0; i < 20; i++) st().addSlot('a', drawWith(i))
    expect(st().slots).toHaveLength(MAX_SLOTS)
  })

  it('addSlot khi nhóm hết món thì ô mới trống', () => {
    open()
    for (let i = 0; i < 3; i++) st().addSlot('b', drawWith(i))
    expect(st().slots.at(-1)).toMatchObject({ status: 'empty', itemId: null })
  })

  it('commitId: giữ nguyên khi thử lại, đổi khi mâm đổi; clear bỏ mâm', () => {
    open()
    const first = st().takeCommitId()
    expect(first).toMatch(/^[a-z0-9]{15}$/)
    expect(st().takeCommitId()).toBe(first)
    st().toggleLock('x')
    expect(st().takeCommitId()).toBe(first)
    const changes: [string, () => void][] = [
      ['rerollAll', () => st().rerollAll(drawWith(4))],
      ['rerollOne', () => st().rerollOne('y', drawWith(5))],
      ['addSlot', () => st().addSlot('a', drawWith(6))],
      ['removeSlot', () => st().removeSlot(st().slots.at(-1)!.id)],
      ['showResult', () => open()],
    ]
    let prev = first
    for (const [name, change] of changes) {
      change()
      const next = st().takeCommitId()
      expect(next, name).not.toBe(prev)
      prev = next
    }
    st().clear()
    expect(st()).toMatchObject({ open: false, slots: [], commitId: null })
  })
})
