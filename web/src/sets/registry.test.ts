import { describe, expect, it } from 'vitest'
import { DEFAULT_SET_KEY, getSet, listSets } from './registry'

// Chạy cho mọi Bộ đã đăng ký: thêm Bộ mới là tự được kiểm.
describe('mọi Bộ trong registry hợp lệ', () => {
  it('setKey duy nhất, kebab ASCII; Bộ mặc định tồn tại', () => {
    const keys = listSets().map((s) => s.setKey)
    expect(new Set(keys).size).toBe(keys.length)
    for (const k of keys) expect(k).toMatch(/^[a-z0-9]+(-[a-z0-9]+)*$/)
    expect(getSet(DEFAULT_SET_KEY).setKey).toBe(DEFAULT_SET_KEY)
  })

  for (const set of listSets()) {
    describe(set.setKey, () => {
      const groupKeys = set.groups.map((g) => g.key)

      it('trọng số độ hiếm dương', () => {
        for (const r of [1, 2, 3] as const) expect(set.rarityWeights[r]).toBeGreaterThan(0)
      })

      it('slotTemplate chỉ dùng nhóm có thật', () => {
        expect(set.slotTemplate.length).toBeGreaterThan(0)
        for (const s of set.slotTemplate) expect(groupKeys).toContain(s.groupKey)
      })

      it('facet: universalValue và giá trị mặc định mọi tháng nằm trong values', () => {
        for (const f of set.facets) {
          const values = f.values.map((v) => v.key)
          if (f.universalValue !== undefined) expect(values).toContain(f.universalValue)
          for (let m = 0; m < 12; m++) expect(values).toContain(f.defaultValue(new Date(2026, m, 15)))
        }
      })

      it('seed: seedKey duy nhất, nhóm/tag hợp lệ, có tên, attrs đúng schema', () => {
        const seedKeys = set.seed.map((d) => d.seedKey)
        expect(new Set(seedKeys).size).toBe(seedKeys.length)
        const allValues = set.facets.flatMap((f) => f.values.map((v) => v.key))
        for (const d of set.seed) {
          expect(d.seedKey).toMatch(/^[a-z0-9]+(-[a-z0-9]+)*$/)
          expect(d.name.trim()).not.toBe('')
          expect(groupKeys).toContain(d.groupKey)
          for (const t of d.tags) expect(allValues).toContain(t)
          expect(set.parseAttrs(d.attrs).ok, d.seedKey).toBe(true)
        }
      })
    })
  }
})
