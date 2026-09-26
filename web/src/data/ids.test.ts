import { describe, expect, it } from 'vitest'
import { newId } from './ids'

describe('newId', () => {
  it('15 ký tự [a-z0-9], không trùng', () => {
    const ids = Array.from({ length: 2000 }, newId)
    for (const id of ids) expect(id).toMatch(/^[a-z0-9]{15}$/)
    expect(new Set(ids).size).toBe(ids.length)
  })
})
