import { useEffect, useMemo, useRef, useState } from 'react'
import { useHasDraws, useRecentDraws } from '../../data/draws'
import { useItems, type Item } from '../../data/items'
import { drawSlots, type EngineItem, type Slot } from '../../engine'
import { DEFAULT_SET_KEY, getSet } from '../../sets/registry'
import type { SetDefinition } from '../../sets/types'
import { ChipGroup } from '../../ui/ChipGroup'
import { copy } from '../../ui/copy'
import { GachaPot } from '../../ui/GachaPot'
import { useReducedMotion } from '../../ui/useReducedMotion'
import { ItemEditor, type EditorPrefill } from '../item-editor/ItemEditor'
import { MealTray, trayAnnouncement } from '../tray/MealTray'
import { useTrayStore, type DrawFn } from '../tray/store'
import './SpinScreen.css'

const SPIN_MS = 1500
const SPIN_MS_REDUCED = 300

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
  // Chưa có set_configs (Story 3.3): dùng số ngày mặc định của Bộ
  const cooldownDays = set.defaultCooldownDays
  const recentDraws = useRecentDraws(set.setKey, cooldownDays)
  const hasDraws = useHasDraws(set.setKey)
  const [committedNote, setCommittedNote] = useState(false)
  const [editor, setEditor] = useState<EditorPrefill | null>(null)
  // Giữ bản món lúc bấm Sửa: danh sách có tải lại hay món biến mất thì form vẫn còn và luôn gọi onClose
  const [editingItem, setEditingItem] = useState<Item | null>(null)
  const statusRef = useRef<HTMLParagraphElement>(null)
  const [filters, setFilters] = useState(() => defaultFilters(set, new Date()))
  const [spinning, setSpinning] = useState(false)
  const [announcement, setAnnouncement] = useState('')
  const reducedMotion = useReducedMotion()
  const showResult = useTrayStore((s) => s.showResult)
  const facetRefs = useRef<(HTMLDivElement | null)[]>([])
  const spinButton = useRef<HTMLButtonElement>(null)
  const timer = useRef<number | undefined>(undefined)

  const itemsById = useMemo(() => new Map((items.data ?? []).map((i) => [i.id, i])), [items.data])

  useEffect(
    () => () => {
      window.clearTimeout(timer.current)
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
    if (spinning || !items.data) return
    setCommittedNote(false)
    const snapshot = itemsById
    // Quay ngay (engine thuần), phần chờ chỉ là hiệu ứng nồi sôi
    const result = draw(set.slotTemplate.map((s, i) => ({ id: `slot-${i}`, groupKey: s.groupKey, itemId: null, keep: false })))
    const removable = new Set(set.slotTemplate.flatMap((s, i) => (s.removable ? [`slot-${i}`] : [])))
    setSpinning(true)
    timer.current = window.setTimeout(
      () => {
        setSpinning(false)
        showResult(result, removable)
        // Dùng đúng danh sách món đã quay, không phụ thuộc lần tải lại sau đó
        setAnnouncement(trayAnnouncement(useTrayStore.getState().slots, set, snapshot))
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
        <GachaPot boiling={spinning} />
      </div>

      {items.error || recentDraws.error ? (
        <div className="spin-screen__error" role="alert">
          <p className="form-error">{(items.error ?? recentDraws.error)!.message}</p>
          <button
            type="button"
            className="button-secondary"
            onClick={() => void (items.error ? items.refetch() : recentDraws.refetch())}
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
        disabled={!items.data || (cooldownDays > 0 && !recentDraws.data)}
        aria-disabled={spinning || undefined}
        data-spinning={spinning || undefined}
      >
        {spinning ? copy.spin.spinning : copy.spin.button}
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
