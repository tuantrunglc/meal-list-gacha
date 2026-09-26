import { create } from 'zustand'
import { newId } from '../../data/ids'
import type { DrawResult, Rarity, Slot, SlotStatus } from '../../engine'

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

/** Quay theo luật của Bộ với bộ lọc hiện tại (màn Quay dựng hàm này). */
export type DrawFn = (slots: Slot[]) => DrawResult

type TrayState = {
  open: boolean
  /** Theo thứ tự trên mâm (lúc mở = thứ tự bật thẻ của engine). */
  slots: TraySlot[]
  /** Đang bật thẻ lần lượt sau khi mở nồi (chỉ lần mở từ nồi; mở lại mâm cũ thì không). */
  revealing: boolean
  showResult: (result: DrawResult, removableIds?: ReadonlySet<string>, reveal?: boolean) => void
  /** Bật xong hoặc người dùng bỏ qua: hiện đủ mâm. */
  finishReveal: () => void
  close: () => void
  toggleLock: (id: string) => void
  rerollOne: (id: string, draw: DrawFn) => void
  rerollAll: (draw: DrawFn) => void
  addSlot: (groupKey: string, draw: DrawFn) => void
  removeSlot: (id: string) => void
  /**
   * ID cho lần chốt mâm này: sinh một lần, giữ nguyên khi thử lại (AD-4),
   * đổi khi món trên mâm đổi (lần chốt đó là một mâm khác).
   */
  commitId: string | null
  takeCommitId: () => string
  /** ID của lần chốt gần nhất bị lỗi (có thể đã tới server mà mất phản hồi). */
  failedCommitId: string | null
  markCommitFailed: (id: string) => void
  /** Chốt xong: đóng và bỏ mâm. */
  clear: () => void
}

let extraCounter = 0

/** Giới hạn số ô trên mâm để mâm không dài vô hạn. */
export const MAX_SLOTS = 8

/** Quay lại các ô trong `targets` (ô giữ không bao giờ bị quay), giữ nguyên thứ tự trên mâm. */
function reroll(slots: TraySlot[], targets: ReadonlySet<string>, draw: DrawFn): TraySlot[] {
  const input: Slot[] = slots.map((s) => ({
    id: s.id,
    groupKey: s.groupKey,
    itemId: s.itemId,
    keep: s.locked || !targets.has(s.id),
    // Quay lại thì cố ra món khác món đang có
    avoidItemId: targets.has(s.id) ? s.itemId : null,
  }))
  const byId = new Map(draw(input).slots.map((r) => [r.id, r]))
  return slots.map((s) => {
    if (s.locked || !targets.has(s.id)) return s
    const r = byId.get(s.id)
    return r ? { ...s, itemId: r.itemId, rarity: r.rarity, status: r.status } : s
  })
}

/** Mâm đang mở chỉ nằm ở client (AD-7): không có gì ở đây được ghi lên server. */
export const useTrayStore = create<TrayState>((set, get) => ({
  open: false,
  slots: [],
  revealing: false,
  finishReveal: () => set({ revealing: false }),
  commitId: null,
  failedCommitId: null,
  markCommitFailed: (id) => set({ failedCommitId: id }),
  takeCommitId: () => {
    const existing = get().commitId
    if (existing) return existing
    const id = newId()
    set({ commitId: id })
    return id
  },
  clear: () => set({ open: false, slots: [], revealing: false, commitId: null, failedCommitId: null }),
  showResult: (result, removableIds = new Set(), reveal = false) => {
    const byId = new Map(result.slots.map((s) => [s.id, s]))
    const slots = result.revealOrder.flatMap((id) => {
      const s = byId.get(id)
      return s ? [{ ...s, locked: false, removable: removableIds.has(id) }] : []
    })
    set({ open: true, slots, revealing: reveal && slots.length > 0, commitId: null, failedCommitId: null })
  },
  close: () => set({ open: false, revealing: false }),
  toggleLock: (id) =>
    set({
      // Ô trống không có gì để giữ
      slots: get().slots.map((s) => (s.id === id && s.itemId !== null ? { ...s, locked: !s.locked } : s)),
    }),
  rerollOne: (id, draw) => {
    const target = get().slots.find((s) => s.id === id)
    if (!target || target.locked) return
    set({ slots: reroll(get().slots, new Set([id]), draw), commitId: null })
  },
  rerollAll: (draw) => {
    const targets = new Set(get().slots.filter((s) => !s.locked).map((s) => s.id))
    set({ slots: reroll(get().slots, targets, draw), commitId: null })
  },
  addSlot: (groupKey, draw) => {
    if (get().slots.length >= MAX_SLOTS) return
    const id = `extra-${++extraCounter}`
    const added: TraySlot = { id, groupKey, itemId: null, rarity: null, status: 'empty', locked: false, removable: true }
    set({ slots: reroll([...get().slots, added], new Set([id]), draw), commitId: null })
  },
  removeSlot: (id) => set({ slots: get().slots.filter((s) => !(s.id === id && s.removable)), commitId: null }),
}))
