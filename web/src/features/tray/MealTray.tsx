import { motion } from 'motion/react'
import { useEffect, useRef, useState, type KeyboardEvent } from 'react'
import { useCommitTray, type DrawEntry } from '../../data/draws'
import { useItemImages } from '../../data/files'
import type { Item } from '../../data/items'
import type { SetDefinition } from '../../sets/types'
import { copy } from '../../ui/copy'
import { DishImage } from '../../ui/DishImage'
import { ItemDetail } from '../item-detail/ItemDetail'
import { GroupTag } from '../../ui/GroupTag'
import { RarityBadge, rarityColor } from '../../ui/RarityBadge'
import { BURST_MS, RarityBurst } from '../../ui/RarityBurst'
import { useReducedMotion } from '../../ui/useReducedMotion'
import { MAX_SLOTS, useTrayStore, type DrawFn, type TraySlot } from './store'
import './MealTray.css'

type Props = {
  set: SetDefinition
  itemsById: ReadonlyMap<string, Item>
  /** Quay theo luật của Bộ với bộ lọc hiện tại. */
  draw: DrawFn
  /** Người dùng muốn đổi bộ lọc (ví dụ mùa) sau khi thấy ô trống. */
  onChangeFilter: () => void
  /** Câu đọc cho trình đọc màn hình khi mâm hiện (xem `trayAnnouncement`). */
  announcement: string
  /** Chốt mâm thành công (mâm đã đóng và bỏ). */
  onCommitted: () => void
  /** Ô hết món: thêm món mới cho nhóm này (mâm đóng trước). */
  onAddItem?: (groupKey: string) => void
  /** Sửa món từ chi tiết trên mâm (mâm đóng trước, mở lại sau). */
  onEditItem?: (itemId: string) => void
}

/** Snapshot các ô có món theo thứ tự trên mâm, dữ liệu món tại lúc chốt (AD-4). */
export function trayEntries(slots: readonly TraySlot[], itemsById: ReadonlyMap<string, Item>): DrawEntry[] {
  return slots.flatMap((s) => {
    const item = s.status !== 'empty' && s.itemId ? itemsById.get(s.itemId) : undefined
    if (!item) return []
    return [{ itemId: item.id, groupKey: s.groupKey, name: item.name, rarity: item.rarity }]
  }).map((e, order) => ({ ...e, order }))
}

type SlotView =
  | { kind: 'empty'; groupLabel: string }
  | { kind: 'missing'; groupLabel: string }
  | { kind: 'item'; groupLabel: string; item: Item; rarity: 1 | 2 | 3 }

