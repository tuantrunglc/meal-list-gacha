import { useEffect, useMemo, useRef, useState } from 'react'
import { useDrawHistory, type Draw, type DrawEntry } from '../../data/draws'
import { useCurrentHousehold } from '../../data/household'
import { useItemImages } from '../../data/files'
import { useItems, type Item } from '../../data/items'
import { DEFAULT_SET_KEY, getSet } from '../../sets/registry'
import { copy } from '../../ui/copy'
import { DishImage } from '../../ui/DishImage'
import { Modal } from '../../ui/Modal'
import { ItemDetail } from '../item-detail/ItemDetail'
import { formatChosenAt } from './format'
import './HistoryScreen.css'

/**
 * Món để xem từ lịch sử: công thức/ảnh lấy từ bản ghi (còn hay đã xoá mềm), còn tên và độ hiếm
 * luôn là lúc chốt — nhất quán với tên trên hàng lịch sử.
 */
function itemForEntry(entry: DrawEntry, byId: ReadonlyMap<string, Item>, setKey: string): Item {
  const item = byId.get(entry.itemId)
  const base: Item = item ?? {
    id: entry.itemId,
    household: '',
    setKey,
    groupKey: entry.groupKey,
    name: entry.name,
    rarity: entry.rarity,
    tags: [],
    attrs: null,
    seedKey: '',
    deleted: true,
    imageFile: '',
    collectionId: '',
    updated: '',
  }
  return { ...base, name: entry.name, rarity: entry.rarity }
}

export function HistoryScreen() {
  const set = getSet(DEFAULT_SET_KEY)
  const history = useDrawHistory(set.setKey)
  const household = useCurrentHousehold()
  const items = useItems(set)
  const imagesOf = useItemImages()
  const [open, setOpen] = useState<{ entry: DrawEntry } | null>(null)
  const sentinel = useRef<HTMLDivElement>(null)
  const byId = useMemo(() => new Map((items.all ?? []).map((i) => [i.id, i])), [items.all])
  // Phân trang theo số trang: chốt/xoá mâm giữa hai lần tải có thể đẩy một mâm sang trang sau → bỏ trùng
  const draws: Draw[] = useMemo(() => {
    const seen = new Set<string>()
    return (history.data?.pages.flatMap((p) => p.items) ?? []).filter((d) => !seen.has(d.id) && seen.add(d.id))
  }, [history.data])
  const { hasNextPage, isFetchingNextPage, fetchNextPage, isFetchNextPageError } = history
  // Chưa có household (lỗi) thì lịch sử không chạy: báo lỗi household
  const error = history.error ?? (history.data ? null : household.error)

  // Cuộn gần cuối thì tải trang kế
  useEffect(() => {
    const el = sentinel.current
    // Lỗi tải trang kế: không tự tải lại liên tục, chờ người dùng bấm Thử lại
    if (!el || !hasNextPage || isFetchNextPageError || typeof IntersectionObserver === 'undefined') return
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting) && !isFetchingNextPage) void fetchNextPage()
      },
      // tải trước khi chạm đáy
      { rootMargin: '300px 0px' },
    )
    io.observe(el)
    return () => io.disconnect()
  }, [hasNextPage, isFetchingNextPage, isFetchNextPageError, fetchNextPage])

  const openItem = open ? itemForEntry(open.entry, byId, set.setKey) : undefined

  return (
    <div className="history">
      <h1 className="screen-title">{copy.screens.history}</h1>

      {error && !history.data ? (
        <div className="history__status" role="alert">
          <p className="form-error">{error.message}</p>
          <button
            type="button"
            className="button-secondary"
            onClick={() => void (history.error ? history.refetch() : household.refetch())}
          >
            {copy.retry}
          </button>
        </div>
      ) : !history.data ? (
        <p className="history__status" role="status">
          {copy.history.loading}
        </p>
      ) : draws.length === 0 ? (
        <p className="history__status" role="status">
          {copy.history.empty}
        </p>
      ) : (
        <ul className="history__list">
          {draws.map((draw) => {
            const when = formatChosenAt(draw.chosenAt)
            const entries = [...draw.entries].sort((a, b) => a.order - b.order)
            if (!when && entries.length === 0) return null
            return (
              <li key={draw.id} className="history-row" aria-label={copy.history.trayLabel(when)}>
                <p className="history-row__when">{when}</p>
                <ul className="history-row__dishes">
                  {entries.map((entry) => {
                    const item = itemForEntry(entry, byId, set.setKey)
                    return (
                      <li key={`${entry.order}:${entry.itemId}`}>
                        <button
                          type="button"
                          className="history-row__dish"
                          aria-label={copy.history.openDish(entry.name)}
                          onClick={() => setOpen({ entry })}
                        >
                          <DishImage className="history-row__thumb" sources={imagesOf(item, 'thumb')} alt="" compact />
                          <span className="history-row__name">{entry.name}</span>
                        </button>
                      </li>
                    )
                  })}
                </ul>
              </li>
            )
          })}
        </ul>
      )}

      {hasNextPage && (
        <div ref={sentinel} className="history__more">
          {isFetchNextPageError && history.error && (
            <p className="form-error" role="alert">
              {history.error.message}
            </p>
          )}
          <button type="button" className="button-secondary" onClick={() => void fetchNextPage()} disabled={isFetchingNextPage}>
            {isFetchingNextPage ? copy.history.loadingMore : isFetchNextPageError ? copy.retry : copy.history.more}
          </button>
        </div>
      )}

      {openItem && (
        <Modal label={copy.tray.detailTitle(openItem.name)} onClose={() => setOpen(null)}>
          <button type="button" className="history__close" onClick={() => setOpen(null)}>
            {copy.library.detailClose}
          </button>
          {items.all ? (
            <ItemDetail item={openItem} set={set} />
          ) : items.error ? (
            <div role="alert" className="history__status">
              <p className="form-error">{items.error.message}</p>
              <button type="button" className="button-secondary" onClick={() => void items.refetch()}>
                {copy.retry}
              </button>
            </div>
          ) : (
            // công thức/ảnh chưa tải xong: đừng hiện chi tiết rỗng
            <p className="history__status" role="status">
              {copy.history.loading}
            </p>
          )}
        </Modal>
      )}
    </div>
  )
}
