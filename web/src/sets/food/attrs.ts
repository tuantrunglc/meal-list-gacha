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
  // Bỏ khoảng trắng thừa và dòng trống (form cho thêm dòng trống)
  const clean = (xs: string[]) => xs.map((x) => x.trim()).filter(Boolean)
  const value: FoodAttrs = { ingredients: clean(ingredients), steps: clean(steps) }
  const trimmedNote = note?.trim()
  if (trimmedNote) value.note = trimmedNote
  return { ok: true, value }
}
