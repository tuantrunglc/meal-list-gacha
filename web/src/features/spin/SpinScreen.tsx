import { useItems } from '../../data/items'
import { DEFAULT_SET_KEY, getSet } from '../../sets/registry'
import { copy } from '../../ui/copy'

export function SpinScreen() {
  const set = getSet(DEFAULT_SET_KEY)
  // Lần đầu mở app: household chưa có món thì nạp món mặc định của Bộ
  const items = useItems(set)

  return (
    <>
      <h1 className="screen-title">{copy.screens.spin}</h1>
      {items.error && (
        <div role="alert">
          <p className="form-error">{items.error.message}</p>
          <button type="button" className="button-secondary" onClick={() => void items.refetch()}>
            {copy.retry}
          </button>
        </div>
      )}
    </>
  )
}
