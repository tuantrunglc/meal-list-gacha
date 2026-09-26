// @vitest-environment node
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join, relative, resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

/**
 * Test kiến trúc (Story 4.4): mọi animation phải có nhánh Giảm chuyển động,
 * và JS chỉ đọc chế độ này qua `ui/useReducedMotion`.
 * Đọc file bằng fs (trong vitest, CSS import kèm ?raw là chuỗi rỗng → test sẽ pass giả).
 */
const src = resolve(import.meta.dirname, '..', 'src')

function walk(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name)
    return statSync(path).isDirectory() ? walk(path) : [path]
  })
}

// Khoá theo đường dẫn tương đối từ src/, vd. 'ui/useReducedMotion.ts'
function read(filter: (path: string) => boolean): Record<string, string> {
  return Object.fromEntries(
    walk(src)
      .map((p) => relative(src, p).split('\\').join('/'))
      .filter(filter)
      .map((p) => [p, readFileSync(join(src, p), 'utf8')]),
  )
}

const css = read((p) => p.endsWith('.css'))
const code = read((p) => /\.(ts|tsx)$/.test(p) && !/\.test\.tsx?$/.test(p) && !p.startsWith('test/'))

// `transition: none` / `animation: none` không phải chuyển động; tính cả thuộc tính con (…-duration, …-name)
const MOVES = /(?:^|[;{\s])(?:animation|transition)(?:-[a-z-]+)?\s*:\s*(?!none\b|0s\b)[^;]+;/m
const REDUCE_BLOCK = /@media\s*\(prefers-reduced-motion:\s*reduce\)/

describe('giảm chuyển động (kiến trúc)', () => {
  it('đọc được mã nguồn (có nội dung thật)', () => {
    expect(Object.keys(css).length).toBeGreaterThan(5)
    expect(Object.keys(code).length).toBeGreaterThan(20)
    expect(css['ui/GachaPot.css']).toMatch(/@keyframes pot-breathe/)
    expect(code['ui/useReducedMotion.ts']).toMatch(/prefers-reduced-motion/)
  })

  it('mỗi file CSS có animation/transition đều có khối @media (prefers-reduced-motion: reduce)', () => {
    const missing = Object.entries(css)
      .filter(([, src]) => MOVES.test(src) && !REDUCE_BLOCK.test(src))
      .map(([path]) => path)
    expect(missing).toEqual([])
  })

  it('chỉ ui/useReducedMotion.ts đọc media query prefers-reduced-motion', () => {
    const readers = Object.entries(code)
      .filter(([, src]) => /prefers-reduced-motion/.test(src))
      .map(([path]) => path)
    expect(readers).toEqual(['ui/useReducedMotion.ts'])
  })

  const usesHook = (src: string) => /import \{[^}]*\buseReducedMotion\b[^}]*\} from ['"][./]+(?:ui\/)?useReducedMotion['"]/.test(src)

  it('component dùng motion/react hay Web Animations (.animate) thì đọc giảm chuyển động qua ui/useReducedMotion', () => {
    const offenders = Object.entries(code)
      .filter(([path]) => path !== 'ui/MotionProvider.tsx')
      .filter(([, src]) => /from ['"]motion\/react['"]/.test(src) || /\.animate\?*\.?\(/.test(src))
      .filter(([, src]) => !usesHook(src))
      .map(([path]) => path)
    expect(offenders).toEqual([])
  })

  it('không dùng useReducedMotion của motion/react (dùng hook chung)', () => {
    const offenders = Object.entries(code)
      .filter(([, src]) => /import \{[^}]*\buseReducedMotion\b[^}]*\} from ['"]motion\/react['"]/.test(src))
      .map(([path]) => path)
    expect(offenders).toEqual([])
  })

  it('chỉ dùng m.* (LazyMotion strict), không dùng motion.*', () => {
    const offenders = Object.entries(code)
      .filter(([, src]) => /<motion\.|import \{[^}]*\bmotion\b[^}]*\} from ['"]motion\/react['"]/.test(src))
      .map(([path]) => path)
    expect(offenders).toEqual([])
  })

  it('gốc app bọc MotionProvider (LazyMotion + MotionConfig reducedMotion="user")', () => {
    expect(code['ui/MotionProvider.tsx']).toMatch(/<MotionConfig reducedMotion="user">/)
    expect(code['app/App.tsx']).toMatch(/<MotionProvider>/)
  })
})
