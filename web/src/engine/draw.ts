import { calendarDayDiff } from './dates'
import {
  RARITIES,
  type DrawInput,
  type DrawResult,
  type EngineItem,
  type EngineSet,
  type Rarity,
  type SlotResult,
} from './types'

/** Món trong các mâm đã chốt còn nằm trong cửa sổ tránh trùng. */
export function cooldownItemIds(
  recentDraws: DrawInput['recentDraws'],
  cooldownDays: number,
  now: Date,
): Set<string> {
  const ids = new Set<string>()
  if (cooldownDays <= 0) return ids
  for (const draw of recentDraws) {
    const diff = calendarDayDiff(now, draw.chosenAt)
    if (diff < cooldownDays) {
      for (const entry of draw.entries) ids.add(entry.itemId)
    }
  }
  return ids
}

function matchesFacets(item: EngineItem, set: EngineSet, filters: DrawInput['filters']): boolean {
  for (const facet of set.facets) {
    const selected = filters[facet.key]
    if (selected === undefined) continue
    const ok =
      item.tags.includes(selected) ||
      (facet.universalValue !== undefined && item.tags.includes(facet.universalValue))
    if (!ok) return false
  }
  return true
}

function pickRarity(weights: EngineSet['rarityWeights'], rng: () => number): Rarity {
  const total = RARITIES.reduce((sum, r) => sum + Math.max(0, weights[r]), 0)
  let roll = rng() * total
  for (const r of RARITIES) {
    roll -= Math.max(0, weights[r])
    if (roll < 0) return r
  }
  return RARITIES[RARITIES.length - 1]
}

/** Bậc gần `target` nhất còn món; hoà thì lấy bậc thấp hơn. */
function nearestAvailableRarity(target: Rarity, available: ReadonlySet<Rarity>): Rarity | null {
  let best: Rarity | null = null
  for (const r of RARITIES) {
    if (!available.has(r)) continue
    if (best === null || Math.abs(r - target) < Math.abs(best - target)) best = r
  }
  return best
}

function pickOne<T>(list: readonly T[], rng: () => number): T {
  return list[Math.min(list.length - 1, Math.floor(rng() * list.length))]
}

/**
 * Quay các ô chưa giữ (`keep=false`). Ô giữ nguyên món và không qua bộ lọc,
 * nhưng món của chúng vẫn tính vào "không trùng trong mâm".
 */
export function drawSlots(input: DrawInput): DrawResult {
  const { set, items, recentDraws, cooldownDays, slots, filters, now, rng } = input
  const itemById = new Map(items.map((item) => [item.id, item]))
  const blocked = cooldownItemIds(recentDraws, cooldownDays, now)

  const inTray = new Set<string>()
  for (const slot of slots) {
    if (slot.keep && slot.itemId !== null) inTray.add(slot.itemId)
  }

  const results: SlotResult[] = slots.map((slot) => {
    if (slot.keep) {
      const item = slot.itemId === null ? undefined : itemById.get(slot.itemId)
      return {
        id: slot.id,
        groupKey: slot.groupKey,
        itemId: slot.itemId,
        rarity: item?.rarity ?? null,
        status: slot.itemId === null ? 'empty' : 'kept',
      }
    }

    const pool = items.filter(
      (item) =>
        item.groupKey === slot.groupKey &&
        matchesFacets(item, set, filters) &&
        !item.deleted &&
        !blocked.has(item.id) &&
        !inTray.has(item.id),
    )
    const available = new Set(pool.map((item) => item.rarity))
    const rarity = nearestAvailableRarity(pickRarity(set.rarityWeights, rng), available)
    if (rarity === null) {
      return { id: slot.id, groupKey: slot.groupKey, itemId: null, rarity: null, status: 'empty' }
    }
    const chosen = pickOne(
      pool.filter((item) => item.rarity === rarity),
      rng,
    )
    inTray.add(chosen.id)
    return { id: slot.id, groupKey: slot.groupKey, itemId: chosen.id, rarity, status: 'filled' }
  })

  return { slots: results, revealOrder: revealOrder(results) }
}

/** Thứ tự bật thẻ: giữ thứ tự ô, món bậc 3 dời xuống cuối. */
export function revealOrder(slots: readonly SlotResult[]): string[] {
  const top = slots.filter((s) => s.rarity === 3).map((s) => s.id)
  const rest = slots.filter((s) => s.rarity !== 3).map((s) => s.id)
  return [...rest, ...top]
}
