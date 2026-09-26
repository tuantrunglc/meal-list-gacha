import { describe, expect, it } from 'vitest'

/**
 * Test kiến trúc (Story 4.4): mọi animation phải có nhánh Giảm chuyển động,
 * và JS chỉ đọc chế độ này qua `ui/useReducedMotion`.
 */
const css = import.meta.glob('../**/*.css', { query: '?raw', import: 'default', eager: true }) as Record<string, string>
const code = import.meta.glob(['../**/*.{ts,tsx}', '!../**/*.test.{ts,tsx}', '!../test/**'], {
  query: '?raw',
  import: 'default',
  eager: true,
}) as Record<string, string>

// `transition: none` / `animation: none` không phải chuyển động
const MOVES = /(?:^|[;{\s])(?:animation|transition)(?:-name)?\s*:\s*(?!none\b)[^;]+;/m
const REDUCE_BLOCK = /@media\s*\(prefers-reduced-motion:\s*reduce\)/

describe('giảm chuyển động (kiến trúc)', () => {
  it('đọc được mã nguồn', () => {
    expect(Object.keys(css).length).toBeGreaterThan(5)
    expect(Object.keys(code).length).toBeGreaterThan(20)
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
    expect(readers).toEqual(['../ui/useReducedMotion.ts'])
  })

  it('component dùng motion/react thì dùng useReducedMotion (hoặc là gốc app với MotionConfig)', () => {
    const offenders = Object.entries(code)
      .filter(([, src]) => /from 'motion\/react'/.test(src))
      .filter(([, src]) => !/useReducedMotion/.test(src) && !/MotionConfig reducedMotion="user"/.test(src))
      .map(([path]) => path)
    expect(offenders).toEqual([])
  })

  it('gốc app bọc MotionConfig reducedMotion="user"', () => {
    expect(code['../app/App.tsx']).toMatch(/<MotionConfig reducedMotion="user">/)
  })
})