/** Một nguồn duy nhất cho cả phần hiển thị lẫn câu đọc. */
function viewSlot(slot: TraySlot, set: SetDefinition, itemsById: ReadonlyMap<string, Item>): SlotView {
  const groupLabel = set.groups.find((g) => g.key === slot.groupKey)?.label ?? slot.groupKey
  if (slot.status === 'empty' || slot.itemId === null) return { kind: 'empty', groupLabel }
  const item = itemsById.get(slot.itemId)
  // Món vừa bị xoá hoặc danh sách đang tải lại: không nói "hết món"
  if (!item) return { kind: 'missing', groupLabel }
  // Độ hiếm lấy từ món hiện tại (có thể vừa được sửa), không từ bản chụp lúc quay
  return { kind: 'item', groupLabel, item, rarity: item.rarity }
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

/** Thẻ đầu bật sau khi mâm mở (khớp tray-in 0,3s), các thẻ sau cách nhau ~0,5s. */
export const REVEAL_FIRST_MS = 300
export const REVEAL_STEP_MS = 500
/** Thẻ cuối bật xong thì chờ chút rồi mới mở khoá mâm. */
export const REVEAL_SETTLE_MS = 600

/** Thẻ ⭐⭐⭐ bật chậm hơn một nhịp. */
export const LEGEND_BEAT_MS = 300
/** 🎲: ô lật. */
export const FLIP_MS = 600

/** Thẻ bật từ nồi lên rồi rơi vào chỗ trên mâm. */
const POP = {
  initial: { opacity: 0, scale: 0.6, y: -48 },
  animate: { opacity: 1, scale: 1, y: 0 },
  transition: { type: 'spring', stiffness: 420, damping: 24, restDelta: 0.001 },
} as const
/** ⭐⭐⭐: bật chậm, mềm hơn. */
const POP_LEGEND = {
  ...POP,
  transition: { type: 'spring', stiffness: 240, damping: 20, restDelta: 0.001 },
} as const

type Burst = { rarity: 1 | 2 | 3; n: number }

const FOCUSABLE = 'button:not([disabled]), [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'

export function MealTray(props: Props) {
  const open = useTrayStore((s) => s.open)
  // Mount lại mỗi lần mở: state cục bộ (chọn nhóm, câu đọc) tự về ban đầu
  return open ? <TrayDialog {...props} /> : null
}

function TrayDialog({ set, itemsById, draw, onChangeFilter, announcement: text, onCommitted, onAddItem, onEditItem }: Props) {
  const slots = useTrayStore((s) => s.slots)
  const revealing = useTrayStore((s) => s.revealing)
  const finishReveal = useTrayStore((s) => s.finishReveal)
  const close = useTrayStore((s) => s.close)
  const toggleLock = useTrayStore((s) => s.toggleLock)
  const rerollOne = useTrayStore((s) => s.rerollOne)
  const rerollAll = useTrayStore((s) => s.rerollAll)
  const addSlot = useTrayStore((s) => s.addSlot)
  const removeSlot = useTrayStore((s) => s.removeSlot)
  // Đóng mâm để đi việc khác (đổi mùa, thêm món, chốt xong) thì không trả focus về nút cũ
  const skipRestore = useRef(false)
  const takeCommitId = useTrayStore((s) => s.takeCommitId)
  const commitId = useTrayStore((s) => s.commitId)
  const failedCommitId = useTrayStore((s) => s.failedCommitId)
  const markCommitFailed = useTrayStore((s) => s.markCommitFailed)
  const clear = useTrayStore((s) => s.clear)
  // Xử lý thành công ở cấp hook: vẫn chạy nếu mâm đã đóng khi request đang bay
  const commit = useCommitTray(set.setKey, () => {
    // Không trả focus về nút cũ: màn Quay tự đặt focus vào phản hồi
    skipRestore.current = true
    clear()
    onCommitted()
  })
  const entries = trayEntries(slots, itemsById)
  // Đang chốt thì khoá mọi thao tác trên mâm, để mâm lưu đúng là mâm đang thấy
  const busy = commit.isPending
  // Lỗi chỉ còn nghĩa khi mâm chưa đổi từ lần chốt lỗi đó
  const showCommitError = !!commit.error && failedCommitId !== null && failedCommitId === commitId

  function commitTray() {
    if (busy || entries.length === 0) return
    const id = takeCommitId()
    // Thử lại khi mâm chưa đổi: cùng ID, trùng thì coi là thành công.
    // Mâm đã đổi sau một lần lỗi: xoá bản ghi của lần đó (nếu nó đã tới server).
    const replaceId = failedCommitId && failedCommitId !== id ? failedCommitId : null
    commit.mutate({ id, entries, replaceId }, { onError: () => markCommitFailed(id) })
  }

  // Đóng mâm để làm việc khác (đổi mùa, thêm món): nơi nhận focus do màn gọi quyết định
  function closeThen(next: () => void) {
    skipRestore.current = true
    close()
    next()
  }

  function safeClose() {
    if (!busy) close()
  }
  const [picking, setPicking] = useState(false)
  const imagesOf = useItemImages()
  // Đang xem chi tiết món của ô nào (cùng một lớp modal với mâm)
  const [detailSlotId, setDetailSlotId] = useState<string | null>(null)
  const detailHeadingRef = useRef<HTMLHeadingElement>(null)
  const returnFocusSlot = useRef<string | null>(null)
  const addButtonRef = useRef<HTMLButtonElement>(null)
  const pickerRef = useRef<HTMLDivElement>(null)
  const pickerTouched = useRef(false)


  function openDetail(slotId: string) {
    returnFocusSlot.current = slotId
    setDetailSlotId(slotId)
  }

  function backToTray() {
    setDetailSlotId(null)
  }


  // Đọc lại mâm sau mỗi thao tác (🎲, Đổi cả mâm, ＋, ✕)
  function announce(only?: string) {
    const all = useTrayStore.getState().slots
    const slotsToRead = only ? all.filter((x) => x.id === only) : all
    setAnnouncement(trayAnnouncement(slotsToRead, set, itemsById))
  }

  // Nút đang focus bị gỡ khỏi DOM (✕, chọn nhóm, Thôi) thì đưa focus về chỗ hợp lý trong mâm
  useEffect(() => {
    if (!pickerTouched.current) return
    if (picking) pickerRef.current?.querySelector<HTMLElement>('button')?.focus()
    else (addButtonRef.current ?? dialogRef.current)?.focus()
  }, [picking])

  function openPicker(value: boolean) {
    pickerTouched.current = true
    setPicking(value)
  }
  const dialogRef = useRef<HTMLDivElement>(null)
  const [announcement, setAnnouncement] = useState('')

  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null
    dialogRef.current?.focus()
    return () => {
      if (!skipRestore.current) previous?.focus?.()
    }
  }, [close])

  // Đọc mâm một lần, khi đã bật đủ thẻ.
  // Vùng live đã có trong DOM trước khi đổi nội dung thì trình đọc mới đọc.
  useEffect(() => {
    if (revealing) return
    const t = window.setTimeout(() => setAnnouncement(text), 50)
    return () => window.clearTimeout(t)
  }, [text, revealing])

  const reducedMotion = useReducedMotion()
  // Đọc trong hẹn giờ: luôn là giá trị mới nhất (người dùng có thể bật Giảm chuyển động giữa chừng)
  const reducedRef = useRef(reducedMotion)
  useEffect(() => {
    reducedRef.current = reducedMotion
  }, [reducedMotion])
  // Hiệu ứng theo bậc đang chạy trên từng ô
  const [bursts, setBursts] = useState<Record<string, Burst>>({})
  const burstSeq = useRef(0)
  const playBurst = (slotId: string, rarity: 1 | 2 | 3) => {
    if (reducedRef.current) return
    burstSeq.current += 1
    const n = burstSeq.current
    setBursts((b) => ({ ...b, [slotId]: { rarity, n } }))
  }
  const endBurst = (slotId: string, n: number) =>
    setBursts((b) => {
      if (b[slotId]?.n !== n) return b
      const rest = { ...b }
      delete rest[slotId]
      return rest
    })
  // Hiệu ứng theo bậc lúc quay (cùng nguồn với nồi nhá hàng ở màn Quay)
  const rarityOf = (slot: TraySlot): 1 | 2 | 3 | null => (slot.status !== 'empty' && slot.itemId ? slot.rarity : null)

  // Bật thẻ lần lượt: ô đầu sau REVEAL_FIRST_MS, mỗi ô sau cách REVEAL_STEP_MS (⭐⭐⭐ chậm thêm một nhịp).
  // Thẻ cuối là ⭐⭐⭐ thì giữ lớp bỏ qua tới hết hiệu ứng.
  const [shown, setShown] = useState(0)
  const playBurstRef = useRef(playBurst)
  useEffect(() => {
    playBurstRef.current = playBurst
  })
  useEffect(() => {
    if (!revealing) return
    // Kế hoạch chốt lúc bắt đầu bật: danh sách món có tải lại giữa chừng cũng không đổi nhịp
    const plan = useTrayStore.getState().slots
    const ids = plan.map((s) => s.id)
    const rarities = plan.map((s) => (s.status !== 'empty' && s.itemId ? s.rarity : null))
    const beat = (i: number) => (rarities[i] === 3 ? LEGEND_BEAT_MS : 0)
    let n = 0
    let t: number
    // đồng hồ của chuỗi bật và lúc hiệu ứng dài nhất kết thúc
    let clock = REVEAL_FIRST_MS + beat(0)
    let burstEnd = 0
    const tick = () => {
      n += 1
      setShown(n)
      const r = rarities[n - 1]
      if (r && !reducedRef.current) {
        playBurstRef.current(ids[n - 1], r)
        // chỉ giữ mâm chờ hiệu ứng ⭐⭐⭐ (chạm để bỏ qua); bậc thấp để tự tắt sau khi mở khoá
        if (r === 3) burstEnd = Math.max(burstEnd, clock + BURST_MS[3])
      }
      if (n >= ids.length) {
        t = window.setTimeout(finishReveal, Math.max(REVEAL_SETTLE_MS, burstEnd - clock))
      } else {
        const wait = REVEAL_STEP_MS + beat(n)
        clock += wait
        t = window.setTimeout(tick, wait)
      }
    }
    t = window.setTimeout(tick, clock)
    return () => window.clearTimeout(t)
  }, [revealing, finishReveal])

  // Bỏ qua: hiện cả mâm, dừng mọi hiệu ứng đang chạy
  function skipReveal() {
    setBursts({})
    finishReveal()
  }

  // 🎲: ô lật rồi chạy hiệu ứng theo bậc món mới. Mỗi ô một lần lật: chạm liên tục thì huỷ lần trước.
  const slotEls = useRef(new Map<string, HTMLElement>())
  const flips = useRef(new Map<string, { timer: number; anim?: Animation }>())
  useEffect(() => {
    const all = flips.current
    return () => all.forEach((f) => window.clearTimeout(f.timer))
  }, [])
  function flipThenBurst(slotId: string) {
    const prev = flips.current.get(slotId)
    if (prev) {
      window.clearTimeout(prev.timer)
      prev.anim?.cancel()
      flips.current.delete(slotId)
    }
    if (reducedRef.current) return
    const el = slotEls.current.get(slotId)
    // Web Animations: jsdom/trình duyệt cũ không có thì bỏ qua êm
    const anim = el?.animate?.(
      [
        { transform: 'perspective(600px) rotateY(0deg)' },
        { transform: 'perspective(600px) rotateY(90deg)' },
        { transform: 'perspective(600px) rotateY(0deg)' },
      ],
      { duration: FLIP_MS, easing: 'ease-in-out' },
    )
    const timer = window.setTimeout(() => {
      flips.current.delete(slotId)
      // món mới sau khi đổi (đọc lại store lúc lật xong)
      const slot = useTrayStore.getState().slots.find((s) => s.id === slotId)
      const r = slot ? rarityOf(slot) : null
      if (r) playBurst(slotId, r)
    }, FLIP_MS)
    flips.current.set(slotId, { timer, anim })
  }

  // Bật xong (hoặc bỏ qua): focus lại dialog (nút bỏ qua vừa biến mất)
  const wasRevealing = useRef(revealing)
  useEffect(() => {
    if (wasRevealing.current && !revealing) dialogRef.current?.focus()
    wasRevealing.current = revealing
  }, [revealing])

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

  const group = (key: string) => set.groups.find((g) => g.key === key)
  const detailSlot = detailSlotId ? slots.find((x) => x.id === detailSlotId) : undefined
  const detailSlotView = detailSlot ? viewSlot(detailSlot, set, itemsById) : undefined
  const detailView = detailSlotView?.kind === 'item' ? detailSlotView : undefined
  // Đang xem chi tiết chỉ khi món còn hiển thị được (món biến mất thì coi như đã về mâm)
  const inDetail = detailView !== undefined
  const commitBusy = useRef(false)
  useEffect(() => {
    commitBusy.current = busy
  }, [busy])

  // Esc: đang xem chi tiết thì về mâm, đang ở mâm thì đóng
  useEffect(() => {
    const onKey = (e: globalThis.KeyboardEvent) => {
      if (e.key !== 'Escape') return
      if (inDetail) setDetailSlotId(null)
      else if (!commitBusy.current) close()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [inDetail, close])

  // Mở chi tiết: focus tên món; về mâm (kể cả khi món biến mất): focus nút của ô vừa mở, không có thì dialog
  useEffect(() => {
    if (inDetail) {
      detailHeadingRef.current?.focus()
    } else if (returnFocusSlot.current) {
      const target = dialogRef.current?.querySelector<HTMLElement>(`[data-open-slot="${returnFocusSlot.current}"]`)
      ;(target ?? dialogRef.current)?.focus()
      returnFocusSlot.current = null
    }
  }, [inDetail])

  const visibleSlots = revealing ? slots.slice(0, shown) : slots
  const popFor = (slot: TraySlot) => (revealing ? (rarityOf(slot) === 3 ? POP_LEGEND : POP) : {})

  return (
    <div className="tray-overlay">
      <div className="tray-overlay__dim" onClick={safeClose} aria-hidden="true" />
      <div
        className="tray-dialog"
        role="dialog"
        aria-modal="true"
        aria-busy={busy || undefined}
        aria-label={detailView ? copy.tray.detailTitle(detailView.item.name) : copy.tray.title}
        ref={dialogRef}
        tabIndex={-1}
        onKeyDown={(e) => {
          // Đang bật thẻ: Enter/Space cũng hiện cả mâm ngay (bàn phím, trình đọc màn hình)
          if (revealing && (e.key === 'Enter' || e.key === ' ')) {
            e.preventDefault()
            skipReveal()
            return
          }
          trapTab(e)
        }}
      >
        {revealing && (
          <button type="button" className="visually-hidden" onClick={skipReveal}>
            {copy.tray.skipReveal}
          </button>
        )}
        {detailView ? (
          <>
            <button type="button" className="tray-dialog__back" onClick={backToTray}>
              {copy.tray.backToTray}
            </button>
            <ItemDetail
              item={detailView.item}
              set={set}
              ref={detailHeadingRef}
              onEdit={onEditItem && (() => closeThen(() => onEditItem(detailView.item.id)))}
            />
          </>
        ) : (
          <>
            <fieldset className="tray-dialog__body" disabled={busy || revealing}>
              <p className="tray-dialog__say">{copy.tray.say}</p>
              <ul className="meal-tray">
                {visibleSlots.map((slot) => {
                  const g = group(slot.groupKey)
                  const v = viewSlot(slot, set, itemsById)
                  const removeButton = slot.removable && (
                    <button
                      type="button"
                      className="slot-button"
                      aria-label={copy.tray.remove(v.groupLabel, v.kind === 'item' ? v.item.name : null)}
                      onClick={() => {
                        removeSlot(slot.id)
                        dialogRef.current?.focus()
                        announce()
                      }}
                    >
                      <span aria-hidden="true">✕</span>
                    </button>
                  )
                  if (v.kind === 'empty') {
                    return (
                      <motion.li {...popFor(slot)} key={slot.id} className="meal-slot meal-slot--empty">
                        <div className="meal-slot__info">
                          {g && <GroupTag label={g.label} color={g.color} />}
                          <p className="meal-slot__empty">{set.messages.emptySlot(v.groupLabel)}</p>
                        </div>
                        <button
                          type="button"
                          className="button-secondary"
                          onClick={() => closeThen(onChangeFilter)}
                        >
                          {set.messages.changeFilter}
                        </button>
                        {onAddItem && (
                          <button
                            type="button"
                            className="button-secondary"
                            onClick={() => closeThen(() => onAddItem(slot.groupKey))}
                          >
                            {copy.editor.addButton}
                          </button>
                        )}
                        {removeButton}
                      </motion.li>
                    )
                  }
                  if (v.kind === 'missing') {
                    return (
                      <motion.li {...popFor(slot)} key={slot.id} className="meal-slot meal-slot--empty">
                        <div className="meal-slot__info">{g && <GroupTag label={g.label} color={g.color} />}</div>
                        {slot.locked && (
                          <button
                            type="button"
                            className="slot-button slot-button--on"
                            aria-pressed="true"
                            aria-label={copy.tray.locked(v.groupLabel)}
                            onClick={() => toggleLock(slot.id)}
                          >
                            <span aria-hidden="true">🔒</span>
                          </button>
                        )}
                        {removeButton}
                      </motion.li>
                    )
                  }
                  return (
                    <motion.li
                      {...popFor(slot)}
                      key={slot.id}
                      ref={(el: HTMLLIElement | null) => {
                        if (el) slotEls.current.set(slot.id, el)
                        else slotEls.current.delete(slot.id)
                      }}
                      className={`meal-slot${slot.locked ? ' meal-slot--locked' : ''}`}
                      style={{ borderColor: rarityColor[v.rarity] }}
                    >
                      {bursts[slot.id] && (
                        <RarityBurst
                          key={bursts[slot.id].n}
                          rarity={bursts[slot.id].rarity}
                          onDone={() => endBurst(slot.id, bursts[slot.id].n)}
                        />
                      )}
                      <button
                        type="button"
                        className="meal-slot__open"
                        data-open-slot={slot.id}
                        aria-label={copy.tray.openDetail(v.groupLabel, v.item.name, copy.rarity[v.rarity].label)}
                        onClick={() => openDetail(slot.id)}
                      >
                        <DishImage className="meal-slot__thumb" sources={imagesOf(v.item, 'thumb')} alt="" compact />
                        <span className="meal-slot__info">
                          {g && <GroupTag label={g.label} color={g.color} />}
                          <span className="meal-slot__name">{v.item.name}</span>
                          <RarityBadge rarity={v.rarity} />
                        </span>
                      </button>
                      <div className="meal-slot__controls">
                        <button
                          type="button"
                          className="slot-button"
                          aria-label={copy.tray.reroll(v.item.name)}
                          disabled={slot.locked}
                          onClick={() => {
                            rerollOne(slot.id, draw)
                            announce(slot.id)
                            flipThenBurst(slot.id)
                          }}
                        >
                          <span aria-hidden="true">🎲</span>
                        </button>
                        <button
                          type="button"
                          className={`slot-button${slot.locked ? ' slot-button--on' : ''}`}
                          aria-pressed={slot.locked}
                          aria-label={slot.locked ? copy.tray.locked(v.item.name) : copy.tray.unlocked(v.item.name)}
                          onClick={() => toggleLock(slot.id)}
                        >
                          <span aria-hidden="true">{slot.locked ? '🔒' : '🔓'}</span>
                        </button>
                        {removeButton}
                      </div>
                    </motion.li>
                  )
                })}
                {/* Chỗ của các thẻ sắp bật: giữ chiều cao mâm, không đọc */}
                {revealing &&
                  slots.slice(shown).map((slot) => <li key={slot.id} className="meal-slot meal-slot--pending" aria-hidden="true" />)}
              </ul>
              {showCommitError && commit.error && (
                <div className="tray-dialog__error" role="alert">
                  <p>{commit.error.message}</p>
                  <button type="button" className="button-secondary" onClick={commitTray}>
                    {copy.retry}
                  </button>
                </div>
              )}
              <div className="tray-dialog__actions">
                <button
                  type="button"
                  className="button-secondary"
                  onClick={() => {
                    commit.reset()
                    rerollAll(draw)
                    announce()
                  }}
                >
                  {copy.tray.rerollAll}
                </button>
                <button
                  type="button"
                  className="button-primary tray-dialog__commit"
                  onClick={commitTray}
                  disabled={entries.length === 0}
                  aria-disabled={commit.isPending || undefined}
                >
                  {commit.isPending ? copy.tray.committing : copy.tray.commit}
                </button>
              </div>
              <button type="button" className="tray-add__link" onClick={safeClose}>
                {copy.tray.close}
              </button>
              {picking ? (
                <div className="tray-add" role="group" aria-labelledby="tray-add-label" ref={pickerRef}>
                  <p className="tray-add__label" id="tray-add-label">
                    {copy.tray.addPick}
                  </p>
                  <div className="tray-add__options">
                    {set.groups.map((g) => (
                      <button
                        key={g.key}
                        type="button"
                        className="button-secondary"
                        onClick={() => {
                          addSlot(g.key, draw)
                          openPicker(false)
                          announce()
                        }}
                      >
                        {g.label}
                      </button>
                    ))}
                    <button type="button" className="tray-add__link" onClick={() => openPicker(false)}>
                      {copy.tray.addCancel}
                    </button>
                  </div>
                </div>
              ) : (
                slots.length < MAX_SLOTS && (
                  <button type="button" className="tray-add__link" ref={addButtonRef} onClick={() => openPicker(true)}>
                    {copy.tray.add}
                  </button>
                )
              )}
            </fieldset>
          </>
        )}
        <p className="visually-hidden" aria-live="polite">
          {announcement}
        </p>
      </div>
      {revealing && (
        // Chạm bất kỳ đâu (kể cả nền) khi đang bật thẻ: hiện cả mâm ngay.
        // Bàn phím/trình đọc dùng nút cùng nhãn bên trong dialog.
        <div className="tray-reveal__skip" aria-hidden="true" data-testid="reveal-skip" onClick={skipReveal} />
      )}
    </div>
  )
}
