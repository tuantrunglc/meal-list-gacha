import { describe, expect, it } from 'vitest'
import { calendarDayDiff } from './dates'
import { drawSlots } from './draw'
import { createSeededRng } from './rng'
import type { DrawInput, EngineItem, EngineSet, Rarity, Slot } from './types'

// Bộ giả, không phụ thuộc Bộ thật
const set: EngineSet = {
  rarityWeights: { 1: 60, 2: 30, 3: 10 },
  facets: [{ key: 'season', universalValue: 'all' }],
}

function item(id: string, groupKey: string, rarity: Rarity, tags: string[] = ['all'], deleted = false): EngineItem {
  return { id, groupKey, rarity, tags, deleted }
}

function slot(id: string, groupKey: string, itemId: string | null = null, keep = false): Slot {
  return { id, groupKey, itemId, keep }
}

const now = new Date('2026-09-26T10:00:00+07:00')

function input(partial: Partial<DrawInput>): DrawInput {
  return {
    set,
    items: [],
    recentDraws: [],
    cooldownDays: 3,
    slots: [],
    filters: {},
    now,
    rng: createSeededRng(42),
    ...partial,
  }
}

describe('drawSlots', () => {
  it('phân bố bậc lệch ≤ 2% so với trọng số sau 10.000 lần', () => {
    const items = [
      ...['a', 'b', 'c'].map((s) => item(`r1${s}`, 'g1', 1)),
      ...['a', 'b'].map((s) => item(`r2${s}`, 'g1', 2)),
      item('r3a', 'g1', 3),
    ]
    const rng = createSeededRng(2026)
    const counts = { 1: 0, 2: 0, 3: 0 }
    const runs = 10_000
    for (let i = 0; i < runs; i++) {
      const r = drawSlots(input({ items, slots: [slot('s1', 'g1')], rng }))
      counts[r.slots[0].rarity as Rarity]++
    }
    expect(Math.abs(counts[1] / runs - 0.6)).toBeLessThanOrEqual(0.02)
    expect(Math.abs(counts[2] / runs - 0.3)).toBeLessThanOrEqual(0.02)
    expect(Math.abs(counts[3] / runs - 0.1)).toBeLessThanOrEqual(0.02)
  })

  it('bậc trúng trống thì lấy bậc gần nhất, hoà thì bậc thấp', () => {
    const items = [item('low', 'g1', 1), item('high', 'g1', 3)]
    // rng 0.7 → bậc 2 (60 ≤ 70 < 90), bậc 2 trống → hoà giữa 1 và 3 → bậc 1
    const r = drawSlots(input({ items, slots: [slot('s1', 'g1')], rng: () => 0.7 }))
    expect(r.slots[0]).toMatchObject({ itemId: 'low', rarity: 1, status: 'filled' })
  })

  it('bậc trúng trống, chỉ còn bậc xa hơn thì lấy bậc đó', () => {
    const items = [item('high', 'g1', 3)]
    const r = drawSlots(input({ items, slots: [slot('s1', 'g1')], rng: () => 0 }))
    expect(r.slots[0]).toMatchObject({ itemId: 'high', rarity: 3 })
  })

  it('nhóm hết món thì riêng ô đó empty', () => {
    const items = [item('a', 'g1', 1), item('c', 'g3', 1)]
    const r = drawSlots(input({ items, slots: [slot('s1', 'g1'), slot('s2', 'g2'), slot('s3', 'g3')] }))
    expect(r.slots.map((s) => s.status)).toEqual(['filled', 'empty', 'filled'])
    expect(r.slots[1]).toMatchObject({ itemId: null, rarity: null })
  })

  it('tránh trùng theo ngày lịch: hôm qua bị loại, 3 ngày trước ra được', () => {
    const items = [item('x', 'g1', 1), item('y', 'g1', 1)]
    const yesterday = [{ chosenAt: '2026-09-25T05:00:00Z', entries: [{ itemId: 'x' }] }]
    for (let seed = 0; seed < 20; seed++) {
      const r = drawSlots(input({ items, recentDraws: yesterday, slots: [slot('s1', 'g1')], rng: createSeededRng(seed) }))
      expect(r.slots[0].itemId).toBe('y')
    }
    const threeDaysAgo = [{ chosenAt: '2026-09-23T05:00:00Z', entries: [{ itemId: 'x' }] }]
    const onlyX = [item('x', 'g1', 1)]
    const r = drawSlots(input({ items: onlyX, recentDraws: threeDaysAgo, slots: [slot('s1', 'g1')] }))
    expect(r.slots[0].itemId).toBe('x')
  })

  it('cooldown 0 thì không tránh trùng', () => {
    const items = [item('x', 'g1', 1)]
    const today = [{ chosenAt: now.toISOString(), entries: [{ itemId: 'x' }] }]
    const r = drawSlots(input({ items, recentDraws: today, cooldownDays: 0, slots: [slot('s1', 'g1')] }))
    expect(r.slots[0].itemId).toBe('x')
  })

  it('ô giữ không qua bộ lọc (sai mùa, đang tránh trùng) vẫn giữ món', () => {
    const items = [item('x', 'g1', 1, ['y-only']), item('z', 'g1', 1)]
    const recent = [{ chosenAt: now.toISOString(), entries: [{ itemId: 'x' }] }]
    const r = drawSlots(
      input({
        items,
        recentDraws: recent,
        cooldownDays: 3,
        filters: { season: 'x-season' },
        slots: [slot('s1', 'g1', 'x', true), slot('s2', 'g1')],
      }),
    )
    expect(r.slots[0]).toMatchObject({ itemId: 'x', status: 'kept', rarity: 1 })
    expect(r.slots[1].itemId).toBe('z')
  })

  it('món của ô giữ không ra ở ô khác dù hợp lệ mọi bộ lọc', () => {
    const items = [item('x', 'g1', 1)]
    const r = drawSlots(input({ items, cooldownDays: 0, slots: [slot('s1', 'g1', 'x', true), slot('s2', 'g1')] }))
    expect(r.slots[0].status).toBe('kept')
    expect(r.slots[1]).toMatchObject({ status: 'empty', itemId: null })
  })

  it('ô giữ chưa có món thì empty, không quay', () => {
    const items = [item('x', 'g1', 1)]
    const r = drawSlots(input({ items, slots: [slot('s1', 'g1', null, true)] }))
    expect(r.slots[0]).toMatchObject({ status: 'empty', itemId: null })
  })

  it('facet không có trong filters thì không lọc', () => {
    const items = [item('au-item', 'g1', 1, ['au'])]
    const r = drawSlots(input({ items, filters: {}, slots: [slot('s1', 'g1')] }))
    expect(r.slots[0].itemId).toBe('au-item')
  })

  it('tránh trùng: ngày cuối cửa sổ (2 ngày trước, cooldown 3) vẫn bị loại', () => {
    const items = [item('x', 'g1', 1)]
    const recent = [{ chosenAt: '2026-09-24T05:00:00Z', entries: [{ itemId: 'x' }] }]
    const r = drawSlots(input({ items, recentDraws: recent, slots: [slot('s1', 'g1')] }))
    expect(r.slots[0].status).toBe('empty')
  })

  it('không trùng trong mâm: 2 ô cùng nhóm, còn 1 món', () => {
    const items = [item('only', 'g1', 1)]
    const r = drawSlots(input({ items, slots: [slot('s1', 'g1'), slot('s2', 'g1')] }))
    expect(r.slots[0].itemId).toBe('only')
    expect(r.slots[1].status).toBe('empty')
  })

  it('lọc facet: chỉ món có giá trị chọn hoặc giá trị chung', () => {
    const items = [item('autumn', 'g1', 1, ['au']), item('always', 'g1', 1, ['all']), item('spring', 'g1', 1, ['sp'])]
    const seen = new Set<string | null>()
    for (let seed = 0; seed < 50; seed++) {
      const r = drawSlots(input({ items, filters: { season: 'au' }, slots: [slot('s1', 'g1')], rng: createSeededRng(seed) }))
      seen.add(r.slots[0].itemId)
    }
    expect([...seen].sort()).toEqual(['always', 'autumn'])
  })

  it('món xoá mềm không bao giờ ra', () => {
    const items = [item('gone', 'g1', 1, ['all'], true)]
    const r = drawSlots(input({ items, slots: [slot('s1', 'g1')] }))
    expect(r.slots[0].status).toBe('empty')
  })

  it('thứ tự bật: theo ô, món bậc 3 xuống cuối', () => {
    const items = [item('m', 'g1', 3), item('r', 'g2', 1), item('c', 'g3', 2)]
    const r = drawSlots(input({ items, slots: [slot('man', 'g1'), slot('rau', 'g2'), slot('canh', 'g3')] }))
    expect(r.revealOrder).toEqual(['rau', 'canh', 'man'])
  })

  it('cùng seed thì cùng kết quả', () => {
    const items = ['a', 'b', 'c', 'd'].map((s) => item(s, 'g1', 1))
    const run = () => drawSlots(input({ items, slots: [slot('s1', 'g1')], rng: createSeededRng(7) })).slots[0].itemId
    expect(run()).toBe(run())
  })
})

describe('calendarDayDiff', () => {
  it('đếm theo ngày lịch giờ máy, không theo 24 giờ', () => {
    // 23:30 hôm qua giờ VN tới 00:30 hôm nay: 1 ngày lịch
    expect(calendarDayDiff(new Date('2026-09-26T00:30:00+07:00'), '2026-09-25T16:30:00Z')).toBe(1)
    expect(calendarDayDiff(new Date('2026-09-26T23:59:00+07:00'), '2026-09-26T00:01:00+07:00')).toBe(0)
  })
})
