import { describe, expect, it } from 'vitest'
import { listSets } from '../sets/registry'

// AD-1: engine và features không được biết key cụ thể của Bộ nào.
// Key lấy từ registry nên Bộ mới tự được kiểm.
const forbidden = [
  ...new Set(listSets().flatMap((s) => [...s.groups.map((g) => g.key), ...s.facets.flatMap((f) => f.values.map((v) => v.key))])),
]

const sources = {
  engine: import.meta.glob<string>(['../engine/**/*.{ts,tsx}', '!../engine/**/*.test.{ts,tsx}'], {
    query: '?raw',
    import: 'default',
    eager: true,
  }),
  features: import.meta.glob<string>(['../features/**/*.{ts,tsx}', '!../features/**/*.test.{ts,tsx}'], {
    query: '?raw',
    import: 'default',
    eager: true,
  }),
}

const escaped = forbidden.map((k) => k.replace(/-/g, '\\-')).join('|')
const patterns = [
  new RegExp(`(['"\`])(${escaped})\\1`), // 'man'
  new RegExp(`\\.(${escaped})\\b(?!-)`), // x.man
  new RegExp(`(^|[{,\\s])(${escaped})\\s*:`, 'm'), // { man: ... }
]
const hasKey = (text: string) => patterns.some((p) => p.test(text))

describe('không viết cứng key của Bộ trong engine/ và features/', () => {
  it('danh sách key cấm lấy từ registry', () => {
    expect(forbidden).toContain('quanh-nam')
  })

  it('bộ dò bắt được các kiểu viết cứng', () => {
    for (const bad of ["x === 'man'", 'obj.canh', '{ xuan: 1 }', 'const a = "quanh-nam"']) {
      expect(hasKey(bad), bad).toBe(true)
    }
    expect(hasKey('const manager = changed.handle')).toBe(false)
  })

  for (const [layer, files] of Object.entries(sources)) {
    it(layer, () => {
      expect(layer === 'features' || Object.keys(files).length > 0).toBe(true)
      const offenders = Object.entries(files)
        .filter(([, text]) => hasKey(text))
        .map(([path]) => path)
      expect(offenders).toEqual([])
    })
  }
})
