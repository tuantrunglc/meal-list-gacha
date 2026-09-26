import type { SetDefinition } from '../types'
import { parseFoodAttrs, type FoodAttrs } from './attrs'
import { foodCopy } from './copy'
import { FoodDetail } from './FoodDetail'
import { foodSeed } from './seed'

/** Mùa mặc định theo tháng (giờ máy): Xuân 2–4, Hạ 5–7, Thu 8–10, Đông 11–1. */
export function seasonForMonth(now: Date): string {
  const month = now.getMonth() + 1
  if (month >= 2 && month <= 4) return 'xuan'
  if (month >= 5 && month <= 7) return 'ha'
  if (month >= 8 && month <= 10) return 'thu'
  return 'dong'
}

export const foodSet: SetDefinition<FoodAttrs> = {
  setKey: 'food',
  label: foodCopy.setLabel,
  groups: [
    { key: 'man', label: foodCopy.groups.man, color: 'var(--color-group-man)' },
    { key: 'rau', label: foodCopy.groups.rau, color: 'var(--color-group-rau)' },
    { key: 'canh', label: foodCopy.groups.canh, color: 'var(--color-group-canh)' },
  ],
  slotTemplate: [
    { groupKey: 'man', removable: false },
    { groupKey: 'rau', removable: false },
    { groupKey: 'canh', removable: false },
  ],
  rarityWeights: { 1: 60, 2: 30, 3: 10 },
  defaultCooldownDays: 3,
  facets: [
    {
      key: 'season',
      label: foodCopy.seasonFacet,
      universalValue: 'quanh-nam',
      values: [
        { key: 'xuan', label: foodCopy.seasons.xuan, color: 'var(--color-season-spring)' },
        { key: 'ha', label: foodCopy.seasons.ha, color: 'var(--color-season-summer)' },
        { key: 'thu', label: foodCopy.seasons.thu, color: 'var(--color-season-autumn)' },
        { key: 'dong', label: foodCopy.seasons.dong, color: 'var(--color-season-winter)' },
        { key: 'quanh-nam', label: foodCopy.seasons['quanh-nam'], color: 'var(--color-season-allyear)' },
      ],
      defaultValue: seasonForMonth,
    },
  ],
  messages: { emptySlot: foodCopy.emptySlot, changeFilter: foodCopy.changeFilter },
  DetailView: FoodDetail,
  parseAttrs: parseFoodAttrs,
  seed: foodSeed,
}
