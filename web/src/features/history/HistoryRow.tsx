import type { Draw, DrawEntry } from '../../data/draws'
import type { Item } from '../../data/items'
import { copy } from '../../ui/copy'
import { DishImage } from '../../ui/DishImage'
import { useSwipeToDelete } from '../../ui/useSwipeToDelete'
import { formatChosenAt } from './format'

type Props = {
  draw: Draw
  itemFor: (entry: DrawEntry) => Item
  imagesOf: (item: Item, size: 'thumb' | 'full') => string[]
  onOpenDish: (entry: DrawEntry) => void
  onDelete: () => void
}

/** Một mâm trong lịch sử: ngày giờ, ảnh + tên món; vuốt trái hoặc nút "Xoá mâm" để xoá. */
export function HistoryRow({ draw, itemFor, imagesOf, onOpenDish, onDelete }: Props) {
  const swipe = useSwipeToDelete(onDelete)
  const when = formatChosenAt(draw.chosenAt)
  const entries = [...draw.entries].sort((a, b) => a.order - b.order)
  // Bản ghi hỏng (không ngày, không món): không có gì để xem
  if (!when && entries.length === 0) return null
  const whenLabel = when || copy.history.unknownTime
  return (
    <li className="history-row__wrap" aria-label={copy.history.trayLabel(whenLabel)}>
      {swipe.dx !== 0 && (
        <span className={`history-row__swipe-hint${swipe.armed ? ' history-row__swipe-hint--armed' : ''}`} aria-hidden="true">
          {copy.common.swipeDelete}
        </span>
      )}
      <div
        className="history-row"
        style={{ transform: swipe.dx ? `translateX(${swipe.dx}px)` : undefined }}
        data-swiping={swipe.dx !== 0 || undefined}
        {...swipe.handlers}
      >
        <div className="history-row__head">
          <p className="history-row__when">{when}</p>
          <button
            type="button"
            className="history-row__delete"
            aria-label={copy.history.deleteButton(whenLabel)}
            onClick={() => {
              // cú click là đuôi của cú vuốt (đã xin xoá rồi) thì bỏ
              if (!swipe.shouldSuppressClick()) onDelete()
            }}
          >
            <span aria-hidden="true">🗑</span>
          </button>
        </div>
        <ul className="history-row__dishes">
          {entries.map((entry) => (
            <li key={`${entry.order}:${entry.itemId}`}>
              <button
                type="button"
                className="history-row__dish"
                aria-label={copy.history.openDish(entry.name)}
                onClick={() => {
                  // cú click ngay sau khi vuốt không mở chi tiết
                  if (!swipe.shouldSuppressClick()) onOpenDish(entry)
                }}
              >
                <DishImage className="history-row__thumb" sources={imagesOf(itemFor(entry), 'thumb')} alt="" compact />
                <span className="history-row__name">{entry.name}</span>
              </button>
            </li>
          ))}
        </ul>
      </div>
    </li>
  )
}
