import { useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router'
import { useHasDraws, useRecentDraws } from '../../data/draws'
import { useItems, type Item } from '../../data/items'
import { useSetConfig } from '../../data/setConfig'
import { drawSlots, type EngineItem, type Slot } from '../../engine'
import { DEFAULT_SET_KEY, getSet } from '../../sets/registry'
import type { SetDefinition } from '../../sets/types'
import { ChipGroup } from '../../ui/ChipGroup'
import { copy } from '../../ui/copy'
import { GachaPot } from '../../ui/GachaPot'
import { rarityFeedback } from '../../ui/feedback'
import { useSoundEnabled } from '../../ui/preferences'
import { playPotBoom, preloadSounds, startPotRumble, unlockAudio } from '../../ui/sound'
import { useReducedMotion } from '../../ui/useReducedMotion'
import { ItemEditor, type EditorPrefill } from '../item-editor/ItemEditor'
import { MealTray, trayAnnouncement } from '../tray/MealTray'
import { useTrayStore, type DrawFn } from '../tray/store'
import './SpinScreen.css'

const SPIN_MS = 1500
const SPIN_MS_REDUCED = 300
// Khớp thời lượng `pot-lid-pop` trong GachaPot.css
const POT_OPEN_MS = 600
/** Mâm mở khi nắp lên tới đỉnh (~40% của POT_OPEN_MS). */
export const LID_LEAD_MS = 250
/** Nhá hàng ⭐⭐⭐ trước khi bật nắp. */
export const TEASE_MS = 800

function defaultFilters(set: SetDefinition, now: Date): Record<string, string> {
  return Object.fromEntries(set.facets.map((f) => [f.key, f.defaultValue(now)]))
}

function toEngineItem(item: Item): EngineItem {
  return { id: item.id, groupKey: item.groupKey, rarity: item.rarity, tags: item.tags, deleted: item.deleted }
}

export function SpinScreen() {
  const set = getSet(DEFAULT_SET_KEY)
  // Lần đầu mở app: household chưa có món thì nạp món mặc định của Bộ
  const items = useItems(set)
  // Số ngày tránh trùng: cấu hình của nhà (nếu có), không thì mặc định của Bộ (AD-7)
  const config = useSetConfig(set.setKey)
  const cooldownDays = config.data?.cooldownDays ?? set.defaultCooldownDays
  const recentDraws = useRecentDraws(set.setKey, cooldownDays)
  const hasDraws = useHasDraws(set.setKey)
  const [committedNote, setCommittedNote] = useState(false)
  const [editor, setEditor] = useState<EditorPrefill | null>(null)
  // Giữ bản món lúc bấm Sửa: danh sách có tải lại hay món biến mất thì form vẫn còn và luôn gọi onClose
  const [editingItem, setEditingItem] = useState<Item | null>(null)
  const statusRef = useRef<HTMLParagraphElement>(null)
  const [filters, setFilters] = useState(() => defaultFilters(set, new Date()))
  const [spinning, setSpinning] = useState(false)
  // Từ lúc chạm "Mở nồi!" tới khi mâm mở (sôi → nhá hàng → nắp bật): khoá nút Quay
  const [busy, setBusy] = useState(false)
  const [potOpening, setPotOpening] = useState(false)
  const [potTeasing, setPotTeasing] = useState(false)
  const [potFlash, setPotFlash] = useState<'rare' | 'legend' | null>(null)
  const [announcement, setAnnouncement] = useState('')
  const reducedMotion = useReducedMotion()
  const [soundOn] = useSoundEnabled()
  const showResult = useTrayStore((s) => s.showResult)
  const facetRefs = useRef<(HTMLDivElement | null)[]>([])
  const spinButton = useRef<HTMLButtonElement>(null)
  const timer = useRef<number | undefined>(undefined)
  const lidTimer = useRef<number | undefined>(undefined)
  // Dừng tiếng nồi sôi đang lặp
  const stopRumble = useRef<(() => void) | undefined>(undefined)

  const itemsById = useMemo(() => new Map((items.data ?? []).map((i) => [i.id, i])), [items.data])

  useEffect(
    () => () => {
      window.clearTimeout(timer.current)
      window.clearTimeout(lidTimer.current)
      stopRumble.current?.()
      // Rời màn Quay thì đóng mâm; quay lại không tự bật mâm cũ
      useTrayStore.getState().close()
    },
    [],
  )

  const engineItems = useMemo(() => (items.data ?? []).map(toEngineItem), [items.data])

  // Một hàm quay dùng chung cho mở nồi, 🎲, Đổi cả mâm, ＋ ô
  const draw: DrawFn = (slots: Slot[]) =>
    drawSlots({
      set,
      items: engineItems,
      recentDraws: recentDraws.data ?? [],
      cooldownDays,
      slots,
      filters,
      now: new Date(),
      rng: Math.random,
    })

  function spin() {
    if (busy || !items.data) return
    // Âm thanh phát sau (theo hẹn giờ): mở khoá audio ngay trong lần chạm này (iOS)
    if (soundOn) {
      unlockAudio()
      preloadSounds()
    }
    setCommittedNote(false)
    const snapshot = itemsById
    // Quay ngay (engine thuần), phần chờ chỉ là hiệu ứng nồi sôi
    const result = draw(set.slotTemplate.map((s, i) => ({ id: `slot-${i}`, groupKey: s.groupKey, itemId: null, keep: false })))
    const removable = new Set(set.slotTemplate.flatMap((s, i) => (s.removable ? [`slot-${i}`] : [])))
    // Nồi sôi rung lục cục tới lúc nắp bật (giảm chuyển động: nồi không bật nắp → không có tiếng nồi)
    if (soundOn && !reducedMotion) stopRumble.current = startPotRumble()
    setSpinning(true)
    setBusy(true)
    timer.current = window.setTimeout(
      () => {
        setSpinning(false)
        const open = () => {
          setBusy(false)
          showResult(result, removable, !reducedMotion)
          // Dùng đúng danh sách món đã quay, không phụ thuộc lần tải lại sau đó
          setAnnouncement(trayAnnouncement(useTrayStore.getState().slots, set, snapshot))
        }
        const rarities = result.slots.map((s) => s.rarity)
        // Giảm chuyển động: hiện cả mâm (fade), nắp không bật; phản hồi một lần theo bậc cao nhất
        if (reducedMotion) {
          const top = rarities.reduce<0 | 1 | 2 | 3>((m, r) => (r && r > m ? r : m), 0)
          if (top) rarityFeedback(top, soundOn)
          return open()
        }
        const legend = rarities.includes(3)
        // Nắp bật tung trước (⭐⭐: lóe xanh), mâm mở khi nắp lên tới đỉnh, rồi thẻ bật lần lượt
        const popLid = () => {
          if (stopRumble.current) {
            stopRumble.current()
            stopRumble.current = undefined
            playPotBoom()
          }
          setPotTeasing(false)
          setPotFlash(legend ? 'legend' : rarities.includes(2) ? 'rare' : null)
          setPotOpening(true)
          window.clearTimeout(lidTimer.current)
          lidTimer.current = window.setTimeout(() => setPotOpening(false), POT_OPEN_MS)
          timer.current = window.setTimeout(open, LID_LEAD_MS)
        }
        if (!legend) return popLid()
        // Có ⭐⭐⭐: nhá hàng một lần cho cả mâm
        setPotTeasing(true)
        timer.current = window.setTimeout(popLid, TEASE_MS)
      },
      reducedMotion ? SPIN_MS_REDUCED : SPIN_MS,
    )
  }

  function focusFilters() {
    const group = facetRefs.current.find(Boolean)
    const checked = group?.querySelector<HTMLElement>('[aria-checked="true"]')
    ;(checked ?? group ?? spinButton.current)?.focus()
  }

  return (
    <div className="spin-screen">
      <div className="spin-screen__top">
        <button type="button" className="set-picker" aria-disabled="true">
          {copy.spin.setPicker(set.label)} <span aria-hidden="true">▾</span>
        </button>
        <Link to="/cai-dat" className="spin-screen__gear" aria-label={copy.settings.open}>
          <span aria-hidden="true">⚙︎</span>
        </Link>
      </div>
      <h1 className="spin-screen__greeting">{copy.spin.greeting}</h1>

      {set.facets.map((facet, i) => (
        <ChipGroup
          key={facet.key}
          ref={(el) => {
            facetRefs.current[i] = el
          }}
          label={facet.label}
          options={facet.values}
          value={filters[facet.key]}
          onChange={(value) => setFilters((f) => ({ ...f, [facet.key]: value }))}
        />
      ))}

      <div className="spin-screen__stage">
        <GachaPot boiling={spinning} teasing={potTeasing} opening={potOpening} flash={potFlash} />
      </div>

      {items.error || recentDraws.error || (config.error && !config.data) ? (
        <div className="spin-screen__error" role="alert">
          <p className="form-error">{(items.error ?? recentDraws.error ?? config.error)!.message}</p>
          <button
            type="button"
            className="button-secondary"
            onClick={() => void (items.error ? items.refetch() : recentDraws.error ? recentDraws.refetch() : config.refetch())}
          >
            {copy.retry}
          </button>
        </div>
      ) : committedNote ? (
        <p className="spin-screen__hint spin-screen__done" role="status" tabIndex={-1} ref={statusRef}>
          {copy.tray.committed}
        </p>
      ) : (
        hasDraws.data === false && <p className="spin-screen__hint">{copy.spin.firstHint}</p>
      )}

      <button
        ref={spinButton}
        type="button"
        className="spin-button"
        onClick={spin}
        // Chờ cả danh sách món lẫn mâm gần đây, để luật tránh trùng luôn có hiệu lực
        disabled={!items.data || !config.data || (cooldownDays > 0 && !recentDraws.data)}
        aria-disabled={busy || undefined}
        data-spinning={busy || undefined}
      >
        {busy ? copy.spin.spinning : copy.spin.button}
      </button>

      <MealTray
        set={set}
        itemsById={itemsById}
        draw={draw}
        onChangeFilter={focusFilters}
        announcement={announcement}
        onAddItem={(groupKey) => setEditor({ groupKey, facets: filters })}
        onEditItem={(id) => setEditingItem(items.data?.find((i) => i.id === id) ?? null)}
        onCommitted={() => {
          setCommittedNote(true)
          // Đưa focus vào phản hồi để trình đọc báo, và không rơi ra body
          window.setTimeout(() => statusRef.current?.focus(), 0)
        }}
      />
      {editor && (
        <ItemEditor
          set={set}
          prefill={editor}
          onClose={() => {
            setEditor(null)
            // Nút mở form nằm trong mâm đã đóng: đưa focus về nút Quay
            requestAnimationFrame(() => spinButton.current?.focus())
          }}
        />
      )}
      {editingItem && (
        <ItemEditor
          set={set}
          item={editingItem}
          onClose={() => {
            setEditingItem(null)
            // Sửa xong quay lại đúng mâm (khoá, thứ tự giữ nguyên). Món có thể đã đổi:
            // lần chốt sau là một mâm khác nên dùng ID mới (bản lỗi trước, nếu có, sẽ được thay).
            useTrayStore.setState({ open: true, commitId: null })
          }}
        />
      )}
    </div>
  )
}
