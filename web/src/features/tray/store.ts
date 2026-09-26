import { create } from 'zustand'
import type { DrawResult, Rarity, SlotStatus } from '../../engine'

export type TraySlot = {
  id: string
  groupKey: string
  itemId: string | null
  rarity: Rarity | null
  status: SlotStatus
  locked: boolean
  /** Ô thêm bằng ＋ thì bỏ được; ô mặc định thì không. */
  removable: boolean
}

type TrayState = {
  open: boolean
  /** Theo thứ tự trên mâm (= thứ tự bật thẻ của engine). */
  slots: TraySlot[]
  showResult: (result: DrawResult, removableIds?: ReadonlySet<string>) => void
  close: () => void
}

/** Mâm đang mở chỉ nằm ở client (AD-7): không có gì ở đây được ghi lên server. */
export const useTrayStore = create<TrayState>((set) => ({
  open: false,
  slots: [],
  showResult: (result, removableIds = new Set()) => {
    const byId = new Map(result.slots.map((s) => [s.id, s]))
    const slots = result.revealOrder.flatMap((id) => {
      const s = byId.get(id)
      return s ? [{ ...s, locked: false, removable: removableIds.has(id) }] : []
    })
    set({ open: true, slots })
  },
  close: () => set({ open: false }),
}))
