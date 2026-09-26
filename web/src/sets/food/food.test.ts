import { describe, expect, it } from 'vitest'
import { createSeededRng, drawSlots, type EngineItem } from '../../engine'
import { getSet } from '../registry'
import { parseFoodAttrs } from './attrs'
import { foodSet, seasonForMonth } from './definition'

describe('Bộ food', () => {
  it('đăng ký trong registry', () => {
    expect(getSet('food')).toBe(foodSet)
    expect(() => getSet('khong-co')).toThrow()
  })

  it('luật khớp spine', () => {
    expect(foodSet.groups.map((g) => g.key)).toEqual(['man', 'rau', 'canh'])
    expect(foodSet.slotTemplate.every((s) => !s.removable)).toBe(true)
    expect(foodSet.rarityWeights).toEqual({ 1: 60, 2: 30, 3: 10 })
    expect(foodSet.defaultCooldownDays).toBe(3)
    expect(foodSet.facets[0].values.map((v) => v.key)).toEqual(['xuan', 'ha', 'thu', 'dong', 'quanh-nam'])
  })

  it('mùa mặc định theo tháng', () => {
    const expected = ['dong', 'xuan', 'xuan', 'xuan', 'ha', 'ha', 'ha', 'thu', 'thu', 'thu', 'dong', 'dong']
    expected.forEach((season, i) => {
      expect(seasonForMonth(new Date(2026, i, 15))).toBe(season)
    })
  })

  describe('seed', () => {
    const seed = foodSet.seed
    const groups = foodSet.groups.map((g) => g.key)
    const seasons = foodSet.facets[0].values.map((v) => v.key)

    it('≥ 30 món, seedKey kebab ASCII duy nhất', () => {
      expect(seed.length).toBeGreaterThanOrEqual(30)
      const keys = seed.map((d) => d.seedKey)
      expect(new Set(keys).size).toBe(keys.length)
      for (const k of keys) expect(k).toMatch(/^[a-z0-9]+(-[a-z0-9]+)*$/)
    })

    it('đủ 3 nhóm × 3 bậc', () => {
      for (const g of groups) {
        for (const r of [1, 2, 3]) {
          expect(seed.some((d) => d.groupKey === g && d.rarity === r), `${g} bậc ${r}`).toBe(true)
        }
      }
    })

    it('mỗi mùa có món ở cả 3 nhóm', () => {
      for (const s of seasons) {
        for (const g of groups) {
          expect(seed.some((d) => d.groupKey === g && d.tags.includes(s)), `${s}/${g}`).toBe(true)
        }
      }
    })

    it('mọi món thuộc nhóm hợp lệ, tag hợp lệ, attrs hợp lệ và có công thức', () => {
      for (const d of seed) {
        expect(groups).toContain(d.groupKey)
        for (const t of d.tags) expect(seasons).toContain(t)
        expect(foodSet.parseAttrs(d.attrs).ok, d.seedKey).toBe(true)
        expect(d.attrs.ingredients.length, d.seedKey).toBeGreaterThan(0)
        expect(d.attrs.steps.length, d.seedKey).toBeGreaterThan(0)
      }
    })
  })

  describe('parseFoodAttrs', () => {
    it('chấp nhận đúng schema, bỏ note rỗng', () => {
      expect(parseFoodAttrs({ ingredients: ['a'], steps: ['b'], note: 'c' })).toEqual({
        ok: true,
        value: { ingredients: ['a'], steps: ['b'], note: 'c' },
      })
      expect(parseFoodAttrs({ ingredients: [], steps: [], note: '' })).toEqual({ ok: true, value: { ingredients: [], steps: [] } })
    })

    it('từ chối sai schema', () => {
      for (const bad of [null, [], 'x', { ingredients: 'a', steps: [] }, { ingredients: [], steps: [1] }, { ingredients: [], steps: [], note: 2 }]) {
        expect(parseFoodAttrs(bad).ok).toBe(false)
      }
    })
  })
})

describe('Bộ food chạy qua engine', () => {
  const items: EngineItem[] = foodSet.seed.map((d) => ({ id: d.seedKey, groupKey: d.groupKey, rarity: d.rarity, tags: d.tags, deleted: false }))
  const slots = foodSet.slotTemplate.map((s, i) => ({ id: `s${i}`, groupKey: s.groupKey, itemId: null, keep: false }))

  it('mùa nào cũng dọn đủ 3 ô, không trùng, đúng mùa', () => {
    for (const season of foodSet.facets[0].values) {
      const r = drawSlots({
        set: foodSet,
        items,
        recentDraws: [],
        cooldownDays: foodSet.defaultCooldownDays,
        slots,
        filters: { season: season.key },
        now: new Date(2026, 8, 26),
        rng: createSeededRng(1),
      })
      expect(r.slots.every((s) => s.status === 'filled'), season.key).toBe(true)
      const ids = r.slots.map((s) => s.itemId)
      expect(new Set(ids).size).toBe(3)
      for (const id of ids) {
        const tags = items.find((i) => i.id === id)!.tags
        expect(tags.includes(season.key) || tags.includes('quanh-nam')).toBe(true)
      }
    }
  })
})
