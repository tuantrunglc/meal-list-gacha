import { foodSet } from './food/definition'
import type { SetDefinition } from './types'

// Thêm Bộ mới: tạo sets/<setKey>/ và thêm vào đây.
const sets: readonly SetDefinition[] = [foodSet]

const byKey = new Map(sets.map((s) => [s.setKey, s]))

export const DEFAULT_SET_KEY = 'food'

export function getSet(setKey: string): SetDefinition {
  const set = byKey.get(setKey)
  if (!set) throw new Error(`Không có Bộ "${setKey}"`)
  return set
}

export function listSets(): readonly SetDefinition[] {
  return sets
}
