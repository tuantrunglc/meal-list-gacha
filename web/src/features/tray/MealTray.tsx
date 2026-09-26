import { useEffect, useRef, useState, type KeyboardEvent } from 'react'
import { itemImageSources, type Item } from '../../data/items'
import type { SetDefinition } from '../../sets/types'
import { copy } from '../../ui/copy'
import { DishImage } from '../../ui/DishImage'
import { GroupTag } from '../../ui/GroupTag'
import { RarityBadge, rarityColor } from '../../ui/RarityBadge'
import { useTrayStore, type TraySlot } from './store'
import './MealTray.css'

type Props = {
  set: SetDefinition
  itemsById: ReadonlyMap<string, Item>
  /** Người dùng muốn đổi bộ lọc (ví dụ mùa) sau khi thấy ô trống. */
  onChangeFilter: () => void
}

type SlotView =
  | { kind: 'empty'; groupLabel: string }
  | { kind: 'missing'; groupLabel: string }
  | { kind: 'item'; groupLabel: string; item: Item; rarity: 1 | 2 | 3 }

/** Một nguồn duy nhất cho cả phần hiển thị lẫn câu đọc. */
function viewSlot(slot: TraySlot, set: SetDefinition, itemsById: ReadonlyMap<string, Item>): SlotView {
  const groupLabel = set.groups.find((g) => g.key === slot.groupKey)?.label ?? slot.groupKey
  if (slot.status === 'empty' || slot.itemId === null || slot.rarity === null) return { kind: 'empty', groupLabel }
  const item = itemsById.get(slot.itemId)
  // Món vừa bị xoá hoặc danh sách đang tải lại: không nói "hết món"
  if (!item) return { kind: 'missing', groupLabel }
  return { kind: 'item', groupLabel, item, rarity: slot.rarity }
}

/** Câu đọc cho trình đọc màn hình: "Mâm cơm: Mặn <tên>, <bậc>; Rau …". */
export function trayAnnouncement(slots: readonly TraySlot[], set: SetDefinition, itemsById: ReadonlyMap<string, Item>) {
  return copy.tray.announce(
    slots.map((s) => {
      const v = viewSlot(s, set, itemsById)
      if (v.kind !== 'item') return copy.tray.announceEmpty(v.groupLabel)
      return copy.tray.announcePart(v.groupLabel, v.item.name, copy.rarity[v.rarity].label)
    }),
  )
}

const FOCUSABLE = 'button:not([disabled]), [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'

export function MealTray({ set, itemsById, onChangeFilter }: Props) {
  const open = useTrayStore((s) => s.open)
  const slots = useTrayStore((s) => s.slots)
  const close = useTrayStore((s) => s.close)
  const dialogRef = useRef<HTMLDivElement>(null)
  const [announcement, setAnnouncement] = useState('')
  // Đóng vì "Đổi mùa" thì nơi nhận focus do màn gọi quyết định
  const skipRestore = useRef(false)

  useEffect(() => {
    if (!open) return
    const previous = document.activeElement as HTMLElement | null
    skipRestore.current = false
    dialogRef.current?.focus()
    // Vùng live đã có trong DOM trước khi đổi nội dung thì trình đọc mới đọc
    const t = window.setTimeout(() => setAnnouncement(trayAnnouncement(useTrayStore.getState().slots, set, itemsById)), 50)
    const onKey = (e: globalThis.KeyboardEvent) => {
      if (e.key === 'Escape') close()
    }
    document.addEventListener('keydown', onKey)
    return () => {
      window.clearTimeout(t)
      setAnnouncement('')
      document.removeEventListener('keydown', onKey)
      if (!skipRestore.current) previous?.focus?.()
    }
    // itemsById chỉ dùng cho câu đọc lúc mở mâm
  }, [open, close, set])

  // Giữ focus trong dialog (aria-modal)
  function trapTab(e: KeyboardEvent) {
    if (e.key !== 'Tab' || !dialogRef.current) return
    const nodes = [...dialogRef.current.querySelectorAll<HTMLElement>(FOCUSABLE)]
    if (nodes.length === 0) return
    const first = nodes[0]
    const last = nodes[nodes.length - 1]
    if (e.shiftKey && (document.activeElement === first || document.activeElement === dialogRef.current)) {
      e.preventDefault()
      last.focus()
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault()
      first.focus()
    }
  }

  if (!open) return null
  const group = (key: string) => set.groups.find((g) => g.key === key)

  return (
    <div className="tray-overlay">
      <div className="tray-overlay__dim" onClick={close} aria-hidden="true" />
      <div
        className="tray-dialog"
        role="dialog"
        aria-modal="true"
        aria-label={copy.tray.title}
        ref={dialogRef}
        tabIndex={-1}
        onKeyDown={trapTab}
      >
        <p className="tray-dialog__say">{copy.tray.say}</p>
        <ul className="meal-tray">
          {slots.map((slot) => {
            const g = group(slot.groupKey)
            const v = viewSlot(slot, set, itemsById)
            if (v.kind === 'empty') {
              return (
                <li key={slot.id} className="meal-slot meal-slot--empty">
                  <div className="meal-slot__info">
                    {g && <GroupTag label={g.label} color={g.color} />}
                    <p className="meal-slot__empty">{set.messages.emptySlot(v.groupLabel)}</p>
                  </div>
                  <button
                    type="button"
                    className="button-secondary"
                    onClick={() => {
                      skipRestore.current = true
                      close()
                      onChangeFilter()
                    }}
                  >
                    {set.messages.changeFilter}
                  </button>
                </li>
              )
            }
            if (v.kind === 'missing') {
              return (
                <li key={slot.id} className="meal-slot meal-slot--empty">
                  <div className="meal-slot__info">{g && <GroupTag label={g.label} color={g.color} />}</div>
                </li>
              )
            }
            return (
              <li key={slot.id} className="meal-slot" style={{ borderColor: rarityColor[v.rarity] }}>
                <DishImage className="meal-slot__thumb" sources={itemImageSources(v.item)} alt="" compact />
                <div className="meal-slot__info">
                  {g && <GroupTag label={g.label} color={g.color} />}
                  <p className="meal-slot__name">{v.item.name}</p>
                  <RarityBadge rarity={v.rarity} />
                </div>
              </li>
            )
          })}
        </ul>
        <div className="tray-dialog__actions">
          <button type="button" className="button-secondary" onClick={close}>
            {copy.tray.close}
          </button>
        </div>
        <p className="visually-hidden" aria-live="polite">
          {announcement}
        </p>
      </div>
    </div>
  )
}
