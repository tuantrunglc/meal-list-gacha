import type { AttrsResult } from '../types'

export type FoodAttrs = {
  ingredients: string[]
  steps: string[]
  note?: string
}

function isStringArray(v: unknown): v is string[] {
  return Array.isArray(v) && v.every((x) => typeof x === 'string')
}

export function parseFoodAttrs(raw: unknown): AttrsResult<FoodAttrs> {
  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) {
    return { ok: false, error: 'attrs phải là object' }
  }
  const { ingredients, steps, note } = raw as Record<string, unknown>
  if (!isStringArray(ingredients)) return { ok: false, error: 'ingredients phải là mảng chuỗi' }
  if (!isStringArray(steps)) return { ok: false, error: 'steps phải là mảng chuỗi' }
  if (note !== undefined && typeof note !== 'string') return { ok: false, error: 'note phải là chuỗi' }
  const value: FoodAttrs = { ingredients, steps }
  if (note !== undefined && note !== '') value.note = note
  return { ok: true, value }
}
